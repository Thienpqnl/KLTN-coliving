import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id: resourceId } = await params;
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/host/resources/${resourceId}`,
      method: "DELETE",
      fallbackMessage: "Không thể xóa tài nguyên",
    });
    if (proxied) return proxied;

    const resource = await prisma.sharedResource.findUnique({
      where: { id: resourceId },
      include: { room: true },
    });
    if (!resource) return handleApiError(new Error("Tài nguyên không tồn tại"));
    if (resource.room.ownerId !== user.userId) {
      return handleApiError(new Error("Bạn không có quyền xóa tài nguyên này"));
    }
    await prisma.sharedResource.delete({ where: { id: resourceId } });
    return successResponse({ message: "Đã xóa tài nguyên thành công" });
  } catch (error) {
    return handleApiError(error);
  }
}
