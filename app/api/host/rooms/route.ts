import { NextRequest } from "next/server";
import { ApiError, errorResponse, handleApiError, successResponse } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { roomService } from "@/lib/services/room.service";
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (user.role !== "HOST") {
      throw new ApiError(403, "Chỉ chủ nhà được truy cập danh sách phòng này");
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
          "/v1/host/rooms",
          {
            headers: serviceIdentityHeaders(user),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(rooms);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          const payload = serviceErrorPayload(error, "Không thể tải phòng") as {
            message?: string;
          };
          return errorResponse(payload.message || "Không thể tải phòng", error.status);
        }
        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Property Service", reason);
        }
        console.warn("[BFF] Property Service unavailable; using local host rooms.");
      }
    }

    const rooms = await roomService.getAllByOwnerId(user.userId);

    return successResponse(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}
