import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await roomService.getById(id);
    return successResponse(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const { id } = await params;
    const body = await request.json();
    const data = roomUpdateSchema.parse(body);

    const room = await roomService.update(id, data);
    return successResponse(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const { id } = await params;

    await roomService.delete(id);
    return successResponse({ message: "Room deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
