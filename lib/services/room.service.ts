import { prisma } from "../prisma";
import { RoomCreate, RoomUpdate, RoomFilter } from "../validation";
import { ApiError } from "../api-error";

export const roomService = {
  // Create a new room
  create: async (data: RoomCreate & { ownerId: string }) => {
    // Get first image from array, or empty string
    const firstImage = (data.image && data.image.length > 0) ? data.image[0] : '';
    
    const room = await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        address: data.address,
        image: firstImage,
        ownerId: data.ownerId,
      },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
        bookings: true,
      },
    });

    // Add amenities if provided
    if (data.amenityIds && data.amenityIds.length > 0) {
      await Promise.all(
        data.amenityIds.map((amenityId) =>
          prisma.roomAmenity.create({
            data: {
              roomId: room.id,
              amenityId,
            },
          })
        )
      );
    }

    return room;
  },

  // Get room by ID
  getById: async (id: string) => {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        bookings: true,
      },
    });

    if (!room) {
      throw new ApiError(404, "Room not found");
    }

    return room;
  },

  // Get all rooms with filters
  getAll: async (filters?: RoomFilter) => {
    const rooms = await prisma.room.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.minPrice && { price: { gte: filters.minPrice } }),
        ...(filters?.maxPrice && { price: { lte: filters.maxPrice } }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { address: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
        bookings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rooms;
  },

  // Update room
  update: async (id: string, data: RoomUpdate) => {
    // Verify room exists
    await roomService.getById(id);

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.address) updateData.address = data.address;
    if (data.image !== undefined && data.image.length > 0) {
      updateData.image = data.image[0]; // Store only first image
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
        bookings: true,
      },
    });

    // Update amenities if provided
    if (data.amenityIds) {
      // Remove old amenities
      await prisma.roomAmenity.deleteMany({
        where: { roomId: id },
      });

      // Add new amenities
      if (data.amenityIds.length > 0) {
        await Promise.all(
          data.amenityIds.map((amenityId) =>
            prisma.roomAmenity.create({
              data: {
                roomId: id,
                amenityId,
              },
            })
          )
        );
      }
    }

    return room;
  },

  // Delete room
  delete: async (id: string) => {
    // Verify room exists
    await roomService.getById(id);

    // Delete room amenities first
    await prisma.roomAmenity.deleteMany({
      where: { roomId: id },
    });

    // Delete room
    const room = await prisma.room.delete({
      where: { id },
    });

    return room;
  },

  // Get available rooms for a date range
  getAvailable: async (startDate: Date, endDate: Date) => {
    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        bookings: {
          none: {
            AND: [
              {
                startDate: {
                  lt: endDate,
                },
              },
              {
                endDate: {
                  gt: startDate,
                },
              },
              {
                status: {
                  in: ["PENDING", "CONFIRMED"],
                },
              },
            ],
          },
        },
      },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
      },
    });

    return rooms;
  },

  // Update room status
  updateStatus: async (id: string, status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE") => {
    // Verify room exists
    await roomService.getById(id);

    const room = await prisma.room.update({
      where: { id },
      data: { status },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
        bookings: true,
      },
    });

    return room;
  },
};
