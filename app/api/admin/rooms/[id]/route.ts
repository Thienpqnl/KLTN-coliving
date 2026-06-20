import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const checklistSchema = z.object({
  identityPassed: z.boolean(),
  ownershipPassed: z.boolean(),
  addressPassed: z.boolean(),
  imagesPassed: z.boolean(),
  detailsPassed: z.boolean(),
});

const reviewSchema = z.object({
  action: z.enum(["approve", "request_revision", "reject", "hide"]),
  reason: z.string().max(1000).optional(),
  adminNote: z.string().max(1000).optional(),
  checklist: checklistSchema.optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") throw new ApiError(403, "Chỉ admin được truy cập");
    const { id } = await params;
    return successResponse(await roomVerificationService.getDetailForAdmin(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") throw new ApiError(403, "Chỉ admin được xét duyệt");
    const { id } = await params;
    const data = reviewSchema.parse(await request.json());
    return successResponse(await roomVerificationService.review(id, user.userId, data));
  } catch (error) {
    return handleApiError(error);
  }
}
