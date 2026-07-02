import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// PUT /api/utility-bills/[billId]/approve - Approve payment proof (host only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { billId } = await params;

    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: { contract: true },
    });

    if (!bill) {
      return handleApiError(new Error("Utility bill not found"));
    }

    // Only host can approve payment proof
    if (bill.contract.hostId !== user.userId && user.role !== 'ADMIN') {
      return handleApiError(new Error("Only host can approve payment proof"));
    }

    if (!bill.paymentProofUrl) {
      throw new ApiError(400, "Chưa có minh chứng thanh toán để duyệt");
    }

    if (bill.status === 'PAID') {
      throw new ApiError(409, "Hóa đơn này đã được xác nhận thanh toán trước đó");
    }

    const updatedBill = await prisma.utilityBill.update({
      where: { id: billId },
      data: {
        status: 'PAID',
        approvedAt: new Date(),
      },
    });

    return successResponse(updatedBill);
  } catch (error) {
    return handleApiError(error);
  }
}
