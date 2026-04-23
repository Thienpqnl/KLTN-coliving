import { prisma } from "../prisma";
import { AmenityCreate, AmenityUpdate } from "../validation";
import { ApiError } from "../api-error";

export const amenityService = {
  // Create new amenity
  create: async (data: AmenityCreate) => {
    const amenity = await prisma.amenity.create({
      data: {
        name: data.name,
      },
      include: {
        rooms: true,
      },
    });

    return amenity;
  },

  // Get amenity by ID
  getById: async (id: string) => {
    const amenity = await prisma.amenity.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!amenity) {
      throw new ApiError(404, "Amenity not found");
    }

    return amenity;
  },

  // Get all amenities
  getAll: async () => {
    const amenities = await prisma.amenity.findMany({
      include: {
        rooms: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return amenities;
  },

  // Update amenity
  update: async (id: string, data: AmenityUpdate) => {
    // Verify amenity exists
    await amenityService.getById(id);

    const amenity = await prisma.amenity.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
      },
      include: {
        rooms: true,
      },
    });

    return amenity;
  },

  // Delete amenity
  delete: async (id: string) => {
    // Verify amenity exists
    await amenityService.getById(id);

    // Delete room amenity relationships
    await prisma.roomAmenity.deleteMany({
      where: { amenityId: id },
    });

    // Delete amenity
    const amenity = await prisma.amenity.delete({
      where: { id },
    });

    return amenity;
  },

  // Get amenities by room
  getByRoom: async (roomId: string) => {
    const amenities = await prisma.roomAmenity.findMany({
      where: { roomId },
      include: {
        amenity: true,
      },
    });

    return amenities.map((ra) => ra.amenity);
  },

  // Bulk create amenities (useful for seed data)
  bulkCreate: async (names: string[]) => {
    const amenities = await Promise.all(
      names.map((name) => amenityService.create({ name }))
    );

    return amenities;
  },
};
