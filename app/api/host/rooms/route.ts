import { NextRequest } from "next/server";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { roomService } from "@/lib/services/room.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (user.role !== "HOST") {
      throw new ApiError(403, "Chỉ chủ nhà được truy cập danh sách phòng này");
    }

    const rooms = await roomService.getAllByOwnerId(user.userId);

    return successResponse(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}
