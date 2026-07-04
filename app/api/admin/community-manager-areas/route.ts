import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { communityManagerAreaService } from "@/lib/services/community-manager-area.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") {
      throw new ApiError(403, "Chỉ admin được quản lý khu vực phụ trách");
    }

    return successResponse(await communityManagerAreaService.listManagersWithAreas());
  } catch (error) {
    return handleApiError(error);
  }
}
