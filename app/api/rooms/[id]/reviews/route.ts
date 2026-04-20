import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviews = await reviewService.getByRoom(id);
    const rating = await reviewService.getRoomAverageRating(id);

    return successResponse({
      reviews,
      ...rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
