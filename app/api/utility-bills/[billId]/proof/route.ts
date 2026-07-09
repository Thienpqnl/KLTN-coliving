import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const submitProofSchema = z.object({
  paymentProofUrl: z.string().url(),
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { billId } = await params;
    const data = submitProofSchema.parse(await request.json());
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/utility-bills/${billId}/proof`,
      method: "POST",
      body: data,
      fallbackMessage: "Không thể gửi minh chứng thanh toán",
    });
    if (proxied) {
      const payload = await proxied.json();
      await sendNotification(payload.data?.notification);
      return successResponse(payload.data?.bill ?? payload.data, proxied.status);
    }

    const bill = await prisma.utilityBill.findUnique({ where: { id: billId }, include: { contract: true } });
    if (!bill) return handleApiError(new Error("Utility bill not found"));
    if (bill.contract.renterId !== user.userId) return handleApiError(new Error("Only renter can submit payment proof"));
    if (bill.status === "PAID") throw new ApiError(409, "Hóa đơn này đã được xác nhận thanh toán, không thể gửi minh chứng mới");
    if (bill.paymentProofUrl) throw new ApiError(409, "Bạn đã gửi minh chứng cho hóa đơn này rồi");
    const updatedBill = await prisma.utilityBill.update({
      where: { id: billId },
      data: { paymentProofUrl: data.paymentProofUrl, paymentProofSubmittedAt: new Date(), status: "PENDING" },
    });
    await sendNotification({
      userId: bill.contract.hostId,
      title: "Có minh chứng thanh toán điện nước mới",
      body: `Người thuê đã gửi minh chứng thanh toán cho hóa đơn ${bill.month}/${bill.year}. Vui lòng kiểm tra.`,
      data: { billId, contractId: bill.contractId, type: "UTILITY_BILL_PROOF_SUBMITTED" },
    });
    return successResponse(updatedBill);
  } catch (error) {
    return handleApiError(error);
  }
}
