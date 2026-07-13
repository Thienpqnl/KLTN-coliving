import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyPropertyService } from "@/lib/microservices/property-bff";
import { communityManagerAreaService } from "@/lib/services/community-manager-area.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") {
      throw new ApiError(403, "Chi admin duoc quan ly khu vuc phu trach");
    }

    const proxied = await tryProxyPropertyService({
      identity: { userId: user.userId, role: user.role },
      path: "/v1/admin/community-manager-areas",
      fallbackMessage: "Khong the tai danh sach phan vung Community Manager",
    });
    if (proxied) return proxied;

    return successResponse(await communityManagerAreaService.listManagersWithAreas());
  } catch (error) {
    return handleApiError(error);
  }
}
