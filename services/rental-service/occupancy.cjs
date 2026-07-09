const { z } = require("zod");
const {
  getRoomCapacity,
  runSerializableTransaction,
  syncRoomOccupancy,
} = require("./capacity.cjs");
const { sanitizeForJson } = require("./serialization.cjs");

const occupantUserSelect = {
  id: true,
  email: true,
  name: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  gender: true,
  birthDate: true,
  address: true,
};

const addOccupantSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
  notes: z.string().optional(),
});

const terminateSchema = z.object({
  reason: z.string().min(1, "Termination reason is required"),
});

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

async function assertHostOwnsRoom(prisma, roomId, hostId) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
  if (!room) return failure(404, "Không tìm thấy phòng");
  if (room.ownerId !== hostId) return failure(403, "Bạn không có quyền xem người thuê của phòng này");
  return null;
}

async function listRoomOccupants(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const notOwner = await assertHostOwnsRoom(prisma, roomId, identity.userId);
  if (notOwner) return notOwner;

  const occupants = await prisma.occupancy.findMany({
    where: { roomId },
    include: { user: { select: occupantUserSelect } },
    orderBy: [{ status: "asc" }, { joinedAt: "desc" }],
  });
  return { status: 200, payload: sanitizeForJson(occupants) };
}

async function getOccupantDetails(prisma, identity, occupancyId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const occupancy = await prisma.occupancy.findUnique({
    where: { id: occupancyId },
    include: {
      user: { select: { ...occupantUserSelect, createdAt: true, role: true } },
      room: { select: { id: true, title: true, address: true, priceValue: true, ownerId: true } },
    },
  });
  if (!occupancy) return failure(404, "Không tìm thấy thông tin cư trú");
  if (identity.role !== "ADMIN" && occupancy.room.ownerId !== identity.userId && occupancy.userId !== identity.userId) {
    return failure(403, "Bạn không có quyền xem thông tin cư trú này");
  }
  return { status: 200, payload: sanitizeForJson(occupancy) };
}

async function addOccupant(prisma, identity, input, excludeBookingId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(addOccupantSchema, input);
  if (!parsed.ok) return parsed;
  const { roomId, userId, notes } = parsed.data;

  const occupancy = await runSerializableTransaction(prisma, async (tx) => {
    const [capacity, user] = await Promise.all([
      getRoomCapacity(tx, roomId, undefined, excludeBookingId),
      tx.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ]);

    if (!capacity) return failure(404, "Không tìm thấy phòng");
    if (!user) return failure(404, "Không tìm thấy người dùng");
    if (identity.role !== "ADMIN" && capacity.room.ownerId !== identity.userId) {
      return failure(403, "Bạn không có quyền thêm người thuê vào phòng này");
    }

    const existing = await tx.occupancy.findUnique({
      where: { Occupancy_room_user_unique: { roomId, userId } },
    });
    if (existing?.status === "ACTIVE") return failure(409, "Người dùng đã là thành viên của phòng");
    if (capacity.isFull) return failure(409, "Phòng đã hết chỗ và không thể thêm người thuê");

    const result = existing
      ? await tx.occupancy.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            joinedAt: new Date(),
            terminatedAt: null,
            terminationReason: null,
            notes,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : await tx.occupancy.create({
          data: { roomId, userId, notes },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

    await syncRoomOccupancy(tx, roomId);
    return { status: 201, payload: sanitizeForJson(result) };
  });

  return occupancy;
}

async function terminateOccupancy(prisma, identity, occupancyId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(terminateSchema, input);
  if (!parsed.ok) return parsed;

  const result = await runSerializableTransaction(prisma, async (tx) => {
    const occupancy = await tx.occupancy.findUnique({
      where: { id: occupancyId },
      include: { room: true },
    });
    if (!occupancy) return failure(404, "Không tìm thấy thông tin cư trú");
    if (identity.role !== "ADMIN" && occupancy.room.ownerId !== identity.userId && occupancy.userId !== identity.userId) {
      return failure(403, "Bạn không có quyền kết thúc cư trú này");
    }
    if (occupancy.status !== "ACTIVE") return failure(409, "Người thuê không còn ở trong phòng");

    const updated = await tx.occupancy.update({
      where: { id: occupancyId },
      data: {
        status: "INACTIVE",
        terminatedAt: new Date(),
        terminationReason: parsed.data.reason,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await syncRoomOccupancy(tx, occupancy.roomId);
    return { status: 200, payload: sanitizeForJson(updated) };
  });
  return result;
}

async function occupancyHistory(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const notOwner = await assertHostOwnsRoom(prisma, roomId, identity.userId);
  if (notOwner) return notOwner;

  const history = await prisma.occupancy.findMany({
    where: { roomId },
    include: { user: { select: occupantUserSelect } },
    orderBy: { joinedAt: "desc" },
  });
  return { status: 200, payload: sanitizeForJson(history) };
}

async function occupancyStats(prisma, identity, query) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const roomId = String(query.roomId || "");
  if (!roomId) return failure(400, "roomId is required");
  const notOwner = await assertHostOwnsRoom(prisma, roomId, identity.userId);
  if (notOwner) return notOwner;

  const [activeCount, totalCount, inactiveCount] = await Promise.all([
    prisma.occupancy.count({ where: { roomId, status: "ACTIVE" } }),
    prisma.occupancy.count({ where: { roomId } }),
    prisma.occupancy.count({ where: { roomId, status: "INACTIVE" } }),
  ]);
  return {
    status: 200,
    payload: {
      activeOccupants: activeCount,
      totalOccupants: totalCount,
      inactiveOccupants: inactiveCount,
      occupancyRate: totalCount > 0 ? (activeCount / totalCount) * 100 : 0,
    },
  };
}

async function userOccupancy(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const [occupancy, ownedRooms] = await Promise.all([
    prisma.occupancy.findFirst({
      where: { userId: identity.userId, status: "ACTIVE" },
      include: { room: { select: { id: true, title: true, address: true } } },
    }),
    prisma.room.findMany({
      where: { ownerId: identity.userId },
      select: { id: true, title: true, address: true },
    }),
  ]);

  return { status: 200, payload: sanitizeForJson({ occupancy, ownedRooms }) };
}

async function linkBookingToOccupancy(prisma, identity, bookingId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return failure(404, "Không tìm thấy booking");
  if (booking.status !== "CONFIRMED") {
    return failure(409, "Booking phải được xác nhận trước khi nhận phòng");
  }

  return addOccupant(
    prisma,
    identity,
    {
      roomId: booking.roomId,
      userId: booking.userId,
      notes: `Được thêm từ booking #${bookingId}`,
    },
    bookingId,
  );
}

module.exports = {
  addOccupant,
  getOccupantDetails,
  linkBookingToOccupancy,
  listRoomOccupants,
  occupancyHistory,
  occupancyStats,
  terminateOccupancy,
  userOccupancy,
};
