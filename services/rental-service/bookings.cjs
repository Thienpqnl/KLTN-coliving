const { z } = require("zod");
const { getRoomCapacity, runSerializableTransaction } = require("./capacity.cjs");
const { sanitizeForJson } = require("./serialization.cjs");

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

const bookingInclude = {
  user: { select: { id: true, name: true, email: true } },
  room: true,
  invoice: true,
};

const hostBookingInclude = {
  user: {
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  room: {
    select: {
      id: true,
      title: true,
      priceText: true,
      priceValue: true,
      address: true,
    },
  },
  invoice: true,
  contract: { select: { id: true, status: true } },
};

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

function assertCanManageBooking(actor, booking, status) {
  const isAdmin = actor.role === "ADMIN";
  const isHost = booking.room.ownerId === actor.userId;
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

async function createBooking(prisma, identity, input) {
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
  return { status: 201, payload: sanitizeForJson(booking) };
}

async function getBookingById(prisma, identity, id) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      room: { include: { amenities: { include: { amenity: true } } } },
      invoice: true,
    },
  });
  if (!booking) return failure(404, "Không tìm thấy booking");

  const canView =
    booking.userId === identity.userId ||
    identity.role === "ADMIN" ||
    booking.room.ownerId === identity.userId;
  if (!canView) return failure(403, "Bạn không có quyền xem booking này");
  return { status: 200, payload: sanitizeForJson(booking) };
}

async function listUserBookings(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const bookings = await prisma.booking.findMany({
    where: { userId: identity.userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { include: { amenities: { include: { amenity: true } } } },
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return { status: 200, payload: sanitizeForJson(bookings) };
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
      room: {
        select: {
          id: true,
          title: true,
          address: true,
          priceValue: true,
          priceText: true,
          images: {
            orderBy: { sortOrder: "asc" },
            select: { url: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    status: 200,
    payload: sanitizeForJson(bookings.map((booking) => ({
      ...booking,
      room: {
        ...booking.room,
        priceValue: booking.room.priceValue == null ? null : Number(booking.room.priceValue),
        price: booking.room.priceValue == null ? 0 : Number(booking.room.priceValue),
        image: booking.room.images.map((image) => image.url),
      },
    }))),
  };
}

async function listHostBookings(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") {
    return failure(403, "Chỉ chủ nhà hoặc admin được xem booking của phòng");
  }

  const bookings = await prisma.booking.findMany({
    where: { room: { ownerId: identity.userId } },
    include: hostBookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return { status: 200, payload: sanitizeForJson(bookings) };
}

async function listRoomBookings(prisma, query) {
  const roomId = String(query.roomId || "");
  if (!roomId) return failure(400, "Room ID is required");

  const bookings = await prisma.booking.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      invoice: true,
    },
    orderBy: { startDate: "asc" },
  });
  return { status: 200, payload: sanitizeForJson(bookings) };
}

async function updateBooking(prisma, identity, id, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(bookingUpdateSchema, input);
  if (!parsed.ok) return parsed;
  if (!parsed.data.status) return getBookingById(prisma, identity, id);

  const status = parsed.data.status;
  if (status === "CONFIRMED") {
    const result = await runSerializableTransaction(prisma, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: bookingInclude });
      if (!booking) return failure(404, "Không tìm thấy booking");
      const deniedStatus = assertCanManageBooking(identity, booking, status);
      if (deniedStatus) return deniedStatus;

      if (booking.status === "CONFIRMED") return { status: 200, payload: sanitizeForJson(booking) };
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
      return { status: 200, payload: sanitizeForJson(updated) };
    });
    return result;
  }

  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) return failure(404, "Không tìm thấy booking");
  const deniedStatus = assertCanManageBooking(identity, booking, status);
  if (deniedStatus) return deniedStatus;
  if (booking.status === status) return { status: 200, payload: sanitizeForJson(booking) };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return failure(409, "Booking đã kết thúc và không thể đổi trạng thái");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });
  return { status: 200, payload: sanitizeForJson(updated) };
}

async function cancelBooking(prisma, identity, id) {
  const bookingResult = await getBookingById(prisma, identity, id);
  if (bookingResult.status !== 200) return bookingResult;
  const booking = bookingResult.payload;
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    return failure(400, "Booking này không thể hủy");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: bookingInclude,
  });
  return { status: 200, payload: sanitizeForJson(updated) };
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

  const where = { room: { ownerId: identity.userId } };
  const [total, pending, confirmed, completed, hostRooms, occupiedRooms, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { ...where, status: "PENDING" } }),
    prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.room.count({ where: { ownerId: identity.userId } }),
    prisma.room.count({ where: { ownerId: identity.userId, status: "OCCUPIED" } }),
    prisma.booking.findMany({
      where: {
        ...where,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        room: { select: { priceValue: true } },
      },
    }),
  ]);

  const projectedRevenue = bookings.reduce(
    (sum, booking) => sum + Number(booking.room.priceValue || 0),
    0,
  );

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

module.exports = {
  bookingStats,
  cancelBooking,
  createBooking,
  getBookingById,
  hostBookingStats,
  listHostBookings,
  listUserBookingCards,
  listRoomBookings,
  listUserBookings,
  updateBooking,
};
