import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { bookingUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/bookings/${id}`,
      fallbackMessage: "Không thể tải booking",
    });
    if (proxied) return proxied;

    return successResponse(await bookingService.getById(id, user.userId));
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
    const { id } = await params;
    const body = await request.json();
    const data = bookingUpdateSchema.parse(body);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/bookings/${id}`,
      method: "PUT",
      body: data,
      fallbackMessage: "Không thể cập nhật booking",
    });
    if (proxied) return proxied;

    const booking = data.status
      ? await bookingService.updateStatus(id, data.status, {
          userId: user.userId,
          role: user.role ?? "CUSTOMER",
        })
      : await bookingService.getById(id, user.userId);

    return successResponse(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/bookings/${id}`,
      method: "DELETE",
      fallbackMessage: "Không thể hủy booking",
    });
    if (proxied) return proxied;

    await bookingService.cancel(id, user.userId);
    return successResponse({ message: "Booking cancelled successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
