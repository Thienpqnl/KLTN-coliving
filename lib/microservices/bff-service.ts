import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ServiceHttpError } from "./service-client";

export function getBearerAuthorization(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization;

  const token = request.cookies.get("token")?.value;
  return token ? `Bearer ${token}` : null;
}

export function serviceIdentityHeaders(identity: {
  userId: string;
  role?: string;
}) {
  const headers = new Headers();
  headers.set("x-user-id", identity.userId);
  if (identity.role) headers.set("x-user-role", identity.role);
  return headers;
}

export function isInternalServiceAuthFailure(error: ServiceHttpError) {
  return (
    error.payload !== null &&
    typeof error.payload === "object" &&
    "error" in error.payload &&
    error.payload.error === "UNAUTHORIZED_SERVICE"
  );
}

export function isForwardableServiceError(error: unknown) {
  return (
    error instanceof ServiceHttpError &&
    error.status < 500 &&
    !isInternalServiceAuthFailure(error)
  );
}

export function serviceErrorPayload(
  error: ServiceHttpError,
  fallbackMessage: string,
) {
  return error.payload !== null && typeof error.payload === "object"
    ? error.payload
    : { message: fallbackMessage };
}

export function isMicroserviceStrictMode() {
  return process.env.MICROSERVICE_STRICT !== "false";
}

export function serviceUnavailableResponse(serviceName: string, reason: string) {
  return NextResponse.json(
    {
      error: "SERVICE_UNAVAILABLE",
      message: `${serviceName} chưa sẵn sàng. Vui lòng khởi động service này để chạy đúng kiến trúc microservice.`,
      reason,
    },
    { status: 503 },
  );
}
