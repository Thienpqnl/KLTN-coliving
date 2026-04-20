import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await roomService.getById(params.id);
    return successResponse(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const body = await request.json();
    const data = roomUpdateSchema.parse(body);

    const room = await roomService.update(params.id, data);
    return successResponse(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    await roomService.delete(params.id);
    return successResponse({ message: "Room deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
