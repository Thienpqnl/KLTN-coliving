import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  getBearerAuthorization,
  isForwardableServiceError,
  isMicroserviceStrictMode,
  serviceErrorPayload,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  fullName: string;
  phone: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | Date | null;
  gender: string | null;
  birthDate: string | Date | null;
  address: string | null;
  avatarUrl: string | null;
  role: string;
};

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const authorization = getBearerAuthorization(request);
  if (!authorization) return noStoreJson({ message: "Unauthorized" }, 401);

  const identityServiceUrl = getServiceUrl("IDENTITY");
  if (!identityServiceUrl && isMicroserviceStrictMode()) {
    return serviceUnavailableResponse(
      "Identity Service",
      "IDENTITY_SERVICE_URL is not configured",
    );
  }

  if (identityServiceUrl) {
    try {
      const user = await requestServiceJson<CurrentUser>(
        "identity-service",
        identityServiceUrl,
        "/v1/auth/me",
        {
          headers: { authorization },
          timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
        },
      );
      return noStoreJson(user);
    } catch (error) {
      if (
        isForwardableServiceError(error) &&
        error instanceof ServiceHttpError
      ) {
        return noStoreJson(
          serviceErrorPayload(error, "Unauthorized"),
          error.status,
        );
      }

      const reason = error instanceof Error ? error.message : "Unknown error";
      if (isMicroserviceStrictMode()) {
        return serviceUnavailableResponse("Identity Service", reason);
      }
      console.warn(
        `[BFF] Identity Service unavailable (${reason}); using local auth/me implementation.`,
      );
    }
  }

  try {
    const authUser = await getAuthUser(request);
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        phone: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        gender: true,
        birthDate: true,
        address: true,
        avatarUrl: true,
        role: true,
      },
    });

    return user
      ? noStoreJson(user)
      : noStoreJson({ message: "User not found" }, 404);
  } catch (error) {
    if (!(error instanceof ApiError && error.statusCode === 401)) {
      console.error("Auth/me error:", error);
    }
    return noStoreJson({ message: "Unauthorized" }, 401);
  }
}
