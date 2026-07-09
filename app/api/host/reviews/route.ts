import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { reviewService } from "@/lib/services/review.service";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà mới có quyền xem đánh giá phòng");
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: "/v1/host/reviews",
      fallbackMessage: "Không thể tải đánh giá phòng của chủ nhà",
    });
    if (proxied) return proxied;
    return successResponse(await reviewService.getByHost(user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
