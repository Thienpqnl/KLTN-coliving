import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

async function sendNotification(notification?: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  if (!notification) return;
  try {
    await NotificationService.sendPushNotificationToUser(
      notification.userId,
      notification.title,
      notification.body,
      notification.data,
    );
  } catch (error) {
    console.error("Không thể gửi thông báo FCM:", error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { bookingId } = await params;
    const { status } = updateStatusSchema.parse(await request.json());
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/shared-resources/bookings/${bookingId}`,
      method: "PUT",
      body: { status },
      fallbackMessage: "Không thể cập nhật lịch đặt tài nguyên",
    });
    if (proxied) {
      const body = await proxied.json();
      await sendNotification(body.data?.notification);
      return successResponse(body.data?.booking ?? body.data, proxied.status);
    }

    const booking = await prisma.resourceBooking.findUnique({
      where: { id: bookingId },
      include: { resource: true },
    });
    if (!booking) throw new ApiError(404, "Không tìm thấy lịch đặt tài nguyên này");
    if (status === "CANCELLED" && booking.userId === user.userId) {
      const updated = await prisma.resourceBooking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
      return successResponse(updated);
    }
    const isHostOrAdmin = user.role === "HOST" || user.role === "ADMIN";
    if (!isHostOrAdmin) throw new ApiError(403, "Bạn không có quyền thay đổi trạng thái lịch đặt này");
    const updated = await prisma.resourceBooking.update({ where: { id: bookingId }, data: { status } });
    if (status === "APPROVED") {
      await sendNotification({
        userId: booking.userId,
        title: "Yêu cầu thuê tài nguyên đã được duyệt",
        body: `Yêu cầu "${booking.title ?? "đặt lịch"}" cho tài nguyên đã được duyệt.`,
        data: { bookingId, resourceId: booking.resourceId, type: "RESOURCE_BOOKING_APPROVED" },
      });
    }
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
