import { NextRequest } from "next/server";
import { RoomStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyPropertyService } from "@/lib/microservices/property-bff";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const statuses = new Set(Object.values(RoomStatus));

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "COMMUNITY_MANAGER") {
      throw new ApiError(403, "Chỉ nhân viên quản lý cộng đồng được truy cập");
    }

    const proxied = await tryProxyPropertyService({
      identity: user,
      path: `/v1/community-manager/rooms?${request.nextUrl.searchParams.toString()}`,
      fallbackMessage: "Không thể tải danh sách phòng cần xác minh",
    });
    if (proxied) return proxied;

    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam && statuses.has(statusParam as RoomStatus) ? (statusParam as RoomStatus) : undefined;
    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));

    return successResponse(await roomVerificationService.getForCommunityManager({
      managerId: user.userId,
      status,
      search,
      page,
      limit,
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
