import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return handleApiError(new Error("Room ID is required"));
    }

    const bookings = await bookingService.getRoomBookings(roomId);
    return successResponse(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}
