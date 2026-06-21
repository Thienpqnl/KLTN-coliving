import { prisma } from "../prisma";
import { BookingCreate } from "../validation";
import { ApiError } from "../api-error";

async function getRoomCapacity(roomId: string) {
  const [room, activeOccupants] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true, currentOccupants: true, maxOccupants: true },
    }),
    prisma.occupancy.count({ where: { roomId, status: "ACTIVE" } }),
  ]);

  if (!room) throw new ApiError(404, "Không tìm thấy phòng");

  const maxOccupants = Math.max(1, room.maxOccupants ?? 1);
  const occupiedPlaces = Math.max(activeOccupants, room.currentOccupants ?? 0);
  return { room, maxOccupants, occupiedPlaces };
}

export const bookingService = {
  // Create a new booking
  create: async (userId: string, data: BookingCreate) => {
    const { room, maxOccupants, occupiedPlaces } = await getRoomCapacity(data.roomId);

    // Check if room is available
    if (room.status !== "AVAILABLE") {
      throw new ApiError(400, "Room is not available");
    }

    if (occupiedPlaces >= maxOccupants) {
      throw new ApiError(409, "Phòng đã đủ số người tối đa và không thể nhận thêm yêu cầu đặt phòng");
    }

    // Check for overlapping bookings
    const existingBooking = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ["PENDING", "CONFIRMED"] },
        AND: [
          { startDate: { lt: data.endDate } },
          { endDate: { gt: data.startDate } },
        ],
      },
    });

    if (existingBooking) {
      throw new ApiError(400, "Room is already booked for bookingService period");
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId: data.roomId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: true,
      },
    });

    return booking;
  },

  // Get booking by ID
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
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // Check ownership if userId provided
    if (userId && booking.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    return booking;
  },

  // Get user's bookings
  getUserBookings: async (userId: string) => {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          include: {
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
        },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return bookings;
  },

  // Get all bookings (admin)
  getAll: async (filters?: { status?: string; roomId?: string }) => {
    const bookings = await prisma.booking.findMany({
      where: {
        ...(filters?.status && { 
          status: filters.status as 
            | "PENDING" 
            | "CONFIRMED" 
            | "CANCELLED" 
            | "COMPLETED"
        }),
        ...(filters?.roomId && { roomId: filters.roomId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" as const },
    });

    return bookings;
  },

  // Update booking status
  updateStatus: async (
    id: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
  ) => {
    const booking = await bookingService.getById(id);

    if (status === "CONFIRMED" && booking.status !== "CONFIRMED") {
      const [{ maxOccupants, occupiedPlaces }, reservedBookings] = await Promise.all([
        getRoomCapacity(booking.roomId),
        prisma.booking.count({
          where: {
            roomId: booking.roomId,
            status: "CONFIRMED",
            id: { not: booking.id },
          },
        }),
      ]);

      if (occupiedPlaces + reservedBookings >= maxOccupants) {
        throw new ApiError(409, "Phòng đã đủ người hoặc đã hết số chỗ có thể xác nhận");
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: true,
        invoice: true,
      },
    });

    return updatedBooking;
  },

  // Cancel booking
  cancel: async (id: string, userId?: string) => {
    const booking = await bookingService.getById(id, userId);

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      throw new ApiError(400, "Cannot cancel bookingService booking");
    }

    return bookingService.updateStatus(id, "CANCELLED");
  },

  // Get bookings for a room
  getRoomBookings: async (roomId: string) => {
    const bookings = await prisma.booking.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoice: true,
      },
      orderBy: { startDate: "asc" as const },
    });

    return bookings;
  },

  // Get booking statistics
  getStats: async (roomId?: string) => {
    const whereClause = roomId ? { roomId } : {};

    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      prisma.booking.count({ where: whereClause }),
      prisma.booking.count({ where: { ...whereClause, status: "PENDING" } }),
      prisma.booking.count({ where: { ...whereClause, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { ...whereClause, status: "CANCELLED" } }),
      prisma.booking.count({ where: { ...whereClause, status: "COMPLETED" } }),
    ]);

    return {
      total,
      pending,
      confirmed,
      cancelled,
      completed,
    };
  },
};
