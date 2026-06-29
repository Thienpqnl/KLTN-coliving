import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const requestOtpSchema = z.object({
  phone: z.string().min(9).max(20),
});

const hashOtp = (code: string) =>
  crypto.createHash("sha256").update(`${code}:${process.env.JWT_SECRET || "dev-secret"}`).digest("hex");

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { phone } = requestOtpSchema.parse(await request.json());
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

    // Production should send the code through an SMS provider.
    return successResponse({
      message: "Đã gửi mã OTP đến số điện thoại",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
