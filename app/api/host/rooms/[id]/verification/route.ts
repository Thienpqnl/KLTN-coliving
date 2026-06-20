import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà được truy cập");
    const { id } = await params;
    return successResponse(await roomVerificationService.getForHost(id, user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
