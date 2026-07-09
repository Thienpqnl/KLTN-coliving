import { NextRequest } from "next/server";
import { occupancyService } from "@/lib/services/occupancy.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/host/occupancy/rooms/${roomId}`,
      fallbackMessage: "Không thể tải danh sách người thuê",
    });
    if (proxied) return proxied;

    return successResponse(await occupancyService.getRoomOccupants(roomId, user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
