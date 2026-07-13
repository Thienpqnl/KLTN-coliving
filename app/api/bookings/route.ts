import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { bookingCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/bookings",
      fallbackMessage: "Không thể tải danh sách booking",
    });
    if (proxied) return proxied;

    return successResponse(await bookingService.getUserBookings(user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const data = bookingCreateSchema.parse(body);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/bookings",
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể tạo booking",
    });
    if (proxied) return proxied;

    return successResponse(await bookingService.create(user.userId, data), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
