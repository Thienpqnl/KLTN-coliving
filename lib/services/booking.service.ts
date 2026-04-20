import { prisma } from "./prisma";
import { BookingCreate } from "./validation";
import { ApiError } from "./api-error";
import { roomService } from "./services/room.service";

export const bookingService = {
  // Create a new booking
  create: async (userId: string, data: BookingCreate) => {
    // Verify room exists
    const room = await roomService.getById(data.roomId);

    // Check if room is available
    if (room.status !== "AVAILABLE") {
      throw new ApiError(400, "Room is not available");
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
      throw new ApiError(400, "Room is already booked for this period");
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
    const booking = await this.getById(id);

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
    const booking = await this.getById(id, userId);

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      throw new ApiError(400, "Cannot cancel this booking");
    }

    return this.updateStatus(id, "CANCELLED");
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
