import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

// PUT: /api/shared-resources/bookings/[bookingId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { bookingId } = await params;

    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);
    
    // Tìm thông tin lịch đặt hiện tại
    const booking = await prisma.resourceBooking.findUnique({
      where: { id: bookingId },
      include: { resource: true }
    });
    
    if (!booking) {
      throw new ApiError(404, "Không tìm thấy lịch đặt tài nguyên này");
    }
    if (status === "CANCELLED" && booking.userId === user.userId) {
      const updated = await prisma.resourceBooking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });
      return successResponse(updated);
    }
    const isHostOrAdmin = user.role === "HOST" || user.role === "ADMIN";
    if (isHostOrAdmin) {
      const updated = await prisma.resourceBooking.update({
        where: { id: bookingId },
        data: { status }
      });

      if (status === "APPROVED") {
        try {
          await NotificationService.sendPushNotificationToUser(
            booking.userId,
            "Yêu cầu thuê tài nguyên đã được duyệt",
            `Yêu cầu "${booking.title ?? "đặt lịch"}" cho tài nguyên đã được duyệt.`,
            {
              bookingId,
              resourceId: booking.resourceId,
              type: "RESOURCE_BOOKING_APPROVED",
            }
          );
        } catch (pushError) {
          console.error("Không thể gửi thông báo FCM cho tenant:", pushError);
        }
      }

      return successResponse(updated);
    }
    
    throw new ApiError(403, "Bạn không có quyền thay đổi trạng thái lịch đặt này");
  } catch (error) {
    return handleApiError(error);
  }
}
