import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);

    const body = await request.json();
    const data = roomCreateSchema.parse(body);

    // Get first image from array, or empty string
    const firstImage = (data.image && data.image.length > 0) ? data.image[0] : '';

    const room = await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        address: data.address,
        image: data.image || [],
        ownerId: authUser.userId,
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

      // Refetch room with amenities
      const updatedRoom = await prisma.room.findUnique({
        where: { id: room.id },
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

      return successResponse(updatedRoom, 201);
    }

    return successResponse(room, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
