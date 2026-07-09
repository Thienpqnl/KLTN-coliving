const { z } = require("zod");
const { sanitizeForJson } = require("./serialization.cjs");

const resourceCreateSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên là bắt buộc"),
  description: z.string().optional(),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().int().positive().default(120),
  roomId: z.string().uuid("Room ID không hợp lệ").optional(),
});

const roomResourceCreateSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên không được để trống"),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().default(120),
});

const bookingCreateSchema = z.object({
  resourceId: z.string().uuid("ID tài nguyên không hợp lệ"),
  title: z.string().min(1, "Vui lòng nhập mục đích sử dụng").max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).refine((data) => data.endTime > data.startTime, {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu",
});

const updateBookingSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

const activityCreateSchema = z.object({
  type: z.enum(["ANNOUNCEMENT", "ISSUE"]),
  title: z.string().min(1, "Tiêu đề không được để trống"),
  content: z.string().optional(),
  eventDate: z.string().optional(),
  imageUrl: z.string().optional(),
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

function hasBookingConflict(startTime, endTime, bookings) {
  return bookings.some((booking) => startTime < booking.endTime && endTime > booking.startTime);
}

async function createHostResource(prisma, identity, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(resourceCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  if (!data.roomId) return failure(400, "Room ID không hợp lệ");
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Chỉ chủ nhà được thêm tài nguyên");
  const newResource = await prisma.sharedResource.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      requiresApproval: data.requiresApproval,
      maxDurationMinutes: data.maxDurationMinutes,
      roomId: data.roomId,
      ownerId: identity.userId,
    },
  });
  return {
    status: 201,
    payload: sanitizeForJson({
      resource: newResource,
      notification: {
        topic: `user_${identity.userId}`,
        title: "Tài nguyên mới đã được tạo",
        body: `Tài nguyên "${newResource.name}" đã sẵn sàng để sử dụng.`,
        data: { resourceId: String(newResource.id), type: newResource.type },
      },
    }),
  };
}

async function createRoomResource(prisma, identity, roomId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") {
    return failure(403, "Chỉ chủ phòng mới có quyền thêm tài nguyên không gian chung");
  }
  const parsed = validate(roomResourceCreateSchema, input);
  if (!parsed.ok) return parsed;
  const newResource = await prisma.sharedResource.create({
    data: {
      roomId,
      ownerId: identity.userId,
      status: "ACTIVE",
      description: "",
      ...parsed.data,
    },
  });
  return { status: 201, payload: sanitizeForJson(newResource) };
}

async function deleteResource(prisma, identity, resourceId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const resource = await prisma.sharedResource.findUnique({
    where: { id: resourceId },
    include: { room: true },
  });
  if (!resource) return failure(404, "Tài nguyên không tồn tại");
  if (identity.role !== "ADMIN" && resource.room.ownerId !== identity.userId) {
    return failure(403, "Bạn không có quyền xóa tài nguyên này");
  }
  await prisma.sharedResource.delete({ where: { id: resourceId } });
  return { status: 200, payload: { message: "Đã xóa tài nguyên thành công" } };
}

async function listResourceBookings(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const resources = await prisma.sharedResource.findMany({
    where: { roomId },
    include: {
      resourceBookings: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { startTime: "asc" },
        include: { user: { select: { id: true, name: true, fullName: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return { status: 200, payload: sanitizeForJson(resources) };
}

async function createResourceBooking(prisma, identity, roomId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(bookingCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const booking = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw`SELECT id FROM shared_resources WHERE id = ${data.resourceId} FOR UPDATE`;
    if (lockedRows.length === 0) return failure(404, "Tài nguyên không tồn tại");
    const resource = await tx.sharedResource.findUnique({ where: { id: data.resourceId } });
    if (!resource) return failure(404, "Tài nguyên không tồn tại");
    if (resource.roomId !== roomId) return failure(400, "Tài nguyên không thuộc phòng này");
    if (resource.status === "MAINTENANCE") return failure(409, "Tài nguyên hiện đang bảo trì, không thể đặt lịch");
    const isOccupant = await tx.occupancy.findUnique({
      where: { Occupancy_room_user_unique: { roomId, userId: identity.userId } },
    });
    if (!isOccupant || isOccupant.status !== "ACTIVE") {
      return failure(403, "Bạn không có quyền đặt tài nguyên trong không gian chung này");
    }
    const durationMinutes = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60);
    if (durationMinutes > resource.maxDurationMinutes) {
      return failure(400, `Thời gian đặt vượt quá mức tối đa (${resource.maxDurationMinutes} phút)`);
    }
    if (data.startTime < new Date()) return failure(400, "Không thể đặt lịch trong quá khứ");
    const existingBookings = await tx.resourceBooking.findMany({
      where: { resourceId: data.resourceId, status: { in: ["PENDING", "APPROVED"] } },
      select: { startTime: true, endTime: true, status: true },
    });
    if (hasBookingConflict(data.startTime, data.endTime, existingBookings)) {
      return failure(409, "Khung giờ này đã bị trùng với lịch đặt khác hoặc đang chờ duyệt");
    }
    const created = await tx.resourceBooking.create({
      data: {
        resourceId: data.resourceId,
        userId: identity.userId,
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        status: "PENDING",
      },
      include: { resource: true },
    });
    return { status: 201, payload: sanitizeForJson(created) };
  });
  return booking;
}

async function updateResourceBooking(prisma, identity, bookingId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(updateBookingSchema, input);
  if (!parsed.ok) return parsed;
  const { status } = parsed.data;
  const booking = await prisma.resourceBooking.findUnique({
    where: { id: bookingId },
    include: { resource: true },
  });
  if (!booking) return failure(404, "Không tìm thấy lịch đặt tài nguyên này");
  if (status === "CANCELLED" && booking.userId === identity.userId) {
    const updated = await prisma.resourceBooking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    await prisma.sharedResource.update({ where: { id: booking.resourceId }, data: { status: "ACTIVE" } });
    return { status: 200, payload: sanitizeForJson(updated) };
  }
  const isHostOrAdmin = identity.role === "HOST" || identity.role === "ADMIN";
  if (!isHostOrAdmin) return failure(403, "Bạn không có quyền thay đổi trạng thái lịch đặt này");
  if (booking.status === status) {
    return failure(409, `Lịch đặt này đã ở trạng thái ${status === "APPROVED" ? "đã duyệt" : "đã hủy"}`);
  }
  const updated = await prisma.resourceBooking.update({ where: { id: bookingId }, data: { status } });
  const now = new Date();
  const isCurrentlyActive = status === "APPROVED" && now >= booking.startTime && now < booking.endTime;
  const newResourceStatus = booking.resource.status === "MAINTENANCE" ? "MAINTENANCE" : isCurrentlyActive ? "BUSY" : "ACTIVE";
  await prisma.sharedResource.update({ where: { id: booking.resourceId }, data: { status: newResourceStatus } });
  return {
    status: 200,
    payload: sanitizeForJson({
      booking: updated,
      notification: status === "APPROVED"
        ? {
            userId: booking.userId,
            title: "Yêu cầu thuê tài nguyên đã được duyệt",
            body: `Yêu cầu "${booking.title ?? "đặt lịch"}" cho tài nguyên đã được duyệt.`,
            data: { bookingId, resourceId: booking.resourceId, type: "RESOURCE_BOOKING_APPROVED" },
          }
        : null,
    }),
  };
}

async function listActivities(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const activities = await prisma.sharedSpaceActivity.findMany({
    where: { roomId },
    include: {
      assignee: { select: { fullName: true } },
      creator: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return { status: 200, payload: sanitizeForJson(activities) };
}

async function createActivity(prisma, identity, roomId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const isOccupant = await prisma.occupancy.findUnique({
    where: { Occupancy_room_user_unique: { roomId, userId: identity.userId } },
  });
  if (!isOccupant || isOccupant.status !== "ACTIVE") {
    return failure(403, "Bạn không có quyền tạo hoạt động trong không gian chung này");
  }
  const parsed = validate(activityCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const newActivity = await prisma.sharedSpaceActivity.create({
    data: {
      roomId,
      creatorId: identity.userId,
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
    },
    include: { creator: { select: { fullName: true } } },
  });
  return { status: 201, payload: sanitizeForJson(newActivity) };
}

module.exports = {
  createActivity,
  createHostResource,
  createResourceBooking,
  createRoomResource,
  deleteResource,
  listActivities,
  listResourceBookings,
  updateResourceBooking,
};
