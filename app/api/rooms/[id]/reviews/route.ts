import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { getAuthUser, optionalAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { reviewCreateSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await optionalAuthUser(request);
    const reviews = await reviewService.getByRoom(id);
    const rating = await reviewService.getRoomAverageRating(id);
    const eligibility = user
      ? await reviewService.canUserReviewRoom(user.userId, id)
      : {
          canReview: false,
          reason: "Vui lòng đăng nhập để đánh giá phòng",
        };

    return successResponse({
      reviews,
      ...rating,
      eligibility,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const body = await request.json();
    const data = reviewCreateSchema.parse({
      ...body,
      roomId: id,
    });

    const review = await reviewService.create(user.userId, data);
    const reviews = await reviewService.getByRoom(id);
    const rating = await reviewService.getRoomAverageRating(id);
    const eligibility = await reviewService.canUserReviewRoom(user.userId, id);

    return successResponse({
      review,
      reviews,
      ...rating,
      eligibility,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
