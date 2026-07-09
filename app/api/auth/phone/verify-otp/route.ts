import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, errorResponse, handleApiError, successResponse } from "@/lib/api-error";
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

const schema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
});
const hashOtp = (code: string) =>
  crypto
    .createHash("sha256")
    .update(`${code}:${process.env.JWT_SECRET || "dev-secret"}`)
    .digest("hex");

export async function POST(request: NextRequest) {
  try {
    const authorization = getBearerAuthorization(request);
    if (!authorization) return errorResponse("Unauthorized", 401);
    const input = schema.parse(await request.json());

    const identityServiceUrl = getServiceUrl("IDENTITY");
    if (identityServiceUrl) {
      try {
        const result = await requestServiceJson<unknown>(
          "identity-service",
          identityServiceUrl,
          "/v1/auth/phone/verify-otp",
          {
            method: "POST",
            headers: { authorization, "content-type": "application/json" },
            body: JSON.stringify(input),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return successResponse(result);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          const payload = serviceErrorPayload(error, "Không thể xác minh OTP") as {
            message?: string;
          };
          return errorResponse(
            payload.message || "Không thể xác minh OTP",
            error.status,
          );
        }
        console.warn("[BFF] Identity Service unavailable; using local OTP verify.");
      }
    }

    const user = await getAuthUser(request);
    const phone = input.phone.replace(/\s+/g, "");
    const otp = await prisma.phoneOtp.findFirst({
      where: {
        userId: user.userId,
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new ApiError(400, "Mã OTP không tồn tại hoặc đã hết hạn");
    if (otp.attemptCount >= 5) {
      throw new ApiError(429, "Bạn đã nhập sai quá nhiều lần");
    }
    if (otp.codeHash !== hashOtp(input.code)) {
      await prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new ApiError(400, "Mã OTP không chính xác");
    }

    const verifiedAt = new Date();
    await prisma.$transaction([
      prisma.phoneOtp.update({ where: { id: otp.id }, data: { verifiedAt } }),
      prisma.user.update({
        where: { id: user.userId },
        data: { phone, phoneVerified: true, phoneVerifiedAt: verifiedAt },
      }),
    ]);
    return successResponse({
      phone,
      phoneVerified: true,
      phoneVerifiedAt: verifiedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
