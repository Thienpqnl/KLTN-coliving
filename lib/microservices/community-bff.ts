import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-error";
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

type CommunityProxyOptions = {
  identity: { userId: string; role?: string };
  path: string;
  method?: string;
  body?: unknown;
  successStatus?: number;
  fallbackMessage: string;
};

type ServiceErrorPayload = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export async function tryProxyCommunityService({
  identity,
  path,
  method = "GET",
  body,
  successStatus = 200,
  fallbackMessage,
}: CommunityProxyOptions): Promise<NextResponse | null> {
  const communityServiceUrl = getServiceUrl("COMMUNITY");
  if (!communityServiceUrl) {
    return isMicroserviceStrictMode()
      ? serviceUnavailableResponse("Community Service", "COMMUNITY_SERVICE_URL is not configured")
      : null;
  }

  try {
    const data = await requestServiceJson<unknown>(
      "community-service",
      communityServiceUrl,
      path,
      {
        method,
        headers: {
          ...Object.fromEntries(serviceIdentityHeaders(identity)),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );
    return successResponse(data, successStatus);
  } catch (error) {
    if (isForwardableServiceError(error) && error instanceof ServiceHttpError) {
      const payload = serviceErrorPayload(error, fallbackMessage) as ServiceErrorPayload;
      return errorResponse(
        payload.error || payload.message || fallbackMessage,
        error.status,
        payload.errors,
      );
    }
    const reason = error instanceof Error ? error.message : "Unknown error";
    if (isMicroserviceStrictMode()) {
      return serviceUnavailableResponse("Community Service", reason);
    }
    console.warn(`[BFF] Community Service unavailable (${reason}); using local community implementation.`);
    return null;
  }
}
