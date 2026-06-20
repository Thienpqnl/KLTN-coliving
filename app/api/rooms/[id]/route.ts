import { NextRequest } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomUpdateSchema } from "@/lib/validation";
import { getAuthUser, optionalAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await roomService.getById(id);
    if (room.status !== "AVAILABLE") {
      const authUser = await optionalAuthUser(request);
      const canView = authUser && (authUser.role === "ADMIN" || room.ownerId === authUser.userId);
      if (!canView) throw new ApiError(404, "Room not found");
    }
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
    const authUser = await getAuthUser(request);

    const { id } = await params;
    
    const room = await roomService.getById(id);
    if (room.ownerId !== authUser.userId) {
      throw new ApiError(403, "Bạn chỉ có thể sửa phòng của mình");
    }
    if (room.status === "PENDING") throw new ApiError(409, "Phòng đang được admin xét duyệt nên chưa thể chỉnh sửa");

    const body = await request.json();
    const data = roomUpdateSchema.parse(body);

    const updatedRoom = await roomService.update(id, data);
    return successResponse(updatedRoom);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);

    const { id } = await params;
    
    const room = await roomService.getById(id);
    if (room.ownerId !== authUser.userId) {
      throw new ApiError(403, "Bạn chỉ có thể xóa phòng của mình");
    }

    await roomService.delete(id);
    return successResponse({ message: "Room deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
