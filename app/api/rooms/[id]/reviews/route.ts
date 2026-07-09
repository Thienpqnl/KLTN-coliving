import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { getAuthUser, optionalAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { reviewCreateSchema } from "@/lib/validation";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await optionalAuthUser(request);
    const proxied = await tryProxyCommunityService({
      identity: user || { userId: "anonymous" },
      path: `/v1/rooms/${id}/reviews`,
      fallbackMessage: "Không thể tải đánh giá phòng",
    });
    if (proxied) return proxied;

    const reviews = await reviewService.getByRoom(id);
    const rating = await reviewService.getRoomAverageRating(id);
    const eligibility = user
      ? await reviewService.canUserReviewRoom(user.userId, id)
      : { canReview: false, reason: "Vui lòng đăng nhập để đánh giá phòng" };
    return successResponse({ reviews, ...rating, eligibility });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const data = reviewCreateSchema.parse({ ...(await request.json()), roomId: id });
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/rooms/${id}/reviews`,
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể tạo đánh giá phòng",
    });
    if (proxied) return proxied;

    const review = await reviewService.create(user.userId, data);
    const reviews = await reviewService.getByRoom(id);
    const rating = await reviewService.getRoomAverageRating(id);
    const eligibility = await reviewService.canUserReviewRoom(user.userId, id);
    return successResponse({ review, reviews, ...rating, eligibility }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
