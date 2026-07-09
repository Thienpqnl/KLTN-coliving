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
  serviceErrorPayload,
} from "@/lib/microservices/bff-service";

type RegisterResult = {
  user: { id: string; email: string; fullName: string; role: string };
  token: string;
};

class LocalRegisterError extends Error {}

function registerResponse(result: RegisterResult) {
  const response = NextResponse.json(result);
  response.cookies.set("token", result.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

async function registerLocally(input: {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}): Promise<RegisterResult> {
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new LocalRegisterError("Email này đã được sử dụng");
  }

  const allowedRoles = ["HOST", "CUSTOMER", "COMMUNITY_MANAGER"];
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: await bcrypt.hash(input.password, 10),
      name: input.fullName,
      fullName: input.fullName,
      role: allowedRoles.includes(input.role || "")
        ? (input.role as "HOST" | "CUSTOMER" | "COMMUNITY_MANAGER")
        : "CUSTOMER",
    },
  });

  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    token: jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = {
      email: String(body?.email || "").trim(),
      password: body?.password as string,
      fullName: String(body?.fullName || "").trim(),
      role: body?.role as string | undefined,
    };

    if (!input.email || !input.password || !input.fullName) {
      return NextResponse.json(
        { message: "Vui lòng nhập đầy đủ thông tin đăng ký" },
        { status: 400 },
      );
    }

    const identityServiceUrl = getServiceUrl("IDENTITY");
    if (identityServiceUrl) {
      try {
        const result = await requestServiceJson<RegisterResult>(
          "identity-service",
          identityServiceUrl,
          "/v1/auth/register",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return registerResponse(result);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          return NextResponse.json(
            serviceErrorPayload(error, "Không thể đăng ký"),
            { status: error.status },
          );
        }
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[BFF] Identity Service unavailable (${reason}); using local register implementation.`,
        );
      }
    }

    return registerResponse(await registerLocally(input));
  } catch (error: unknown) {
    if (error instanceof LocalRegisterError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json(
      {
        message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
