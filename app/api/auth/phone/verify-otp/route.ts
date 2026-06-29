import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
});

const hashOtp = (code: string) =>
  crypto.createHash("sha256").update(`${code}:${process.env.JWT_SECRET || "dev-secret"}`).digest("hex");

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { phone, code } = verifyOtpSchema.parse(await request.json());
    const normalizedPhone = phone.replace(/\s+/g, "");

    const otp = await prisma.phoneOtp.findFirst({
      where: {
        userId: user.userId,
        phone: normalizedPhone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) throw new ApiError(400, "Mã OTP không tồn tại hoặc đã hết hạn");
    if (otp.attemptCount >= 5) throw new ApiError(429, "Bạn đã nhập sai quá nhiều lần");

    if (otp.codeHash !== hashOtp(code)) {
      await prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new ApiError(400, "Mã OTP không chính xác");
    }

    const verifiedAt = new Date();
    await prisma.$transaction([
      prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { verifiedAt },
      }),
      prisma.user.update({
        where: { id: user.userId },
        data: {
          phone: normalizedPhone,
          phoneVerified: true,
          phoneVerifiedAt: verifiedAt,
        },
      }),
    ]);

    return successResponse({ phone: normalizedPhone, phoneVerified: true, phoneVerifiedAt: verifiedAt });
  } catch (error) {
    return handleApiError(error);
  }
}
