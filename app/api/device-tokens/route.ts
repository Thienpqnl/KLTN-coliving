import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const tokenSchema = z.object({
  token: z.string().min(1, "Token là bắt buộc"),
  os: z.enum(["android", "ios"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const { token, os } = tokenSchema.parse(body);
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: "/v1/device-tokens",
      method: "POST",
      body: { token, os },
      fallbackMessage: "Không thể đăng ký thiết bị",
    });
    if (proxied) return proxied;

    await NotificationService.saveToken(user.userId, token, os);
    return successResponse({ message: "Đăng ký thiết bị thành công" }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = z.object({ token: z.string() }).parse(body);
    const proxied = await tryProxyCommunityService({
      identity: { userId: "anonymous" },
      path: "/v1/device-tokens",
      method: "DELETE",
      body: { token },
      fallbackMessage: "Không thể xóa thiết bị",
    });
    if (proxied) return proxied;

    await NotificationService.removeToken(token);
    return successResponse({ message: "Xóa thiết bị thành công" }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
