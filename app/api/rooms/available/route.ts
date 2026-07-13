import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { handleApiError, successResponse } from "@/lib/api-error";
import {
  getServiceUrl,
  requestServiceJson,
} from "@/lib/microservices/service-client";
import {
  isMicroserviceStrictMode,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return successResponse(
        { error: "startDate and endDate are required" },
        400
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return successResponse(
        { error: "Invalid date format" },
        400
      );
    }

    const propertyServiceUrl = getServiceUrl("PROPERTY");
    if (!propertyServiceUrl && isMicroserviceStrictMode()) {
      return serviceUnavailableResponse(
        "Property Service",
        "PROPERTY_SERVICE_URL is not configured",
      );
    }

    if (propertyServiceUrl) {
      try {
        const rooms = await requestServiceJson<unknown[]>(
          "property-service",
          propertyServiceUrl,
          `/v1/rooms/available?${searchParams.toString()}`,
          { timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000) },
        );
        return successResponse(rooms);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Property Service", reason);
        }
        console.warn(
          `[BFF] Property Service unavailable (${reason}); using local available-rooms implementation.`,
        );
      }
    }

    const rooms = await roomService.getAvailable(start, end);

    return successResponse(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}
