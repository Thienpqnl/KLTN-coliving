import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyPropertyService } from "@/lib/microservices/property-bff";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const managerChecklistSchema = z.object({
  identityPassed: z.boolean(),
  ownershipPassed: z.boolean(),
  addressPassed: z.boolean(),
  imagesPassed: z.boolean(),
  detailsPassed: z.boolean(),
  facilityPassed: z.boolean(),
  safetyPassed: z.boolean(),
  legalOccupancyPassed: z.boolean(),
});

const managerReviewSchema = z.object({
  action: z.enum(["recommend_approval", "request_revision", "recommend_rejection"]),
  managerNote: z.string().max(2000).optional(),
  inspectionDate: z.string().optional(),
  inspectionImages: z.array(z.string().url()).optional(),
  checklist: managerChecklistSchema,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "COMMUNITY_MANAGER") {
      throw new ApiError(403, "Chỉ nhân viên quản lý cộng đồng được truy cập");
    }

    const { id } = await params;
    const proxied = await tryProxyPropertyService({
      identity: user,
      path: `/v1/community-manager/rooms/${id}`,
      fallbackMessage: "Không thể tải chi tiết hồ sơ xác minh",
    });
    if (proxied) return proxied;

    return successResponse(await roomVerificationService.getDetailForCommunityManager(id, user.userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "COMMUNITY_MANAGER") {
      throw new ApiError(403, "Chỉ nhân viên quản lý cộng đồng được xác minh hồ sơ");
    }

    const { id } = await params;
    const data = managerReviewSchema.parse(await request.json());
    const proxied = await tryProxyPropertyService({
      identity: user,
      path: `/v1/community-manager/rooms/${id}`,
      method: "PATCH",
      body: data,
      fallbackMessage: "Không thể cập nhật kết quả xác minh",
    });
    if (proxied) return proxied;

    return successResponse(await roomVerificationService.reviewByCommunityManager(id, user.userId, data));
  } catch (error) {
    return handleApiError(error);
  }
}
