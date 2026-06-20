import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth"; // giả sử bạn có hàm này

export async function GET(request: NextRequest) {
  try {
    // 1. Lấy user từ token
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà được truy cập");

    // 2. Lấy ownerId từ user
    const ownerId = user.userId;

    // 3. Gọi service
    const rooms = await roomService.getAllByOwnerId(ownerId);

    return successResponse({ rooms });
  } catch (error) {
    return handleApiError(error);
  }
}
