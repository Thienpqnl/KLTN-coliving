import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getServiceUrl, requestServiceJson } from "@/lib/microservices/service-client";
import { serviceIdentityHeaders } from "@/lib/microservices/bff-service";
import { roomService } from "@/lib/services/room.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") {
      throw new ApiError(403, "Chi chu nha duoc truy cap");
    }

    const propertyServiceUrl = getServiceUrl("PROPERTY");
    if (propertyServiceUrl) {
      try {
        const rooms = await requestServiceJson<unknown[]>(
          "property-service",
          propertyServiceUrl,
          "/v1/host/rooms",
          {
            headers: serviceIdentityHeaders({ userId: user.userId, role: user.role }),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse({ rooms });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.warn(`[BFF] Property Service unavailable (${reason}); using local rooms-upload implementation.`);
      }
    }

    const rooms = await roomService.getAllByOwnerId(user.userId);
    return successResponse({ rooms });
  } catch (error) {
    return handleApiError(error);
  }
}
