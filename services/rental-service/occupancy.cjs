const { z } = require("zod");
const {
  getRoomCapacity,
  runSerializableTransaction,
  syncRoomOccupancy,
} = require("./capacity.cjs");
const { sanitizeForJson } = require("./serialization.cjs");
const { enqueueOccupancyChanged } = require("./outbox.cjs");
const { attachOccupancyUsers, identityClient } = require("./user-composition.cjs");

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
  const room = await prisma.rentalRoomSnapshot.findUnique({
    where: { roomId },
    select: { ownerId: true },
  });
  if (!room) return failure(404, "Không tìm thấy phòng");
  if (room.ownerId !== hostId) return failure(403, "Bạn không có quyền xem người thuê của phòng này");
  return null;
}

async function listRoomOccupants(prisma, identity, roomId, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const notOwner = await assertHostOwnsRoom(prisma, roomId, identity.userId);
  if (notOwner) return notOwner;

  const occupants = await prisma.occupancy.findMany({
    where: { roomId },
    orderBy: [{ status: "asc" }, { joinedAt: "desc" }],
  });
  return { status: 200, payload: sanitizeForJson(await attachOccupancyUsers(occupants, clients)) };
}

async function getOccupantDetails(prisma, identity, occupancyId, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const occupancy = await prisma.occupancy.findUnique({
    where: { id: occupancyId },
  });
  if (!occupancy) return failure(404, "Không tìm thấy thông tin cư trú");
  const room = await prisma.rentalRoomSnapshot.findUnique({
    where: { roomId: occupancy.roomId },
  });
  if (identity.role !== "ADMIN" && room?.ownerId !== identity.userId && occupancy.userId !== identity.userId) {
    return failure(403, "Bạn không có quyền xem thông tin cư trú này");
  }
  return {
    status: 200,
    payload: sanitizeForJson({
      ...(await attachOccupancyUsers(occupancy, clients)),
      room: room ? { id: room.roomId, ...room } : null,
    }),
  };
}

async function addOccupant(prisma, identity, input, excludeBookingId, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(addOccupantSchema, input);
  if (!parsed.ok) return parsed;
  const { roomId, userId, notes } = parsed.data;

  let user;
  try {
    user = await clients.getUser(userId);
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const occupancy = await runSerializableTransaction(prisma, async (tx) => {
    const capacity = await getRoomCapacity(tx, roomId, undefined, excludeBookingId);

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
        })
      : await tx.occupancy.create({
          data: { roomId, userId, notes },
        });

    const projection = await syncRoomOccupancy(tx, roomId);
    await enqueueOccupancyChanged(tx, roomId, projection.currentOccupants);
    return { status: 201, payload: sanitizeForJson(result) };
  });

  if (occupancy.status !== 201) return occupancy;
  return { ...occupancy, payload: sanitizeForJson(await attachOccupancyUsers(occupancy.payload, clients)) };
}

async function terminateOccupancy(prisma, identity, occupancyId, input, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(terminateSchema, input);
  if (!parsed.ok) return parsed;

  const result = await runSerializableTransaction(prisma, async (tx) => {
    const occupancy = await tx.occupancy.findUnique({
      where: { id: occupancyId },
    });
    if (!occupancy) return failure(404, "Không tìm thấy thông tin cư trú");
    const room = await tx.rentalRoomSnapshot.findUnique({
      where: { roomId: occupancy.roomId },
      select: { ownerId: true },
    });
    if (identity.role !== "ADMIN" && room?.ownerId !== identity.userId && occupancy.userId !== identity.userId) {
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
    });

    const projection = await syncRoomOccupancy(tx, occupancy.roomId);
    await enqueueOccupancyChanged(tx, occupancy.roomId, projection.currentOccupants);
    return { status: 200, payload: sanitizeForJson(updated) };
  });
  if (result.status !== 200) return result;
  return { ...result, payload: sanitizeForJson(await attachOccupancyUsers(result.payload, clients)) };
}

async function occupancyHistory(prisma, identity, roomId, clients = identityClient) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const notOwner = await assertHostOwnsRoom(prisma, roomId, identity.userId);
  if (notOwner) return notOwner;

  const history = await prisma.occupancy.findMany({
    where: { roomId },
    orderBy: { joinedAt: "desc" },
  });
  return { status: 200, payload: sanitizeForJson(await attachOccupancyUsers(history, clients)) };
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
    }),
    prisma.rentalRoomSnapshot.findMany({
      where: { ownerId: identity.userId },
      select: { roomId: true, title: true, address: true },
    }),
  ]);

  const occupiedRoom = occupancy
    ? await prisma.rentalRoomSnapshot.findUnique({ where: { roomId: occupancy.roomId } })
    : null;

  return {
    status: 200,
    payload: sanitizeForJson({
      occupancy: occupancy
        ? { ...occupancy, room: occupiedRoom ? { id: occupiedRoom.roomId, ...occupiedRoom } : null }
        : null,
      ownedRooms: ownedRooms.map((room) => ({ id: room.roomId, ...room })),
    }),
  };
}

async function linkBookingToOccupancy(prisma, identity, bookingId, clients = identityClient) {
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
    clients,
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
