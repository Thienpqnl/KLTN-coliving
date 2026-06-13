import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { reviewService } from "@/lib/services/review.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (user.role !== "HOST") {
      throw new ApiError(403, "Chỉ chủ nhà mới có quyền xem đánh giá phòng");
    }

    const result = await reviewService.getByHost(user.userId);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
