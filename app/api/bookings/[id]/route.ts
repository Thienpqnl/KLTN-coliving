import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { bookingUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    const { id } = await params;
    const booking = await bookingService.getById(id, user.userId);
    return successResponse(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    const { id } = await params;
    const body = await request.json();
    const data = bookingUpdateSchema.parse(body);

    let booking;
    if (data.status) {
      booking = await bookingService.updateStatus(id, data.status);
    } else {
      booking = await bookingService.getById(id, user.userId);
    }

    return successResponse(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);

    const { id } = await params;
    await bookingService.cancel(id, user.userId);
    return successResponse({ message: "Booking cancelled successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
