import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";

const submitProofSchema = z.object({
  paymentProofUrl: z.string().url(),
});

// POST /api/utility-bills/[billId]/proof - Submit payment proof (tenant only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { billId } = await params;
    const body = await request.json();
    const data = submitProofSchema.parse(body);

    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: { contract: true },
    });

    if (!bill) {
      return handleApiError(new Error("Utility bill not found"));
    }

    // Only renter can submit payment proof
    if (bill.contract.renterId !== user.userId) {
      return handleApiError(new Error("Only renter can submit payment proof"));
    }

    if (bill.status === 'PAID') {
      throw new ApiError(409, "Hóa đơn này đã được xác nhận thanh toán, không thể gửi minh chứng mới");
    }

    if (bill.paymentProofUrl) {
      throw new ApiError(409, "Bạn đã gửi minh chứng cho hóa đơn này rồi");
    }

    const updatedBill = await prisma.utilityBill.update({
      where: { id: billId },
      data: {
        paymentProofUrl: data.paymentProofUrl,
        paymentProofSubmittedAt: new Date(),
        status: 'PENDING',
      },
    });

    try {
      await NotificationService.sendPushNotificationToUser(
        bill.contract.hostId,
        "Có minh chứng thanh toán điện nước mới",
        `Người thuê đã gửi minh chứng thanh toán cho hóa đơn ${bill.month}/${bill.year}. Vui lòng kiểm tra.`,
        {
          billId,
          contractId: bill.contractId,
          type: "UTILITY_BILL_PROOF_SUBMITTED",
        }
      );
    } catch (pushError) {
      console.error("Không thể gửi thông báo FCM cho host:", pushError);
    }

    return successResponse(updatedBill);
  } catch (error) {
    return handleApiError(error);
  }
}
