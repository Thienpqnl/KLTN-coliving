import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { RoomCreate, RoomUpdate, RoomFilter } from "../validation";
import { ApiError } from "../api-error";

export const roomService = {
  // Create a new room
  create: async (data: RoomCreate & { ownerId: string }) => {
    // Handle images as array
    const imageArray = Array.isArray(data.images) ? data.images : [];
    
    const room = await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        area: data.area,
        address: data.address,
        image: imageArray,
        ownerId: data.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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

  // Get all rooms with filters (old, for reference)
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
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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

  // Get all rooms with filters and pagination
  getAllPaginated: async (
    filters: RoomFilter = {}, 
    page = 1, 
    limit = 10,
    neighborhoods?: string[],
    amenities?: string[],
    roomTypes?: string[],
    sortBy?: string
  ) => {
    const where: Prisma.RoomWhereInput = {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.minPrice && { price: { gte: filters.minPrice } }),
      ...(filters?.maxPrice && { price: { lte: filters.maxPrice } }),
      ...(filters?.ownerId && { ownerId: filters.ownerId }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { address: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(neighborhoods && neighborhoods.length > 0 && {
        address: {
          in: neighborhoods,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
      ...(amenities && amenities.length > 0 && {
        amenities: {
          some: {
            amenity: {
              name: {
                in: amenities,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      }),
      ...(roomTypes && roomTypes.length > 0 && {
        description: {
          in: roomTypes,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
    };

    const total = await prisma.room.count({ where });
    
    // Determine ordering based on sortBy
    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "price-low") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price-high") {
      orderBy = { price: "desc" };
    } else if (sortBy === "area-large") {
      orderBy = { area: "desc" };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: true,
        bookings: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { rooms, total };
  },

  // Update room
  update: async (id: string, data: RoomUpdate) => {
    // Verify room exists
    await roomService.getById(id);

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.area) updateData.area = data.area;
    if (data.address) updateData.address = data.address;
    if (data.images !== undefined) {
      updateData.image = Array.isArray(data.images) ? data.images : [];
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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
  updateStatus: async (id: string, status: "AVAILABLE" | "OCCUPIED") => {
    // Verify room exists
    await roomService.getById(id);

    const room = await prisma.room.update({
      where: { id },
      data: { status },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
          },
        },
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
