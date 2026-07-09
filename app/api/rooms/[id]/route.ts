import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomUpdateSchema } from "@/lib/validation";
import { getAuthUser, optionalAuthUser } from "@/lib/auth";
import {
  ApiError,
  errorResponse,
  handleApiError,
  successResponse,
} from "@/lib/api-error";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  isForwardableServiceError,
  serviceErrorPayload,
  serviceIdentityHeaders,
} from "@/lib/microservices/bff-service";

function propertyError(error: unknown, fallbackMessage: string) {
  if (!(isForwardableServiceError(error) && error instanceof ServiceHttpError)) {
    return null;
  }
  const payload = serviceErrorPayload(error, fallbackMessage) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  return errorResponse(
    payload.message || fallbackMessage,
    error.status,
    payload.errors,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await optionalAuthUser(request);
    const propertyServiceUrl = getServiceUrl("PROPERTY");

    if (propertyServiceUrl) {
      try {
        const headers = authUser
          ? serviceIdentityHeaders(authUser)
          : new Headers();
        const room = await requestServiceJson<unknown>(
          "property-service",
          propertyServiceUrl,
          `/v1/rooms/${encodeURIComponent(id)}`,
          {
            headers,
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(room);
      } catch (error) {
        const response = propertyError(error, "Không tìm thấy phòng");
        if (response) return response;
        console.warn("[BFF] Property Service unavailable; using local room detail.");
      }
    }

    const room = await roomService.getById(id);
    if (room.status !== "AVAILABLE") {
      const canView =
        authUser &&
        (authUser.role === "ADMIN" || room.ownerId === authUser.userId);
      if (!canView) throw new ApiError(404, "Room not found");
    }
    return successResponse(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    const data = roomUpdateSchema.parse(await request.json());
    const propertyServiceUrl = getServiceUrl("PROPERTY");

    if (propertyServiceUrl) {
      try {
        const headers = serviceIdentityHeaders(authUser);
        headers.set("content-type", "application/json");
        const room = await requestServiceJson<unknown>(
          "property-service",
          propertyServiceUrl,
          `/v1/rooms/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(data),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(room);
      } catch (error) {
        const response = propertyError(error, "Không thể cập nhật phòng");
        if (response) return response;
        console.warn("[BFF] Property Service unavailable; using local room update.");
      }
    }

    const room = await roomService.getById(id);
    if (room.ownerId !== authUser.userId) {
      throw new ApiError(403, "Bạn chỉ có thể sửa phòng của mình");
    }
    if (room.status === "PENDING") {
      throw new ApiError(
        409,
        "Phòng đang được admin xét duyệt nên chưa thể chỉnh sửa",
      );
    }
    return successResponse(await roomService.update(id, data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    const propertyServiceUrl = getServiceUrl("PROPERTY");

    if (propertyServiceUrl) {
      try {
        const result = await requestServiceJson<unknown>(
          "property-service",
          propertyServiceUrl,
          `/v1/rooms/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: serviceIdentityHeaders(authUser),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(result);
      } catch (error) {
        const response = propertyError(error, "Không thể xóa phòng");
        if (response) return response;
        console.warn("[BFF] Property Service unavailable; using local room deletion.");
      }
    }

    const room = await roomService.getById(id);
    if (room.ownerId !== authUser.userId) {
      throw new ApiError(403, "Bạn chỉ có thể xóa phòng của mình");
    }
    await roomService.delete(id);
    return successResponse({ message: "Room deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
