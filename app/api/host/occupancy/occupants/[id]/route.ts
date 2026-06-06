import { NextRequest } from "next/server";
import { occupancyService } from "@/lib/services/occupancy.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

// GET /api/host/occupancy/occupants/[id] - Get occupant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: occupancyId } = await params;

    const occupant = await occupancyService.getOccupantDetails(occupancyId);

    return successResponse(occupant);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/host/occupancy/occupants/[id] - Terminate occupancy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: occupancyId } = await params;

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      throw new Error("Termination reason is required");
    }

    const updated = await occupancyService.terminateOccupancy(
      occupancyId,
      reason,
      user.userId
    );

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
