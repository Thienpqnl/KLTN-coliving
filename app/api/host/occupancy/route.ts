import { NextRequest } from "next/server";
import { occupancyService } from "@/lib/services/occupancy.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

// POST /api/host/occupancy - Add a new occupant
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const { roomId, userId, notes } = body;

    if (!roomId || !userId) {
      throw new Error("roomId and userId are required");
    }

    // Verify room ownership
    const occupancy = await occupancyService.addOccupant(roomId, userId, notes);

    return successResponse(occupancy, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/host/occupancy/stats - Get occupancy statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      throw new Error("roomId is required");
    }

    const stats = await occupancyService.getOccupancyStats(roomId);

    return successResponse(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
