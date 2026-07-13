import { NextRequest } from "next/server";
import { reviewService } from "@/lib/services/review.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const proxied = await tryProxyCommunityService({
      identity: { userId: "anonymous" },
      path: `/v1/reviews/${id}`,
      fallbackMessage: "Không thể tải đánh giá",
    });
    if (proxied) return proxied;
    return successResponse(await reviewService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/reviews/${id}`,
      method: "PUT",
      body: { rating, comment },
      fallbackMessage: "Không thể cập nhật đánh giá",
    });
    if (proxied) return proxied;
    return successResponse(await reviewService.update(id, user.userId, rating, comment));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/reviews/${id}`,
      method: "DELETE",
      fallbackMessage: "Không thể xóa đánh giá",
    });
    if (proxied) return proxied;
    await reviewService.delete(id, user.userId);
    return successResponse({ message: "Review deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
