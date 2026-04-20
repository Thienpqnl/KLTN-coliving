import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const review = await reviewService.getById(params.id);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const { rating, comment } = body;

    const review = await reviewService.update(params.id, user.userId, rating, comment);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    await reviewService.delete(params.id, user.userId);
    return successResponse({ message: "Review deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
