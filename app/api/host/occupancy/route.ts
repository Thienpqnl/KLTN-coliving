import { NextRequest } from "next/server";
import { occupancyService } from "@/lib/services/occupancy.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const { roomId, userId, notes } = body;

    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/host/occupancy",
      method: "POST",
      body: { roomId, userId, notes },
      successStatus: 201,
      fallbackMessage: "Không thể thêm người thuê vào phòng",
    });
    if (proxied) return proxied;

    if (!roomId || !userId) throw new Error("roomId and userId are required");
    return successResponse(await occupancyService.addOccupant(roomId, userId, notes, {
      userId: user.userId,
      role: user.role ?? "CUSTOMER",
    }), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/host/occupancy?${request.nextUrl.searchParams.toString()}`,
      fallbackMessage: "Không thể tải thống kê cư trú",
    });
    if (proxied) return proxied;

    const roomId = request.nextUrl.searchParams.get("roomId");
    if (!roomId) throw new Error("roomId is required");

    return successResponse(await occupancyService.getOccupancyStats(roomId));
  } catch (error) {
    return handleApiError(error);
  }
}
