import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  isForwardableServiceError,
  isMicroserviceStrictMode,
  serviceErrorPayload,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

type LoginResult = {
  token: string;
  user: { id: string; email: string; role: string };
};

async function loginLocally(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new LocalLoginError("Email không tồn tại");
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new LocalLoginError("Mật khẩu không chính xác");
  }

  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");

  return {
    token: jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    ),
    user: { id: user.id, email: user.email, role: user.role },
  };
}

class LocalLoginError extends Error {}

function loginResponse(result: LoginResult) {
  const response = NextResponse.json(result);
  response.cookies.set("token", result.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Vui lòng nhập đầy đủ email và mật khẩu" },
        { status: 400 },
      );
    }

    const identityServiceUrl = getServiceUrl("IDENTITY");
    if (!identityServiceUrl && isMicroserviceStrictMode()) {
      return serviceUnavailableResponse(
        "Identity Service",
        "IDENTITY_SERVICE_URL is not configured",
      );
    }

    if (identityServiceUrl) {
      try {
        const result = await requestServiceJson<LoginResult>(
          "identity-service",
          identityServiceUrl,
          "/v1/auth/login",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return loginResponse(result);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          return NextResponse.json(
            serviceErrorPayload(error, "Không thể đăng nhập"),
            { status: error.status },
          );
        }

        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Identity Service", reason);
        }
        console.warn(
          `[BFF] Identity Service unavailable (${reason}); using local login implementation.`,
        );
      }
    }

    return loginResponse(await loginLocally(email, password));
  } catch (error: unknown) {
    if (error instanceof LocalLoginError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Login error:", error);
    return NextResponse.json(
      {
        message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
