import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { getServiceUrl, requestServiceJson } from "@/lib/microservices/service-client";
import { serviceIdentityHeaders } from "@/lib/microservices/bff-service";
import { amenityService } from "@/lib/services/amenity.service";
import { amenityCreateSchema } from "@/lib/validation";

async function proxyAmenities(
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
    console.warn(`[BFF] Property Service amenities unavailable (${reason}); using local implementation.`);
    return null;
  }
}

export async function GET() {
  try {
    const proxied = await proxyAmenities("/v1/amenities");
    if (proxied) return successResponse(proxied);

    return successResponse(await amenityService.getAll());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const data = amenityCreateSchema.parse(await request.json());

    const proxied = await proxyAmenities("/v1/amenities", {
      identity: { userId: user.userId, role: user.role },
      method: "POST",
      body: data,
    });
    if (proxied) return successResponse(proxied, 201);

    return successResponse(await amenityService.create(data), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
