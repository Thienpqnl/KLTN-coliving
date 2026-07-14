import { BookingStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { BookingCancellation, BookingCreate } from "../validation";
import { ApiError } from "../api-error";
import {
  getRoomCapacity,
  runSerializableTransaction,
} from "./room-capacity.service";

type BookingActor = {
  userId: string;
  role: string;
};

const bookingInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  room: true,
  invoice: true,
};

function assertCanManageBooking(
  actor: BookingActor,
  booking: { userId: string; room: { ownerId: string | null } },
  status: BookingStatus
) {
  const isAdmin = actor.role === "ADMIN";
  const isHost = booking.room.ownerId === actor.userId;
  const isRenter = booking.userId === actor.userId;

  if (status === BookingStatus.CONFIRMED && !isHost && !isAdmin) {
    throw new ApiError(403, "Chỉ chủ phòng hoặc admin mới có thể xác nhận booking");
  }

  if (status === BookingStatus.CANCELLED && !isHost && !isRenter && !isAdmin) {
    throw new ApiError(403, "Bạn không có quyền hủy booking này");
  }

  if (status === BookingStatus.COMPLETED && !isAdmin) {
    throw new ApiError(403, "Booking chỉ hoàn tất sau khi quy trình bàn giao kết thúc");
  }

  if (status === BookingStatus.PENDING) {
    throw new ApiError(400, "Không thể chuyển booking trở lại trạng thái chờ");
  }
}

export const bookingService = {
  create: async (userId: string, data: BookingCreate) => {
    const interval = { startDate: data.startDate, endDate: data.endDate };
    const capacity = await getRoomCapacity(prisma, data.roomId, interval);

    if (!capacity) throw new ApiError(404, "Không tìm thấy phòng");
    if (capacity.room.status !== "AVAILABLE") {
      throw new ApiError(400, "Phòng hiện không khả dụng để đặt");
    }
    if (capacity.isFull) {
      throw new ApiError(
        409,
        "Phòng đã hết chỗ trong khoảng thời gian bạn chọn"
      );
    }

    const duplicateBooking = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lt: data.endDate },
        endDate: { gt: data.startDate },
      },
    });

    if (duplicateBooking) {
      throw new ApiError(
        409,
        "Bạn đã có một yêu cầu đặt phòng trùng khoảng thời gian này"
      );
    }

    return prisma.booking.create({
      data: {
        userId,
        roomId: data.roomId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      include: bookingInclude,
    });
  },

  getById: async (id: string, userId?: string) => {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        room: {
          include: {
            amenities: { include: { amenity: true } },
          },
        },
        invoice: true,
      },
    });

    if (!booking) throw new ApiError(404, "Không tìm thấy booking");
    if (userId && booking.userId !== userId) {
      throw new ApiError(403, "Bạn không có quyền xem booking này");
    }

    return booking;
  },

  getUserBookings: async (userId: string) =>
    prisma.booking.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { include: { amenities: { include: { amenity: true } } } },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    }),

  getAll: async (filters?: { status?: string; roomId?: string }) =>
    prisma.booking.findMany({
      where: {
        ...(filters?.status && {
          status: filters.status as BookingStatus,
        }),
        ...(filters?.roomId && { roomId: filters.roomId }),
      },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    }),

  updateStatus: async (
    id: string,
    status: BookingStatus,
    actor: BookingActor
  ) => {
    if (status === BookingStatus.CONFIRMED) {
      return runSerializableTransaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id },
          include: bookingInclude,
        });

        if (!booking) throw new ApiError(404, "Không tìm thấy booking");
        assertCanManageBooking(actor, booking, status);

        if (booking.status === BookingStatus.CONFIRMED) return booking;
        if (booking.status !== BookingStatus.PENDING) {
          throw new ApiError(409, "Chỉ booking đang chờ mới có thể được xác nhận");
        }

        const capacity = await getRoomCapacity(
          tx,
          booking.roomId,
          { startDate: booking.startDate, endDate: booking.endDate },
          booking.id
        );

        if (!capacity) throw new ApiError(404, "Không tìm thấy phòng");
        if (capacity.isFull) {
          throw new ApiError(
            409,
            "Phòng đã hết chỗ trong khoảng thời gian của booking này"
          );
        }

        return tx.booking.update({
          where: { id },
          data: { status: BookingStatus.CONFIRMED },
          include: bookingInclude,
        });
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking) throw new ApiError(404, "Không tìm thấy booking");
    assertCanManageBooking(actor, booking, status);

    if (booking.status === status) return booking;
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ApiError(409, "Booking đã kết thúc và không thể đổi trạng thái");
    }
    if (status === BookingStatus.CANCELLED) {
      const isAdmin = actor.role === "ADMIN";
      const isHost = booking.room.ownerId === actor.userId;
      if (!isAdmin && !isHost) {
        throw new ApiError(400, "Người thuê phải sử dụng chức năng hủy booking và cung cấp lý do");
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new ApiError(409, "Chủ nhà chỉ có thể từ chối booking đang chờ xác nhận");
      }
    }

    return prisma.booking.update({
      where: { id },
      data: { status },
      include: bookingInclude,
    });
  },

  cancel: async (id: string, actor: BookingActor, data: BookingCancellation) => {
    return runSerializableTransaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          ...bookingInclude,
          contract: {
            select: { id: true, status: true, depositStatus: true },
          },
        },
      });
      if (!booking) throw new ApiError(404, "Không tìm thấy booking");
      assertCanManageBooking(actor, booking, BookingStatus.CANCELLED);

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new ApiError(409, "Booking đã kết thúc và không thể hủy");
      }

      const protectedContractStatuses = new Set([
        "PENDING_DEPOSIT",
        "PENDING_HANDOVER",
        "ACTIVE",
        "EXPIRED",
        "TERMINATED",
        "DISPUTED",
      ]);
      if (booking.contract && protectedContractStatuses.has(booking.contract.status)) {
        throw new ApiError(
          409,
          booking.contract.status === "ACTIVE"
            ? "Hợp đồng đã có hiệu lực. Vui lòng sử dụng chức năng rời phòng hoặc chấm dứt hợp đồng."
            : "Booking đang ở giai đoạn thực hiện hợp đồng và không thể hủy trực tiếp."
        );
      }

      const now = new Date();
      const cancellationActor = actor.role === "ADMIN"
        ? "ADMIN"
        : booking.room.ownerId === actor.userId
          ? "HOST"
          : "RENTER";
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: actor.userId,
          cancellationActor,
          cancellationReason: data.reason,
        },
        include: bookingInclude,
      });

      if (booking.contract && booking.contract.status !== "CANCELLED") {
        await tx.contract.update({
          where: { id: booking.contract.id },
          data: {
            status: "CANCELLED",
            terminatedAt: now,
            terminationReason: data.reason,
          },
        });
        await tx.contractEvent.create({
          data: {
            contractId: booking.contract.id,
            actorId: actor.userId,
            type: "BOOKING_CANCELLED",
            fromStatus: booking.contract.status,
            toStatus: "CANCELLED",
            note: data.reason,
            metadata: { bookingId: booking.id, actor: cancellationActor },
          },
        });
      }

      return updated;
    });
  },

  getRoomBookings: async (roomId: string) =>
    prisma.booking.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        invoice: true,
      },
      orderBy: { startDate: "asc" },
    }),

  getStats: async (roomId?: string) => {
    const where = roomId ? { roomId } : {};
    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: "PENDING" } }),
      prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { ...where, status: "CANCELLED" } }),
      prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
    ]);

    return { total, pending, confirmed, cancelled, completed };
  },
};
