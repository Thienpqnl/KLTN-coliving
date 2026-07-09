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
    const { id: occupancyId } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/host/occupancy/occupants/${occupancyId}`,
      fallbackMessage: "Không thể tải thông tin người cư trú",
    });
    if (proxied) return proxied;

    return successResponse(await occupancyService.getOccupantDetails(occupancyId));
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
    const { id: occupancyId } = await params;
    const body = await request.json();
    const { reason } = body;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/host/occupancy/occupants/${occupancyId}`,
      method: "PUT",
      body: { reason },
      fallbackMessage: "Không thể kết thúc cư trú",
    });
    if (proxied) return proxied;

    if (!reason) throw new Error("Termination reason is required");
    return successResponse(await occupancyService.terminateOccupancy(occupancyId, reason, user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
