import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { sharedSpaceService } from "@/lib/services/shared-space.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { messaging } from "@/lib/firebase-admin"; 

const createResourceSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên là bắt buộc"),
  description: z.string().optional(),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().int().positive().default(120),
  roomId: z.uuid("Room ID không hợp lệ"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const validatedData = createResourceSchema.parse(body);
        const newResource = await sharedSpaceService.createResource(user.userId, validatedData);
    try {
      const topicName = `user_${user.userId}`;
      const payload = {
        topic: topicName,
        notification: {
          title: "Tài nguyên mới đã được tạo",
          body: `Tài nguyên "${newResource.name}" đã sẵn sàng để sử dụng.`,
        },
        data: {
          resourceId: String(newResource.id),
          type: newResource.type,
        },
      };
      await messaging.send(payload);
    } catch (fcmError) {
      console.error("Không thể gửi thông báo FCM:", fcmError);
    }
    return successResponse(newResource, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
