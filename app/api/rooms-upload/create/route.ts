import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { ApiError, errorResponse, handleApiError, successResponse } from "@/lib/api-error";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  isForwardableServiceError,
  isMicroserviceStrictMode,
  serviceErrorPayload,
  serviceIdentityHeaders,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST") {
      throw new ApiError(403, "Chỉ chủ nhà được tạo phòng");
    }

    const body = await request.json();
    const data = roomCreateSchema.parse(body);

    const propertyServiceUrl = getServiceUrl("PROPERTY");
    if (!propertyServiceUrl && isMicroserviceStrictMode()) {
      return serviceUnavailableResponse(
        "Property Service",
        "PROPERTY_SERVICE_URL is not configured",
      );
    }

    if (propertyServiceUrl) {
      try {
        const room = await requestServiceJson<unknown>(
          "property-service",
          propertyServiceUrl,
          "/v1/rooms",
          {
            method: "POST",
            headers: {
              ...Object.fromEntries(serviceIdentityHeaders(authUser)),
              "content-type": "application/json",
            },
            body: JSON.stringify(data),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(room, 201);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          const payload = serviceErrorPayload(error, "Không thể tạo phòng") as {
            message?: string;
            errors?: Record<string, string[]>;
          };
          return errorResponse(
            payload.message || "Không thể tạo phòng",
            error.status,
            payload.errors,
          );
        }
        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Property Service", reason);
        }
        console.warn("[BFF] Property Service unavailable; using local room creation.");
      }
    }

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
        latitude: data.latitude,
        longitude: data.longitude,
        ownerId: authUser.userId,
        status: "DRAFT",
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
