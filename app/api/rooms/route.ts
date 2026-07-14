import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomFilterSchema } from "@/lib/validation";
import { handleApiError, successResponse } from "@/lib/api-error";
import {
  getServiceUrl,
  requestServiceJson,
} from "@/lib/microservices/service-client";
import {
  isMicroserviceStrictMode,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

type RoomListResult = {
  rooms: unknown[];
  total: number;
  page: number;
  limit: number;
};

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const neighborhoods = searchParams.getAll("neighborhoods");
    const amenities = searchParams.getAll("amenities");
    const roomTypes = searchParams.getAll("roomTypes");
    const sortBy = searchParams.get("sortBy");
    const location = searchParams.get("location");
    const originLat = searchParams.get("originLat");
    const originLng = searchParams.get("originLng");
    const maxDistanceKm = searchParams.get("maxDistanceKm");
    const minAvailableSlots = searchParams.get("minAvailableSlots");
    const allowPets = searchParams.get("allowPets");
    const allowSmoking = searchParams.get("allowSmoking");
    const cleanlinessRequired = searchParams.get("cleanlinessRequired");
    const noiseTolerance = searchParams.get("noiseTolerance");
    const guestPolicy = searchParams.get("guestPolicy");
    const preferredSleepHabit = searchParams.get("preferredSleepHabit");

    const filters = roomFilterSchema.parse({
      status: status || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search: search || undefined,
      location: location || undefined,
      originLat: originLat ? parseFloat(originLat) : undefined,
      originLng: originLng ? parseFloat(originLng) : undefined,
      maxDistanceKm: maxDistanceKm ? parseFloat(maxDistanceKm) : undefined,
      minAvailableSlots: minAvailableSlots ? parseInt(minAvailableSlots, 10) : undefined,
      allowPets: allowPets === null ? undefined : allowPets === "true",
      allowSmoking: allowSmoking === null ? undefined : allowSmoking === "true",
      cleanlinessRequired: cleanlinessRequired || undefined,
      noiseTolerance: noiseTolerance || undefined,
      guestPolicy: guestPolicy || undefined,
      preferredSleepHabit: preferredSleepHabit || undefined,
    });

    const propertyServiceUrl = getServiceUrl("PROPERTY");
    if (!propertyServiceUrl && isMicroserviceStrictMode()) {
      return serviceUnavailableResponse(
        "Property Service",
        "PROPERTY_SERVICE_URL is not configured",
      );
    }

    if (propertyServiceUrl) {
      try {
        const result = await requestServiceJson<RoomListResult>(
          "property-service",
          propertyServiceUrl,
          `/v1/rooms?${searchParams.toString()}`,
          { timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000) },
        );
        return successResponse(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Property Service", reason);
        }
        console.warn(
          `[BFF] Property Service unavailable (${reason}); using local rooms implementation.`,
        );
      }
    }

    const { rooms, total } = await roomService.getAllPaginated(
      filters, 
      page, 
      limit,
      neighborhoods.length > 0 ? neighborhoods : undefined,
      amenities.length > 0 ? amenities : undefined,
      roomTypes.length > 0 ? roomTypes : undefined,
      sortBy || undefined
    );

    return successResponse({ rooms, total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
