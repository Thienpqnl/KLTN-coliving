import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { reviewCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    // Get user's reviews
    const reviews = await reviewService.getByUser(user.userId);

    return successResponse(reviews);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const data = reviewCreateSchema.parse(body);

    const review = await reviewService.create(user.userId, data);

    return successResponse(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
