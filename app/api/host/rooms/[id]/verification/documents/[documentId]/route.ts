import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyPropertyService } from "@/lib/microservices/property-bff";
import { roomVerificationService } from "@/lib/services/room-verification.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà được truy cập");
    const { id, documentId } = await params;

    const proxied = await tryProxyPropertyService({
      identity: user,
      path: `/v1/host/rooms/${id}/verification/documents/${documentId}`,
      method: "DELETE",
      fallbackMessage: "Không thể xóa minh chứng phòng",
    });
    if (proxied) return proxied;

    return successResponse(await roomVerificationService.deleteDocument(id, documentId, user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
