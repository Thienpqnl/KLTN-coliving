import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { RoomCreate, RoomUpdate, RoomFilter } from "../validation";
import { ApiError } from "../api-error";

const roomInclude = {
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
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
  reviews: true,
  bookings: true,
};

const roomListInclude = {
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
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
    take: 1,
  },
};

const formatAreaText = (area?: string | null) => {
  const value = area?.trim();

  if (!value) return value;

  if (/m\s*(2|²)\b/i.test(value)) {
    return value;
  }

  if (/^\d+([.,]\d+)?$/.test(value)) {
    return `${value} m2`;
  }

  return value;
};

type NormalizableRoom = {
  images?: { url: string }[] | null;
  priceValue?: Prisma.Decimal | bigint | number | null;
  areaValue?: Prisma.Decimal | number | null;
  areaText?: string | null;
};

const normalizeRoom = <TRoom extends NormalizableRoom>(room: TRoom) => {
  const imageUrls = room.images?.map((image) => image.url) || [];
  const priceValue = room.priceValue == null ? null : Number(room.priceValue);
  const areaValue = room.areaValue == null ? null : Number(room.areaValue);
  const areaText = formatAreaText(room.areaText);

  return {
    ...room,
    areaText,
    priceValue,
    areaValue,
    price: priceValue ?? 0,
    area: areaText || (areaValue == null ? "" : `${areaValue} m2`),
    image: imageUrls,
  };
};

export const roomService = {
  // Create a new room
  create: async (data: RoomCreate & { ownerId: string }) => {
    // Handle images as array
    const imageArray = Array.isArray(data.image) ? data.image : [];
    
    const room = await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        priceText: data.price ? `${data.price.toLocaleString("vi-VN")} đ/tháng` : null,
        priceValue: data.price ? BigInt(Math.round(data.price)) : null,
        areaText: formatAreaText(data.area),
        areaValue: data.area ? new Prisma.Decimal(String(data.area).replace(/[^\d.,]/g, "").replace(",", ".") || "0") : null,
        address: data.address,
        ownerId: data.ownerId,
        status: "DRAFT",

        latitude: data.latitude,

        longitude: data.longitude,
        cleanlinessRequired: data.cleanlinessRequired,
        noiseTolerance: data.noiseTolerance,
        guestPolicy: data.guestPolicy,
        preferredSleepHabit: data.preferredSleepHabit,
        preferredOccupation: data.preferredOccupation,
        curfewPolicy: data.curfewPolicy,
        maxOccupants: data.maxOccupants,
        preferredGender: data.preferredGender,
        allowSmoking: data.allowSmoking,
        allowPets: data.allowPets,
        images: {
          create: imageArray.map((url, index) => ({
            url,
            alt: data.title,
            sortOrder: index,
          })),
        },
      },
      include: roomInclude,
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

    return normalizeRoom(room);
  },
// Get all rooms by ownerId
getAllByOwnerId: async (ownerId: string) => {
  if (!ownerId) {
    throw new ApiError(400, "Owner ID is required");
  }

  const rooms = await prisma.room.findMany({
    where: {
      ownerId: ownerId,
    },
    include: roomInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return rooms.map(normalizeRoom);
},
  // Get room by ID
  getById: async (id: string) => {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        ...roomInclude,
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
      },
    });

    if (!room) {
      throw new ApiError(404, "Room not found");
    }

    return normalizeRoom(room);
  },

  getPublicById: async (id: string) => {
    const room = await prisma.room.findFirst({
      where: { id, status: "AVAILABLE" },
      include: {
        ...roomInclude,
        reviews: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!room) throw new ApiError(404, "Room not found");
    return normalizeRoom(room);
  },

  // Get all rooms with filters (old, for reference)
  getAll: async (filters?: RoomFilter) => {
    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        ...(filters?.minPrice && { priceValue: { gte: filters.minPrice } }),
        ...(filters?.maxPrice && { priceValue: { lte: filters.maxPrice } }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { address: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: roomListInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
    return rooms.map(normalizeRoom);
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
      status: "AVAILABLE",
      ...(filters?.minPrice && { priceValue: { gte: filters.minPrice } }),
      ...(filters?.maxPrice && { priceValue: { lte: filters.maxPrice } }),
      ...(filters?.ownerId && { ownerId: filters.ownerId }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { address: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(neighborhoods && neighborhoods.length > 0 && {
        OR: neighborhoods.flatMap((neighborhood) => [
          { district: { contains: neighborhood, mode: Prisma.QueryMode.insensitive } },
          { address: { contains: neighborhood, mode: Prisma.QueryMode.insensitive } },
        ]),
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
    let orderBy: Prisma.RoomOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "price-low") {
      orderBy = { priceValue: "asc" };
    } else if (sortBy === "price-high") {
      orderBy = { priceValue: "desc" };
    } else if (sortBy === "area-large") {
      orderBy = { areaValue: "desc" };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: roomListInclude,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { rooms: rooms.map(normalizeRoom), total };
  },

  // Update room
  update: async (id: string, data: RoomUpdate) => {
    // Verify room exists
    await roomService.getById(id);

    const updateData: Prisma.RoomUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.price !== undefined) {
      updateData.priceText = `${data.price.toLocaleString("vi-VN")} đ/tháng`;
      updateData.priceValue = BigInt(Math.round(data.price));
    }
    if (data.area) {
      updateData.areaText = formatAreaText(data.area);
      updateData.areaValue = new Prisma.Decimal(String(data.area).replace(/[^\d.,]/g, "").replace(",", ".") || "0");
    }
    if (data.address) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    
    // Add room requirements & policies
    if (data.cleanlinessRequired !== undefined) updateData.cleanlinessRequired = data.cleanlinessRequired;
    if (data.noiseTolerance !== undefined) updateData.noiseTolerance = data.noiseTolerance;
    if (data.guestPolicy !== undefined) updateData.guestPolicy = data.guestPolicy;
    if (data.preferredSleepHabit !== undefined) updateData.preferredSleepHabit = data.preferredSleepHabit;
    if (data.preferredOccupation !== undefined) updateData.preferredOccupation = data.preferredOccupation;
    if (data.curfewPolicy !== undefined) updateData.curfewPolicy = data.curfewPolicy;
    if (data.maxOccupants !== undefined) updateData.maxOccupants = data.maxOccupants;
    if (data.preferredGender !== undefined) updateData.preferredGender = data.preferredGender;
    if (data.allowSmoking !== undefined) updateData.allowSmoking = data.allowSmoking;
    if (data.allowPets !== undefined) updateData.allowPets = data.allowPets;

    const currentRoom = await prisma.room.findUnique({
      where: { id },
      select: { status: true },
    });
    const requiresReview = currentRoom?.status === "AVAILABLE";

    if (requiresReview) {
      updateData.status = "PENDING";
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: roomListInclude,
    });

    if (data.image !== undefined) {
      const imageArray = Array.isArray(data.image) ? data.image : [];
      await prisma.roomImage.deleteMany({
        where: { roomId: id },
      });
      await prisma.roomImage.createMany({
        data: imageArray.map((url, index) => ({
          roomId: id,
          url,
          alt: data.title,
          sortOrder: index,
        })),
      });
    }

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

    if (requiresReview) {
      await prisma.roomVerification.upsert({
        where: { roomId: id },
        create: { roomId: id, submittedAt: new Date() },
        update: {
          submittedAt: new Date(),
          reviewedAt: null,
          reviewerId: null,
          revisionReason: null,
          rejectionReason: null,
          identityPassed: false,
          ownershipPassed: false,
          addressPassed: false,
          imagesPassed: false,
          detailsPassed: false,
        },
      });
    }

    return normalizeRoom(room);
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
        ...roomInclude,
        reviews: true,
      },
    });

    return rooms.map(normalizeRoom);
  },

  // Update room status
  updateStatus: async (id: string, status: "AVAILABLE" | "OCCUPIED") => {
    // Verify room exists
    await roomService.getById(id);

    const room = await prisma.room.update({
      where: { id },
      data: { status },
      include: roomInclude,
    });

    return normalizeRoom(room);
  },
};
