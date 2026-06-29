import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: resourceId } = await params;

    // Verify the resource belongs to a room owned by this host
    const resource = await prisma.sharedResource.findUnique({
      where: { id: resourceId },
      include: { room: true },
    });

    if (!resource) {
      return handleApiError(new Error("Tài nguyên không tồn tại"));
    }

    if (resource.room.ownerId !== user.userId) {
      return handleApiError(new Error("Bạn không có quyền xóa tài nguyên này"));
    }

    await prisma.sharedResource.delete({
      where: { id: resourceId },
    });

    return successResponse({ message: "Đã xóa tài nguyên thành công" });
  } catch (error) {
    return handleApiError(error);
  }
}
