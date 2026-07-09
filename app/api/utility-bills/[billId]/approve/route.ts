import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

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
  { params }: { params: Promise<{ billId: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { billId } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/utility-bills/${billId}/approve`,
      method: "PUT",
      fallbackMessage: "Không thể duyệt minh chứng thanh toán",
    });
    if (proxied) {
      const payload = await proxied.json();
      await sendNotification(payload.data?.notification);
      return successResponse(payload.data?.bill ?? payload.data, proxied.status);
    }

    const bill = await prisma.utilityBill.findUnique({ where: { id: billId }, include: { contract: true } });
    if (!bill) return handleApiError(new Error("Utility bill not found"));
    if (bill.contract.hostId !== user.userId && user.role !== "ADMIN") return handleApiError(new Error("Only host can approve payment proof"));
    if (!bill.paymentProofUrl) throw new ApiError(400, "Chưa có minh chứng thanh toán để duyệt");
    if (bill.status === "PAID") throw new ApiError(409, "Hóa đơn này đã được xác nhận thanh toán trước đó");
    const updatedBill = await prisma.utilityBill.update({
      where: { id: billId },
      data: { status: "PAID", approvedAt: new Date() },
    });
    await sendNotification({
      userId: bill.contract.renterId,
      title: "Minh chứng thanh toán đã được duyệt",
      body: `Hóa đơn ${bill.month}/${bill.year} đã được xác nhận thanh toán. Cảm ơn bạn đã hoàn tất minh chứng.`,
      data: { billId, contractId: bill.contractId, type: "UTILITY_BILL_APPROVED" },
    });
    return successResponse(updatedBill);
  } catch (error) {
    return handleApiError(error);
  }
}
