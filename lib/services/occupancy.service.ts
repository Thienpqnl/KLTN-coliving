import { prisma } from "../prisma";
import { ApiError } from "../api-error";
import {
  getRoomCapacity,
  runSerializableTransaction,
  syncRoomOccupancy,
} from "./room-capacity.service";

type OccupancyActor = {
  userId: string;
  role: string;
};

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

export const occupancyService = {
  getRoomOccupants: async (roomId: string, hostId?: string) => {
    if (hostId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { ownerId: true },
      });
      if (!room) throw new ApiError(404, "Không tìm thấy phòng");
      if (room.ownerId !== hostId) {
        throw new ApiError(403, "Bạn không có quyền xem người thuê của phòng này");
      }
    }

    return prisma.occupancy.findMany({
      where: { roomId },
      include: { user: { select: occupantUserSelect } },
      orderBy: [{ status: "asc" }, { joinedAt: "desc" }],
    });
  },

  getActiveOccupants: async (roomId: string) =>
    prisma.occupancy.findMany({
      where: { roomId, status: "ACTIVE" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),

  getOccupantDetails: async (occupancyId: string) => {
    const occupancy = await prisma.occupancy.findUnique({
      where: { id: occupancyId },
      include: {
        user: {
          select: {
            ...occupantUserSelect,
            createdAt: true,
            role: true,
          },
        },
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            priceValue: true,
          },
        },
      },
    });

    if (!occupancy) throw new ApiError(404, "Không tìm thấy thông tin cư trú");
    return occupancy;
  },

  addOccupant: async (
    roomId: string,
    userId: string,
    notes?: string,
    actor?: OccupancyActor,
    excludeBookingId?: string
  ) =>
    runSerializableTransaction(async (tx) => {
      const [capacity, user] = await Promise.all([
        getRoomCapacity(tx, roomId, undefined, excludeBookingId),
        tx.user.findUnique({ where: { id: userId }, select: { id: true } }),
      ]);

      if (!capacity) throw new ApiError(404, "Không tìm thấy phòng");
      if (!user) throw new ApiError(404, "Không tìm thấy người dùng");

      if (
        actor &&
        actor.role !== "ADMIN" &&
        capacity.room.ownerId !== actor.userId
      ) {
        throw new ApiError(403, "Bạn không có quyền thêm người thuê vào phòng này");
      }

      const existing = await tx.occupancy.findUnique({
        where: { Occupancy_room_user_unique: { roomId, userId } },
      });
      if (existing?.status === "ACTIVE") {
        throw new ApiError(409, "Người dùng đã là thành viên của phòng");
      }
      if (capacity.isFull) {
        throw new ApiError(409, "Phòng đã hết chỗ và không thể thêm người thuê");
      }

      const occupancy = existing
        ? await tx.occupancy.update({
            where: { id: existing.id },
            data: {
              status: "ACTIVE",
              joinedAt: new Date(),
              terminatedAt: null,
              terminationReason: null,
              notes,
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          })
        : await tx.occupancy.create({
            data: { roomId, userId, notes },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          });

      await syncRoomOccupancy(tx, roomId);
      return occupancy;
    }),

  terminateOccupancy: async (
    occupancyId: string,
    reason: string,
    hostId?: string
  ) =>
    runSerializableTransaction(async (tx) => {
      const occupancy = await tx.occupancy.findUnique({
        where: { id: occupancyId },
        include: { room: true },
      });
      if (!occupancy) throw new ApiError(404, "Không tìm thấy thông tin cư trú");
      if (hostId && occupancy.room.ownerId !== hostId) {
        throw new ApiError(403, "Bạn không có quyền kết thúc cư trú này");
      }
      if (occupancy.status !== "ACTIVE") {
        throw new ApiError(409, "Người thuê không còn ở trong phòng");
      }

      const updated = await tx.occupancy.update({
        where: { id: occupancyId },
        data: {
          status: "INACTIVE",
          terminatedAt: new Date(),
          terminationReason: reason,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await syncRoomOccupancy(tx, occupancy.roomId);
      return updated;
    }),

  getOccupancyHistory: async (roomId: string, hostId?: string) => {
    if (hostId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { ownerId: true },
      });
      if (!room) throw new ApiError(404, "Không tìm thấy phòng");
      if (room.ownerId !== hostId) {
        throw new ApiError(403, "Bạn không có quyền xem lịch sử của phòng này");
      }
    }

    return prisma.occupancy.findMany({
      where: { roomId },
      include: { user: { select: occupantUserSelect } },
      orderBy: { joinedAt: "desc" },
    });
  },

  getOccupancyStats: async (roomId: string) => {
    const [activeCount, totalCount, inactiveCount] = await Promise.all([
      prisma.occupancy.count({ where: { roomId, status: "ACTIVE" } }),
      prisma.occupancy.count({ where: { roomId } }),
      prisma.occupancy.count({ where: { roomId, status: "INACTIVE" } }),
    ]);

    return {
      activeOccupants: activeCount,
      totalOccupants: totalCount,
      inactiveOccupants: inactiveCount,
      occupancyRate: totalCount > 0 ? (activeCount / totalCount) * 100 : 0,
    };
  },

  linkToBooking: async (bookingId: string, actor?: OccupancyActor) => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new ApiError(404, "Không tìm thấy booking");
    if (booking.status !== "CONFIRMED") {
      throw new ApiError(409, "Booking phải được xác nhận trước khi nhận phòng");
    }

    return occupancyService.addOccupant(
      booking.roomId,
      booking.userId,
      `Được thêm từ booking #${bookingId}`,
      actor,
      bookingId
    );
  },
};
