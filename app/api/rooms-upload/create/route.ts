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

    const imageArray = data.image || [];

    const room = await prisma.room.create({
      data: {
        title: data.title,
        description: data.description,
        priceText: `${data.price.toLocaleString("vi-VN")} đ/tháng`,
        priceValue: BigInt(Math.round(data.price)),
        areaText: data.area,
        areaValue: data.area.replace(/[^\d.,]/g, "").replace(",", ".") || null,
        address: data.address,
        ownerId: authUser.userId,
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
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
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

      // Refetch room with amenities
      const updatedRoom = await prisma.room.findUnique({
        where: { id: room.id },
        include: {
          amenities: {
            include: {
              amenity: true,
            },
          },
          images: {
            orderBy: {
              sortOrder: "asc",
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
