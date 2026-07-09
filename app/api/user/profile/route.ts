import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
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

const profileSelect = {
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
  createdAt: true,
} as const;

async function callIdentity<T>(
  request: NextRequest,
  method: "GET" | "PUT",
  body?: unknown,
) {
  const baseUrl = getServiceUrl("IDENTITY");
  const authorization = getBearerAuthorization(request);
  if (!baseUrl || !authorization) return null;

  return requestServiceJson<T>("identity-service", baseUrl, "/v1/profile", {
    method,
    headers: {
      authorization,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
  });
}

function forwardedError(error: unknown) {
  if (!(isForwardableServiceError(error) && error instanceof ServiceHttpError)) {
    return null;
  }
  return NextResponse.json(
    serviceErrorPayload(error, "Không thể xử lý hồ sơ"),
    { status: error.status },
  );
}

function missingIdentityServiceResponse() {
  return serviceUnavailableResponse(
    "Identity Service",
    "IDENTITY_SERVICE_URL is not configured",
  );
}

export async function GET(request: NextRequest) {
  if (!getBearerAuthorization(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    try {
      if (!getServiceUrl("IDENTITY") && isMicroserviceStrictMode()) {
        return missingIdentityServiceResponse();
      }
      const remote = await callIdentity<unknown>(request, "GET");
      if (remote) return NextResponse.json(remote);
    } catch (error) {
      const response = forwardedError(error);
      if (response) return response;
      const reason = error instanceof Error ? error.message : "Unknown error";
      if (isMicroserviceStrictMode()) {
        return serviceUnavailableResponse("Identity Service", reason);
      }
      console.warn("[BFF] Identity Service unavailable; using local profile GET.");
    }

    const user = await getAuthUser(request);
    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: profileSelect,
    });
    return profile
      ? NextResponse.json(profile)
      : NextResponse.json({ message: "User not found" }, { status: 404 });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  if (!getBearerAuthorization(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    try {
      if (!getServiceUrl("IDENTITY") && isMicroserviceStrictMode()) {
        return missingIdentityServiceResponse();
      }
      const remote = await callIdentity<unknown>(request, "PUT", body);
      if (remote) return NextResponse.json(remote);
    } catch (error) {
      const response = forwardedError(error);
      if (response) return response;
      const reason = error instanceof Error ? error.message : "Unknown error";
      if (isMicroserviceStrictMode()) {
        return serviceUnavailableResponse("Identity Service", reason);
      }
      console.warn("[BFF] Identity Service unavailable; using local profile PUT.");
    }

    const user = await getAuthUser(request);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!fullName) {
      return NextResponse.json(
        { message: "Họ và tên không được để trống" },
        { status: 400 },
      );
    }

    const profile = await prisma.user.update({
      where: { id: user.userId },
      data: {
        fullName,
        name: fullName,
        phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
        gender: typeof body.gender === "string" && body.gender.trim() ? body.gender.trim() : null,
        birthDate: typeof body.birthDate === "string" && body.birthDate ? new Date(body.birthDate) : null,
        address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
        ...(typeof body.avatarUrl === "string" && {
          avatarUrl: body.avatarUrl.trim() || null,
        }),
      },
      select: profileSelect,
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
