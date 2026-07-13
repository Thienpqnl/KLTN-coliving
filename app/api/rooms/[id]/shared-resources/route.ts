import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const resourceCreateSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên không được để trống"),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().default(120),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      throw new ApiError(403, "Chỉ chủ phòng mới có quyền thêm tài nguyên không gian chung");
    }
    const { id: roomId } = await params;
    const data = resourceCreateSchema.parse(await request.json());
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/rooms/${roomId}/shared-resources`,
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể thêm tài nguyên phòng",
    });
    if (proxied) return proxied;

    const newResource = await prisma.sharedResource.create({
      data: { roomId, ownerId: user.userId, status: "ACTIVE", description: "", ...data },
    });
    return successResponse(newResource, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
