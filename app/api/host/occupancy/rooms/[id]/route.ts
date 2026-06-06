import { NextRequest } from "next/server";
import { occupancyService } from "@/lib/services/occupancy.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

// GET /api/host/occupancy/rooms/[id] - Get all occupants of a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;

    const occupants = await occupancyService.getRoomOccupants(roomId, user.userId);
    return successResponse(occupants);
  } catch (error) {
    return handleApiError(error);
  }
}
