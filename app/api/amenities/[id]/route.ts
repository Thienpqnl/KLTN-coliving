import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { getServiceUrl, requestServiceJson } from "@/lib/microservices/service-client";
import { serviceIdentityHeaders } from "@/lib/microservices/bff-service";
import { amenityService } from "@/lib/services/amenity.service";
import { amenityUpdateSchema } from "@/lib/validation";

async function proxyAmenity(
  path: string,
  options: { identity?: { userId: string; role?: string }; method?: string; body?: unknown } = {},
) {
  const propertyServiceUrl = getServiceUrl("PROPERTY");
  if (!propertyServiceUrl) return null;

  const headers = new Headers();
  if (options.identity) {
    for (const [key, value] of serviceIdentityHeaders(options.identity)) {
      headers.set(key, value);
    }
  }
  if (options.body !== undefined) headers.set("content-type", "application/json");

  try {
    return await requestServiceJson<unknown>("property-service", propertyServiceUrl, path, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[BFF] Property Service amenity unavailable (${reason}); using local implementation.`);
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const proxied = await proxyAmenity(`/v1/amenities/${id}`);
    if (proxied) return successResponse(proxied);

    return successResponse(await amenityService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const data = amenityUpdateSchema.parse(await request.json());

    const proxied = await proxyAmenity(`/v1/amenities/${id}`, {
      identity: { userId: user.userId, role: user.role },
      method: "PUT",
      body: data,
    });
    if (proxied) return successResponse(proxied);

    return successResponse(await amenityService.update(id, data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;

    const proxied = await proxyAmenity(`/v1/amenities/${id}`, {
      identity: { userId: user.userId, role: user.role },
      method: "DELETE",
    });
    if (proxied) return successResponse(proxied);

    await amenityService.delete(id);
    return successResponse({ message: "Amenity deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
