import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  getBearerAuthorization,
  isForwardableServiceError,
  serviceErrorPayload,
} from "@/lib/microservices/bff-service";

const schema = z.object({ phone: z.string().min(9).max(20) });
const hashOtp = (code: string) =>
  crypto
    .createHash("sha256")
    .update(`${code}:${process.env.JWT_SECRET || "dev-secret"}`)
    .digest("hex");

export async function POST(request: NextRequest) {
  try {
    const authorization = getBearerAuthorization(request);
    if (!authorization) return errorResponse("Unauthorized", 401);
    const { phone } = schema.parse(await request.json());

    const identityServiceUrl = getServiceUrl("IDENTITY");
    if (identityServiceUrl) {
      try {
        const result = await requestServiceJson<{
          message: string;
          devOtp?: string;
        }>("identity-service", identityServiceUrl, "/v1/auth/phone/request-otp", {
          method: "POST",
          headers: { authorization, "content-type": "application/json" },
          body: JSON.stringify({ phone }),
          timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
        });
        return successResponse(result);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          const payload = serviceErrorPayload(error, "Không thể gửi OTP") as {
            message?: string;
          };
          return errorResponse(payload.message || "Không thể gửi OTP", error.status);
        }
        console.warn("[BFF] Identity Service unavailable; using local OTP request.");
      }
    }

    const user = await getAuthUser(request);
    const normalizedPhone = phone.replace(/\s+/g, "");
    const code = String(crypto.randomInt(100000, 999999));
    await prisma.phoneOtp.create({
      data: {
        userId: user.userId,
        phone: normalizedPhone,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    return successResponse({
      message: "Đã gửi mã OTP đến số điện thoại",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
