import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { bookingCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    // Get user's bookings
    const bookings = await bookingService.getUserBookings(user.userId);

    return successResponse(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const data = bookingCreateSchema.parse(body);

    const booking = await bookingService.create(user.userId, data);

    return successResponse(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
