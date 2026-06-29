import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { z } from "zod";

const resourceCreateSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên không được để trống"),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().default(120),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await getAuthUser(request);
    
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      throw new ApiError(403, "Chỉ chủ phòng mới có quyền thêm tài nguyên không gian chung");
    }
    
    const roomId = params.roomId;
    const body = await request.json();
    const data = resourceCreateSchema.parse(body);
    
    const newResource = await prisma.sharedResource.create({
      data: {
        roomId,
        ...data
      }
    });
    
    return successResponse(newResource, 201);
  } catch (error) {
    return handleApiError(error);
  }
}