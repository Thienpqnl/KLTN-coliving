import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import NotificationService from "@/lib/services/notification.service";
import { z } from "zod";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const createBillSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  previousReading: z.number().optional(),
  currentReading: z.number().optional(),
  electricityUsage: z.number().optional(),
  waterUsage: z.number().optional(),
  notes: z.string().optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id: contractId } = await params;
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/contracts/${contractId}/utility-bills`,
      fallbackMessage: "Không thể tải hóa đơn điện nước",
    });
    if (proxied) return proxied;

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return handleApiError(new Error("Contract not found"));
    if (contract.hostId !== user.userId && contract.renterId !== user.userId && user.role !== "ADMIN") {
      return handleApiError(new Error("Unauthorized"));
    }
    const bills = await prisma.utilityBill.findMany({
      where: { contractId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return successResponse(bills);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id: contractId } = await params;
    const data = createBillSchema.parse(await request.json());
    const proxied = await tryProxyRentalService({
      identity: user,
      path: `/v1/contracts/${contractId}/utility-bills`,
      method: "POST",
      body: data,
      successStatus: 201,
      fallbackMessage: "Không thể tạo hóa đơn điện nước",
    });
    if (proxied) {
      const payload = await proxied.json();
      await sendNotification(payload.data?.notification);
      return successResponse(payload.data?.bill ?? payload.data, proxied.status);
    }

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return handleApiError(new Error("Contract not found"));
    if (contract.hostId !== user.userId && user.role !== "ADMIN") {
      return handleApiError(new Error("Only host can create utility bills"));
    }
    const electricityUsage = data.electricityUsage || 0;
    const waterUsage = data.waterUsage || 0;
    const electricityCost = electricityUsage * (contract.electricityRate || 0);
    const waterCost = waterUsage * (contract.waterRate || 0);
    const totalCost = electricityCost + waterCost;
    const bill = await prisma.utilityBill.create({
      data: {
        contractId,
        month: data.month,
        year: data.year,
        previousReading: data.previousReading,
        currentReading: data.currentReading,
        electricityUsage,
        waterUsage,
        electricityCost,
        waterCost,
        totalCost,
        notes: data.notes,
      },
    });
    await sendNotification({
      userId: contract.renterId,
      title: "Bạn có hóa đơn điện nước mới",
      body: `Hóa đơn điện nước tháng ${data.month}/${data.year} đã được tạo. Vui lòng kiểm tra và thanh toán.`,
      data: { billId: bill.id, contractId, type: "NEW_UTILITY_BILL" },
    });
    return successResponse(bill, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
