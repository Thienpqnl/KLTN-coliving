import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { reviewCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: "/v1/reviews",
      fallbackMessage: "Không thể tải đánh giá",
    });
    if (proxied) return proxied;
    return successResponse(await reviewService.getByUser(user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const data = reviewCreateSchema.parse(await request.json());
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: "/v1/reviews",
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể tạo đánh giá",
    });
    if (proxied) return proxied;
    return successResponse(await reviewService.create(user.userId, data), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
