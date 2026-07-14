const { z } = require("zod");
const { getRoomCapacity, runSerializableTransaction } = require("./capacity.cjs");
const { sanitizeForJson } = require("./serialization.cjs");
const { attachBookingUsers, identityClient } = require("./user-composition.cjs");

const bookingStatuses = new Set(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]);

const bookingCreateSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const bookingUpdateSchema = z.object({
  status: z.string().refine((value) => bookingStatuses.has(value), "Invalid booking status").optional(),
});

const bookingCancellationSchema = z.object({
  reason: z.string().trim().min(5, "Lý do hủy phải có ít nhất 5 ký tự").max(500, "Lý do hủy không được vượt quá 500 ký tự"),
});

const bookingInclude = { invoice: true };

const hostBookingInclude = {
  invoice: true,
  contract: { select: { id: true, status: true } },
};

function roomFromSnapshot(snapshot) {
  if (!snapshot) return null;
  const priceValue = snapshot.priceValue == null ? null : Number(snapshot.priceValue);
  const areaValue = snapshot.areaValue == null ? null : Number(snapshot.areaValue);
  const images = Array.isArray(snapshot.images)
    ? snapshot.images
    : snapshot.imageUrl
      ? [{ url: snapshot.imageUrl, sortOrder: 0 }]
      : [];
  return {
    id: snapshot.roomId,
    title: snapshot.title,
    address: snapshot.address,
    areaText: snapshot.areaText,
    areaValue,
    city: snapshot.city,
    district: snapshot.district,
    priceText: snapshot.priceText,
    priceValue,
    price: priceValue ?? 0,
    ownerId: snapshot.ownerId,
    status: snapshot.status,
    currentOccupants: snapshot.currentOccupants,
    maxOccupants: snapshot.maxOccupants,
    images,
    image: images.map((image) => image.url),
    amenities: Array.isArray(snapshot.amenities) ? snapshot.amenities : [],
  };
}

async function attachRoom(prisma, booking) {
  if (!booking) return booking;
  const snapshot = await prisma.rentalRoomSnapshot.findUnique({
    where: { roomId: booking.roomId },
  });
  return { ...booking, room: roomFromSnapshot(snapshot) };
}

async function attachRooms(prisma, bookings) {
  const roomIds = [...new Set(bookings.map((booking) => booking.roomId))];
  const snapshots = await prisma.rentalRoomSnapshot.findMany({
    where: { roomId: { in: roomIds } },
  });
  const byId = new Map(snapshots.map((snapshot) => [snapshot.roomId, snapshot]));
  return bookings.map((booking) => ({
    ...booking,
    room: roomFromSnapshot(byId.get(booking.roomId)),
  }));
}

function failure(status, message, errors) {
  return { status, payload: { message, ...(errors ? { errors } : {}) } };
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "form";
    (errors[path] ||= []).push(issue.message);
  }
  return { ok: false, ...failure(400, "Validation failed", errors) };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

function assertCanManageBooking(actor, booking, room, status) {
  const isAdmin = actor.role === "ADMIN";
  const isHost = room?.ownerId === actor.userId;
  const isRenter = booking.userId === actor.userId;

  if (status === "CONFIRMED" && !isHost && !isAdmin) {
    return failure(403, "Chỉ chủ phòng hoặc admin mới có thể xác nhận booking");
  }
  if (status === "CANCELLED" && !isHost && !isRenter && !isAdmin) {
    return failure(403, "Bạn không có quyền hủy booking này");
  }
  if (status === "COMPLETED" && !isAdmin) {
    return failure(403, "Booking chỉ hoàn tất sau khi quy trình bàn giao kết thúc");
  }
  if (status === "PENDING") {
    return failure(400, "Không thể chuyển booking trở lại trạng thái chờ");
  }
  return null;
}

async function createBooking(prisma, identity, input, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(bookingCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const interval = { startDate: data.startDate, endDate: data.endDate };

  const capacity = await getRoomCapacity(prisma, data.roomId, interval);
  if (!capacity) return failure(404, "Không tìm thấy phòng");
  if (capacity.room.status !== "AVAILABLE") return failure(400, "Phòng hiện không khả dụng để đặt");
  if (capacity.isFull) return failure(409, "Phòng đã hết chỗ trong khoảng thời gian bạn chọn");

  const duplicateBooking = await prisma.booking.findFirst({
    where: {
      roomId: data.roomId,
      userId: identity.userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startDate: { lt: data.endDate },
      endDate: { gt: data.startDate },
    },
  });
  if (duplicateBooking) {
    return failure(409, "Bạn đã có một yêu cầu đặt phòng trùng khoảng thời gian này");
  }

  const booking = await prisma.booking.create({
    data: {
      userId: identity.userId,
      roomId: data.roomId,
      startDate: data.startDate,
      endDate: data.endDate,
    },
    include: bookingInclude,
  });
  const hydrated = await attachBookingUsers(booking, clients);
  return { status: 201, payload: sanitizeForJson(await attachRoom(prisma, hydrated)) };
}

async function getBookingById(prisma, identity, id, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { invoice: true },
  });
  if (!booking) return failure(404, "Không tìm thấy booking");

  const canView =
    booking.userId === identity.userId ||
    identity.role === "ADMIN" ||
    (await attachRoom(prisma, booking)).room?.ownerId === identity.userId;
  if (!canView) return failure(403, "Bạn không có quyền xem booking này");
  const hydrated = await attachBookingUsers(booking, clients);
  return { status: 200, payload: sanitizeForJson(await attachRoom(prisma, hydrated)) };
}

async function listUserBookings(prisma, identity, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const bookings = await prisma.booking.findMany({
    where: { userId: identity.userId },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
  });
  const hydrated = await attachBookingUsers(bookings, clients);
  return { status: 200, payload: sanitizeForJson(await attachRooms(prisma, hydrated)) };
}

async function listUserBookingCards(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const bookings = await prisma.booking.findMany({
    where: { userId: identity.userId },
    include: {
      contract: {
        select: {
          id: true,
          status: true,
          terminatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    status: 200,
    payload: sanitizeForJson(await attachRooms(prisma, bookings)),
  };
}

async function listHostBookings(prisma, identity, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") {
    return failure(403, "Chỉ chủ nhà hoặc admin được xem booking của phòng");
  }

  const roomSnapshots = await prisma.rentalRoomSnapshot.findMany({
    where: { ownerId: identity.userId },
    select: { roomId: true },
  });
  const bookings = await prisma.booking.findMany({
    where: { roomId: { in: roomSnapshots.map((room) => room.roomId) } },
    include: hostBookingInclude,
    orderBy: { createdAt: "desc" },
  });
  const hydrated = await attachBookingUsers(bookings, clients);
  return { status: 200, payload: sanitizeForJson(await attachRooms(prisma, hydrated)) };
}

async function listRoomBookings(prisma, query, clients = identityClient) {
  const roomId = String(query.roomId || "");
  if (!roomId) return failure(400, "Room ID is required");

  const bookings = await prisma.booking.findMany({
    where: { roomId },
    include: { invoice: true },
    orderBy: { startDate: "asc" },
  });
  return { status: 200, payload: sanitizeForJson(await attachBookingUsers(bookings, clients)) };
}

async function updateBooking(prisma, identity, id, input, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(bookingUpdateSchema, input);
  if (!parsed.ok) return parsed;
  if (!parsed.data.status) return getBookingById(prisma, identity, id, clients);

  const status = parsed.data.status;
  if (status === "CONFIRMED") {
    const result = await runSerializableTransaction(prisma, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: bookingInclude });
      const room = booking
        ? await tx.rentalRoomSnapshot.findUnique({ where: { roomId: booking.roomId } })
        : null;
      if (!booking) return failure(404, "Không tìm thấy booking");
      const deniedStatus = assertCanManageBooking(identity, booking, room, status);
      if (deniedStatus) return deniedStatus;

      if (booking.status === "CONFIRMED") {
        return { status: 200, payload: sanitizeForJson({ ...booking, room: roomFromSnapshot(room) }) };
      }
      if (booking.status !== "PENDING") {
        return failure(409, "Chỉ booking đang chờ mới có thể được xác nhận");
      }

      const capacity = await getRoomCapacity(
        tx,
        booking.roomId,
        { startDate: booking.startDate, endDate: booking.endDate },
        booking.id,
      );
      if (!capacity) return failure(404, "Không tìm thấy phòng");
      if (capacity.isFull) return failure(409, "Phòng đã hết chỗ trong khoảng thời gian của booking này");

      const updated = await tx.booking.update({
        where: { id },
        data: { status: "CONFIRMED" },
        include: bookingInclude,
      });
      return { status: 200, payload: sanitizeForJson({ ...updated, room: roomFromSnapshot(room) }) };
    });
    if (result.status !== 200) return result;
    return { ...result, payload: sanitizeForJson(await attachBookingUsers(result.payload, clients)) };
  }

  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  const room = booking
    ? await prisma.rentalRoomSnapshot.findUnique({ where: { roomId: booking.roomId } })
    : null;
  if (!booking) return failure(404, "Không tìm thấy booking");
  const deniedStatus = assertCanManageBooking(identity, booking, room, status);
  if (deniedStatus) return deniedStatus;
  if (booking.status === status) {
    const hydrated = await attachBookingUsers({ ...booking, room: roomFromSnapshot(room) }, clients);
    return { status: 200, payload: sanitizeForJson(hydrated) };
  }
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return failure(409, "Booking đã kết thúc và không thể đổi trạng thái");
  }
  if (status === "CANCELLED") {
    const isAdmin = identity.role === "ADMIN";
    const isHost = room?.ownerId === identity.userId;
    if (!isAdmin && !isHost) {
      return failure(400, "Người thuê phải sử dụng chức năng hủy booking và cung cấp lý do");
    }
    if (booking.status !== "PENDING") {
      return failure(409, "Chủ nhà chỉ có thể từ chối booking đang chờ xác nhận");
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });
  const hydrated = await attachBookingUsers({ ...updated, room: roomFromSnapshot(room) }, clients);
  return { status: 200, payload: sanitizeForJson(hydrated) };
}

async function cancelBooking(prisma, identity, id, input = {}, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(bookingCancellationSchema, input);
  if (!parsed.ok) return parsed;

  const result = await runSerializableTransaction(prisma, async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: {
        invoice: true,
        contract: {
          select: { id: true, status: true, depositStatus: true },
        },
      },
    });
    if (!booking) return failure(404, "Không tìm thấy booking");

    const room = await tx.rentalRoomSnapshot.findUnique({
      where: { roomId: booking.roomId },
    });
    const isAdmin = identity.role === "ADMIN";
    const isHost = room?.ownerId === identity.userId;
    const isRenter = booking.userId === identity.userId;
    if (!isAdmin && !isHost && !isRenter) {
      return failure(403, "Bạn không có quyền hủy booking này");
    }
    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return failure(409, "Booking đã kết thúc và không thể hủy");
    }

    const contract = booking.contract;
    const protectedContractStatuses = new Set([
      "PENDING_DEPOSIT",
      "PENDING_HANDOVER",
      "ACTIVE",
      "EXPIRED",
      "TERMINATED",
      "DISPUTED",
    ]);
    if (contract && protectedContractStatuses.has(contract.status)) {
      return {
        status: 409,
        payload: {
          message: contract.status === "ACTIVE"
            ? "Hợp đồng đã có hiệu lực. Vui lòng sử dụng chức năng rời phòng hoặc chấm dứt hợp đồng."
            : "Booking đang ở giai đoạn thực hiện hợp đồng và không thể hủy trực tiếp.",
          code: contract.status === "ACTIVE" ? "ACTIVE_CONTRACT" : "CONTRACT_IN_PROGRESS",
          contractId: contract.id,
        },
      };
    }

    const now = new Date();
    const actor = isAdmin ? "ADMIN" : isHost ? "HOST" : "RENTER";
    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledById: identity.userId,
        cancellationActor: actor,
        cancellationReason: parsed.data.reason,
      },
      include: bookingInclude,
    });

    if (contract && contract.status !== "CANCELLED") {
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "CANCELLED",
          terminatedAt: now,
          terminationReason: parsed.data.reason,
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: contract.id,
          actorId: identity.userId,
          type: "BOOKING_CANCELLED",
          fromStatus: contract.status,
          toStatus: "CANCELLED",
          note: parsed.data.reason,
          metadata: { bookingId: booking.id, actor },
        },
      });
    }

    return { status: 200, payload: updated };
  });

  if (result.status !== 200) return result;
  const hydrated = await attachBookingUsers(result.payload, clients);
  return { status: 200, payload: sanitizeForJson(await attachRoom(prisma, hydrated)) };
}

async function bookingStats(prisma, query) {
  const roomId = query.roomId ? String(query.roomId) : undefined;
  const where = roomId ? { roomId } : {};
  const [total, pending, confirmed, cancelled, completed] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { ...where, status: "PENDING" } }),
    prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { ...where, status: "CANCELLED" } }),
    prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
  ]);
  return { status: 200, payload: { total, pending, confirmed, cancelled, completed } };
}

async function hostBookingStats(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") {
    return failure(403, "Chỉ chủ nhà hoặc admin được xem thống kê booking");
  }

  const roomSnapshots = await prisma.rentalRoomSnapshot.findMany({
    where: { ownerId: identity.userId },
    select: { roomId: true, status: true, priceValue: true },
  });
  const roomIds = roomSnapshots.map((room) => room.roomId);
  const where = { roomId: { in: roomIds } };
  const [total, pending, confirmed, completed, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { ...where, status: "PENDING" } }),
    prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.booking.findMany({
      where: {
        ...where,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { roomId: true },
    }),
  ]);

  const roomPrice = new Map(
    roomSnapshots.map((room) => [room.roomId, Number(room.priceValue || 0)]),
  );
  const projectedRevenue = bookings.reduce(
    (sum, booking) => sum + (roomPrice.get(booking.roomId) || 0),
    0,
  );
  const hostRooms = roomSnapshots.length;
  const occupiedRooms = roomSnapshots.filter((room) => room.status === "OCCUPIED").length;

  return {
    status: 200,
    payload: {
      total,
      pending,
      confirmed,
      completed,
      pendingCount: pending,
      occupancyPercentage: hostRooms > 0 ? Math.round((occupiedRooms / hostRooms) * 100) : 0,
      projectedRevenue,
    },
  };
}

async function roomRentalStats(prisma, roomId) {
  const bookings = await prisma.booking.findMany({
    where: { roomId },
    include: { invoice: true },
  });
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length;
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + Number(booking.invoice?.totalAmount || 0),
    0,
  );
  return {
    status: 200,
    payload: { totalBookings, confirmedBookings, pendingBookings, totalRevenue },
  };
}

async function adminRentalStats(prisma) {
  const completed = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
    include: { invoice: true },
  });
  return {
    status: 200,
    payload: {
      totalRevenue: completed.reduce(
        (sum, booking) => sum + Number(booking.invoice?.totalAmount || 0),
        0,
      ),
      completedBookings: completed.length,
    },
  };
}

module.exports = {
  adminRentalStats,
  bookingStats,
  cancelBooking,
  createBooking,
  getBookingById,
  hostBookingStats,
  listHostBookings,
  listUserBookingCards,
  listRoomBookings,
  listUserBookings,
  roomRentalStats,
  roomFromSnapshot,
  updateBooking,
};
