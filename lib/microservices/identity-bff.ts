import { NextResponse } from "next/server";
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

type IdentityProxyOptions = {
  identity?: { userId: string; role?: string };
  path: string;
  method?: string;
  body?: unknown;
  fallbackMessage: string;
};

type ServiceErrorPayload = {
  error?: string;
  message?: string;
  details?: unknown;
};

export async function tryProxyIdentityServiceRaw({
  identity,
  path,
  method = "GET",
  body,
  fallbackMessage,
}: IdentityProxyOptions): Promise<NextResponse | null> {
  const identityServiceUrl = getServiceUrl("IDENTITY");
  if (!identityServiceUrl) {
    return isMicroserviceStrictMode()
      ? serviceUnavailableResponse("Identity Service", "IDENTITY_SERVICE_URL is not configured")
      : null;
  }

  const headers = new Headers();
  if (identity) {
    for (const [key, value] of serviceIdentityHeaders(identity)) {
      headers.set(key, value);
    }
  }
  if (body !== undefined) headers.set("content-type", "application/json");

  try {
    const data = await requestServiceJson<unknown>(
      "identity-service",
      identityServiceUrl,
      path,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    if (isForwardableServiceError(error) && error instanceof ServiceHttpError) {
      const payload = serviceErrorPayload(error, fallbackMessage) as ServiceErrorPayload;
      return NextResponse.json(
        {
          error: payload.error || payload.message || fallbackMessage,
          ...(payload.details === undefined ? {} : { details: payload.details }),
        },
        { status: error.status },
      );
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    if (isMicroserviceStrictMode()) {
      return serviceUnavailableResponse("Identity Service", reason);
    }
    console.warn(`[BFF] Identity Service unavailable (${reason}); using local identity implementation.`);
    return null;
  }
}
