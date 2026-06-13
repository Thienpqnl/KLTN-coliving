import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { reviewService } from "@/lib/services/review.service";

const updateReviewSchema = z.object({
  action: z.enum(["hide", "restore", "delete"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN") {
      throw new ApiError(403, "Forbidden: Admin only");
    }

    const { id } = await props.params;
    const body = await request.json();
    const { action, reason } = updateReviewSchema.parse(body);
    const status =
      action === "hide" ? "HIDDEN" : action === "restore" ? "VISIBLE" : "DELETED";

    const review = await reviewService.updateStatusByAdmin(
      id,
      payload.userId,
      status,
      reason
    );

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("ADMIN REVIEW ACTION ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
