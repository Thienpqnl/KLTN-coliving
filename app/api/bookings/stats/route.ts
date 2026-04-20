import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    // Get stats (can filter by roomId if needed)
    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get("roomId");

    const stats = await bookingService.getStats(roomId || undefined);

    return successResponse(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
