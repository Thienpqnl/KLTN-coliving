import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await reviewService.getByRoom(params.id);
    const rating = await reviewService.getRoomAverageRating(params.id);

    return successResponse({
      reviews,
      ...rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
