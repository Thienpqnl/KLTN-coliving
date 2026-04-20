import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookings = await bookingService.getRoomBookings(params.id);

    return successResponse(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}
