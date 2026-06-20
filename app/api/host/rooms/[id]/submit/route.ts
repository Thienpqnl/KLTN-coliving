import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";
import { z } from "zod";

const declarationSchema = z.object({
  informationAccurateConfirmed: z.literal(true),
  legalResponsibilityAccepted: z.literal(true),
  verificationConsentAccepted: z.literal(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà được gửi xét duyệt");
    const { id } = await params;
    const declaration = declarationSchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    return successResponse(await roomVerificationService.submit(id, user.userId, {
      ...declaration,
      ipAddress,
      userAgent,
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
