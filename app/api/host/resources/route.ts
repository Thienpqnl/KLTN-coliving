import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { sharedSpaceService } from "@/lib/services/shared-space.service";
import { z } from "zod";
import { messaging } from "@/lib/firebase-admin";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const createResourceSchema = z.object({
  name: z.string().min(1, "Tên tài nguyên là bắt buộc"),
  description: z.string().optional(),
  type: z.enum(["EQUIPMENT", "SPACE"]),
  status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),
  requiresApproval: z.boolean().default(false),
  maxDurationMinutes: z.number().int().positive().default(120),
  roomId: z.uuid("Room ID không hợp lệ"),
});

async function sendTopicNotification(notification?: {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  if (!notification) return;
  try {
    await messaging.send({
      topic: notification.topic,
      notification: { title: notification.title, body: notification.body },
      data: notification.data,
    });
  } catch (error) {
    console.error("Không thể gửi thông báo FCM:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const data = createResourceSchema.parse(await request.json());
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: "/v1/host/resources",
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể tạo tài nguyên",
    });
    if (proxied) {
      const body = await proxied.json();
      await sendTopicNotification(body.data?.notification);
      return successResponse(body.data?.resource ?? body.data, proxied.status);
    }

    const newResource = await sharedSpaceService.createResource(user.userId, data);
    await sendTopicNotification({
      topic: `user_${user.userId}`,
      title: "Tài nguyên mới đã được tạo",
      body: `Tài nguyên "${newResource.name}" đã sẵn sàng để sử dụng.`,
      data: { resourceId: String(newResource.id), type: newResource.type },
    });
    return successResponse(newResource, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
