import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { reviewService } from "@/lib/services/review.service";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const updateReviewSchema = z.object({
  action: z.enum(["hide", "restore", "delete"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN") throw new ApiError(403, "Forbidden: Admin only");
    const { id } = await props.params;
    const body = await request.json();
    const { action, reason } = updateReviewSchema.parse(body);
    const status = action === "hide" ? "HIDDEN" : action === "restore" ? "VISIBLE" : "DELETED";
    const proxied = await tryProxyCommunityService({
      identity: payload,
      path: `/v1/admin/reviews/${id}`,
      method: "PATCH",
      body: { status, reason },
      fallbackMessage: "Không thể cập nhật trạng thái đánh giá",
    });
    if (proxied) {
      const responseBody = await proxied.json();
      return NextResponse.json(responseBody.data, { status: proxied.status });
    }
    const review = await reviewService.updateStatusByAdmin(id, payload.userId, status, reason);
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    console.error("ADMIN REVIEW ACTION ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
