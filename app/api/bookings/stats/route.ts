import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/bookings/stats?${request.nextUrl.searchParams.toString()}`,
      fallbackMessage: "Không thể tải thống kê booking",
    });
    if (proxied) return proxied;

    const roomId = request.nextUrl.searchParams.get("roomId");
    return successResponse(await bookingService.getStats(roomId || undefined));
  } catch (error) {
    return handleApiError(error);
  }
}
