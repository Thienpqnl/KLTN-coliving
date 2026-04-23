import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await reviewService.getById(id);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    const review = await reviewService.update(id, user.userId, rating, comment);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    const { id } = await params;
    await reviewService.delete(id, user.userId);
    return successResponse({ message: "Review deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
