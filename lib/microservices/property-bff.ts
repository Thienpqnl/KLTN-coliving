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

type PropertyProxyOptions = {
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

export async function tryProxyPropertyService({
  identity,
  path,
  method = "GET",
  body,
  successStatus = 200,
  fallbackMessage,
}: PropertyProxyOptions): Promise<NextResponse | null> {
  const propertyServiceUrl = getServiceUrl("PROPERTY");
  if (!propertyServiceUrl) {
    return isMicroserviceStrictMode()
      ? serviceUnavailableResponse("Property Service", "PROPERTY_SERVICE_URL is not configured")
      : null;
  }

  try {
    const data = await requestServiceJson<unknown>(
      "property-service",
      propertyServiceUrl,
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
      return serviceUnavailableResponse("Property Service", reason);
    }
    console.warn(
      `[BFF] Property Service unavailable (${reason}); using local verification implementation.`,
    );
    return null;
  }
}

export async function tryProxyPropertyServiceRaw({
  identity,
  path,
  method = "GET",
  body,
  fallbackMessage,
}: PropertyProxyOptions): Promise<NextResponse | null> {
  const propertyServiceUrl = getServiceUrl("PROPERTY");
  if (!propertyServiceUrl) {
    return isMicroserviceStrictMode()
      ? serviceUnavailableResponse("Property Service", "PROPERTY_SERVICE_URL is not configured")
      : null;
  }

  try {
    const data = await requestServiceJson<unknown>(
      "property-service",
      propertyServiceUrl,
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
    return NextResponse.json(data);
  } catch (error) {
    if (isForwardableServiceError(error) && error instanceof ServiceHttpError) {
      const payload = serviceErrorPayload(error, fallbackMessage) as ServiceErrorPayload;
      return NextResponse.json(
        {
          error: payload.error || payload.message || fallbackMessage,
          ...(payload.errors === undefined ? {} : { errors: payload.errors }),
        },
        { status: error.status },
      );
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    if (isMicroserviceStrictMode()) {
      return serviceUnavailableResponse("Property Service", reason);
    }
    console.warn(
      `[BFF] Property Service unavailable (${reason}); using local implementation.`,
    );
    return null;
  }
}
