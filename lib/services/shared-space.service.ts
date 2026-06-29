import { prisma } from "../prisma";
import { ApiError } from "../api-error";
import { CreateResourceInput } from "./shared-space-client.service";

export const sharedSpaceService = {
  createBooking: async (
    userId: string, 
    data: { resourceId: string; roomId: string; title: string; startTime: Date; endTime: Date }
  ) => {
    const isOccupant = await prisma.occupancy.findUnique({
      where: {
        Occupancy_room_user_unique: { roomId: data.roomId, userId }
      }
    });
    if (!isOccupant || isOccupant.status !== "ACTIVE") {
      throw new ApiError(403, "Bạn không có quyền đặt tài nguyên trong không gian chung này");
    }

    const resource = await prisma.sharedResource.findUnique({
      where: { id: data.resourceId }
    });
    if (!resource) throw new ApiError(404, "Không tìm thấy tài nguyên");
    if (resource.status === "MAINTENANCE") throw new ApiError(400, "Thiết bị/Không gian này đang bảo trì");

    const durationMinutes = (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / (1000 * 60);
    if (durationMinutes > resource.maxDurationMinutes) {
      throw new ApiError(400, `Thời gian sử dụng tối đa cho phép là ${resource.maxDurationMinutes} phút`);
    }

    const overlapBooking = await prisma.resourceBooking.findFirst({
      where: {
        resourceId: data.resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [
          { startTime: { lt: data.endTime } },
          { endTime: { gt: data.startTime } }
        ]
      }
    });
    if (overlapBooking) {
      throw new ApiError(400, "Khung giờ này đã có thành viên khác đăng ký sử dụng trước");
    }

    const initialStatus = resource.requiresApproval ? "PENDING" : "APPROVED";

    return await prisma.resourceBooking.create({
      data: {
        resourceId: data.resourceId,
        userId,
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        status: initialStatus
      },
      include: {
        user: { select: { id: true, name: true, fullName: true } }
      }
    });
  },

  getRoomResourceCalendar: async (roomId: string) => {
    return await prisma.sharedResource.findMany({
      where: {
      roomId: roomId, 
    },
    include: {
      resourceBookings: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    });
  },
async createResource(userId: string, data: CreateResourceInput) {
  return await prisma.sharedResource.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      requiresApproval: data.requiresApproval,
      maxDurationMinutes: data.maxDurationMinutes,
      roomId: data.roomId,
      ownerId: userId, 
    },
  });
}
};