import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return successResponse(
        { error: "startDate and endDate are required" },
        400
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return successResponse(
        { error: "Invalid date format" },
        400
      );
    }

    const rooms = await roomService.getAvailable(start, end);

    return successResponse(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}
