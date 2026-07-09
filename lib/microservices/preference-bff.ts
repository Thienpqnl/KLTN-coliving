import { NextResponse } from "next/server";
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

type PreferenceProxyOptions = {
  identity: { userId: string; role?: string };
  path: string;
  method?: string;
  body?: unknown;
  fallbackMessage: string;
};

type ServiceErrorPayload = {
  error?: string;
  message?: string;
};

export async function tryProxyPreferenceServiceRaw({
  identity,
  path,
  method = "GET",
  body,
  fallbackMessage,
}: PreferenceProxyOptions): Promise<NextResponse | null> {
  const preferenceServiceUrl = getServiceUrl("PREFERENCE");
  if (!preferenceServiceUrl) return null;

  try {
    const data = await requestServiceJson<unknown>(
      "preference-service",
      preferenceServiceUrl,
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
        { error: payload.error || payload.message || fallbackMessage },
        { status: error.status },
      );
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[BFF] Preference Service unavailable (${reason}); using local preference implementation.`);
    return null;
  }
}
