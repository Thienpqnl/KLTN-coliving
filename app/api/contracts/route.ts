import { NextRequest } from "next/server";
import { ContractStatus } from "@prisma/client";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";

const createContractSchema = z.object({
  bookingId: z.string().min(1, "Booking là bắt buộc"),
  endDate: z.string().datetime().optional(),
  monthlyRent: z.number().min(0).optional(),
  depositAmount: z.number().min(0),
  paymentDueDay: z.number().int().min(1).max(28).default(5),
  paymentMethod: z.string().max(100).optional(),
  electricityRate: z.number().min(0).optional(),
  waterRate: z.number().min(0).optional(),
  utilitiesNotes: z.string().max(1000).optional(),
  noticeDays: z.number().int().min(0).max(180).default(30),
  depositReturnDays: z.number().int().min(0).max(60).default(7),
  houseRules: z.string().max(5000).optional(),
  inventory: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1),
    condition: z.string().optional(),
  })).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const status = statusParam && Object.values(ContractStatus).includes(statusParam as ContractStatus)
      ? statusParam as ContractStatus
      : undefined;

    const result = await contractService.getAll({
      status,
      roomId: searchParams.get("roomId") || undefined,
      renterId: authUser.role === "CUSTOMER" ? authUser.userId : searchParams.get("renterId") || undefined,
      hostId: authUser.role === "HOST" ? authUser.userId : undefined,
      page: Math.max(1, Number(searchParams.get("page") || 1)),
      limit: Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10))),
    });
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền tạo hợp đồng");
    }

    const data = createContractSchema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        contract: { select: { id: true } },
        room: { select: { id: true, ownerId: true, priceValue: true } },
      },
    });
    if (!booking) throw new ApiError(404, "Không tìm thấy booking");
    if (booking.status !== "CONFIRMED") throw new ApiError(400, "Chỉ có thể tạo hợp đồng từ booking đã xác nhận");
    if (booking.contract) throw new ApiError(400, "Booking này đã có hợp đồng");
    if (!booking.room.ownerId) throw new ApiError(400, "Phòng chưa có chủ nhà");
    if (authUser.role === "HOST" && booking.room.ownerId !== authUser.userId) {
      throw new ApiError(403, "Bạn không có quyền tạo hợp đồng cho booking này");
    }

    const contract = await contractService.create({
      bookingId: booking.id,
      roomId: booking.roomId,
      renterId: booking.userId,
      hostId: booking.room.ownerId,
      startDate: booking.startDate,
      endDate: data.endDate ? new Date(data.endDate) : booking.endDate,
      monthlyRent: data.monthlyRent ?? Number(booking.room.priceValue ?? 0),
      depositAmount: data.depositAmount,
      paymentDueDay: data.paymentDueDay,
      paymentMethod: data.paymentMethod,
      electricityRate: data.electricityRate,
      waterRate: data.waterRate,
      utilitiesNotes: data.utilitiesNotes,
      noticeDays: data.noticeDays,
      depositReturnDays: data.depositReturnDays,
      houseRules: data.houseRules,
      inventory: data.inventory,
      notes: data.notes,
    }, {
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    });
    return successResponse(contract, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
