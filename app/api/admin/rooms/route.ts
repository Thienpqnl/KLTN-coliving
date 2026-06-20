import { NextRequest } from "next/server";
import { RoomStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const statuses = new Set(Object.values(RoomStatus));

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") throw new ApiError(403, "Chỉ admin được truy cập");

    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam && statuses.has(statusParam as RoomStatus) ? (statusParam as RoomStatus) : undefined;
    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));

    return successResponse(await roomVerificationService.getForAdmin({ status, search, page, limit }));
  } catch (error) {
    return handleApiError(error);
  }
}
