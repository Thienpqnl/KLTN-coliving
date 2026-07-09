import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return handleApiError(new Error("Room ID is required"));
    }

    const proxied = await tryProxyRentalService({
      identity: { userId: "anonymous" },
      path: `/v1/room-bookings?${request.nextUrl.searchParams.toString()}`,
      fallbackMessage: "Không thể tải lịch booking của phòng",
    });
    if (proxied) return proxied;

    return successResponse(await bookingService.getRoomBookings(roomId));
  } catch (error) {
    return handleApiError(error);
  }
}
