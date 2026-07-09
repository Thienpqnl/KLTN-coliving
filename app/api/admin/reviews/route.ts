import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { reviewService } from "@/lib/services/review.service";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const reviewStatuses = ["VISIBLE", "HIDDEN", "DELETED"] as const;

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN") throw new ApiError(403, "Forbidden: Admin only");
    const proxied = await tryProxyCommunityService({
      identity: payload,
      path: `/v1/admin/reviews?${request.nextUrl.searchParams.toString()}`,
      fallbackMessage: "Không thể tải danh sách đánh giá admin",
    });
    if (proxied) {
      const body = await proxied.json();
      return NextResponse.json(body.data, { status: proxied.status });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const statusParam = searchParams.get("status");
    const ratingParam = searchParams.get("rating");
    const search = searchParams.get("search") || undefined;
    const status = reviewStatuses.find((item) => item === statusParam);
    const rating = ratingParam ? Number.parseInt(ratingParam, 10) : undefined;
    const result = await reviewService.getForAdmin({
      page,
      limit,
      status,
      rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
      search,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("ADMIN REVIEWS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
