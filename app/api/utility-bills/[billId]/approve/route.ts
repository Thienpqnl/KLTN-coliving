import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
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
      return handleApiError(new Error("No payment proof submitted"));
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
