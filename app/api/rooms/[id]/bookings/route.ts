import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookings = await bookingService.getRoomBookings(id);

    return successResponse(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}
