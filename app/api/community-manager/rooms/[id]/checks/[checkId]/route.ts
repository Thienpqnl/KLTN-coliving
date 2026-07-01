import { NextRequest } from "next/server";
import { VerificationCheckStatus } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const updateCheckSchema = z.object({
  status: z.nativeEnum(VerificationCheckStatus),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checkId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "COMMUNITY_MANAGER") {
      throw new ApiError(403, "Chỉ nhân viên quản lý cộng đồng được cập nhật đối khớp hồ sơ");
    }

    const { id, checkId } = await params;
    const data = updateCheckSchema.parse(await request.json());

    return successResponse(await roomVerificationService.updateVerificationCheck(id, checkId, user.userId, data));
  } catch (error) {
    return handleApiError(error);
  }
}
