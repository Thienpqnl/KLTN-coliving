import { prisma } from "../prisma";
import { ApiError } from "../api-error";

export const occupancyService = {
  // Get all occupants of a room
  getRoomOccupants: async (roomId: string, hostId?: string) => {
    // Verify room ownership if hostId provided
    if (hostId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { ownerId: true },
      });

      if (!room) {
        throw new ApiError(404, "Room not found");
      }

      if (room.ownerId !== hostId) {
        throw new ApiError(403, "Not authorized to view this room's occupants");
      }
    }

    const occupants = await prisma.occupancy.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            gender: true,
            birthDate: true,
            address: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { joinedAt: "desc" }],
    });

    return occupants;
  },

  // Get active occupants only
  getActiveOccupants: async (roomId: string) => {
    const occupants = await prisma.occupancy.findMany({
      where: {
        roomId,
        status: "ACTIVE",
      },
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
    });

    return occupants;
  },

  // Get occupant details
  getOccupantDetails: async (occupancyId: string) => {
    const occupancy = await prisma.occupancy.findUnique({
      where: { id: occupancyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            gender: true,
            birthDate: true,
            address: true,
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

    if (!occupancy) {
      throw new ApiError(404, "Occupancy record not found");
    }

    return occupancy;
  },

  // Add occupant (when contract is created or approved)
  addOccupant: async (roomId: string, userId: string, notes?: string) => {
    // Verify room and user exist
    const [room, user] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!room) {
      throw new ApiError(404, "Room not found");
    }

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if already occupant
    const existingOccupancy = await prisma.occupancy.findUnique({
      where: {
        Occupancy_room_user_unique: {
          roomId,
          userId,
        },
      },
    });

    if (existingOccupancy && existingOccupancy.status === "ACTIVE") {
      throw new ApiError(409, "User is already an occupant of this room");
    }

    // If there's a terminated record, create a new one
    const occupancy = await prisma.occupancy.create({
      data: {
        roomId,
        userId,
        notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update room status to OCCUPIED
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "OCCUPIED", currentOccupants: { increment: 1 } },
    });

    return occupancy;
  },

  // Terminate occupancy
  terminateOccupancy: async (
    occupancyId: string,
    reason: string,
    hostId?: string
  ) => {
    const occupancy = await prisma.occupancy.findUnique({
      where: { id: occupancyId },
      include: { room: true },
    });

    if (!occupancy) {
      throw new ApiError(404, "Occupancy record not found");
    }

    // Verify host authorization
    if (hostId && occupancy.room.ownerId !== hostId) {
      throw new ApiError(403, "Not authorized to modify this occupancy record");
    }

    // Update occupancy status to INACTIVE
    const updated = await prisma.occupancy.update({
      where: { id: occupancyId },
      data: {
        status: "INACTIVE",
        terminatedAt: new Date(),
        terminationReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update room currentOccupants count
    const activeCount = await prisma.occupancy.count({
      where: {
        roomId: occupancy.roomId,
        status: "ACTIVE",
      },
    });

    // Update room status based on active occupants
    const roomStatus = activeCount === 0 ? "AVAILABLE" : "OCCUPIED";
    await prisma.room.update({
      where: { id: occupancy.roomId },
      data: {
        currentOccupants: activeCount,
        status: roomStatus,
      },
    });

    return updated;
  },

  // Get occupancy history
  getOccupancyHistory: async (roomId: string, hostId?: string) => {
    // Verify room ownership if hostId provided
    if (hostId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { ownerId: true },
      });

      if (!room) {
        throw new ApiError(404, "Room not found");
      }

      if (room.ownerId !== hostId) {
        throw new ApiError(403, "Not authorized to view this room's history");
      }
    }

    const history = await prisma.occupancy.findMany({
      where: { roomId },
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
      orderBy: { joinedAt: "desc" },
    });

    return history;
  },

  // Get occupancy statistics
  getOccupancyStats: async (roomId: string) => {
    const [activeCount, totalCount, inactiveCount] = await Promise.all([
      prisma.occupancy.count({
        where: { roomId, status: "ACTIVE" },
      }),
      prisma.occupancy.count({ where: { roomId } }),
      prisma.occupancy.count({
        where: { roomId, status: "INACTIVE" },
      }),
    ]);

    return {
      activeOccupants: activeCount,
      totalOccupants: totalCount,
      inactiveOccupants: inactiveCount,
      occupancyRate: totalCount > 0 ? (activeCount / totalCount) * 100 : 0,
    };
  },

  // Link occupancy to booking (when booking is confirmed)
  linkToBooking: async (bookingId: string) => {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // Add occupant to room
    return occupancyService.addOccupant(
      booking.roomId,
      booking.userId,
      `Added from booking #${bookingId}`
    );
  },
};
