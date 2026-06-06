import { NextRequest } from "next/server";
import { ContractStatus } from "@prisma/client";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const createContractSchema = z.object({
  bookingId: z.string().min(1, "Booking là bắt buộc"),
  endDate: z.string().datetime().optional(),
  monthlyRent: z.number().min(0, "Tiền thuê phải lớn hơn hoặc bằng 0").optional(),
  depositAmount: z.number().min(0, "Tiền cọc phải lớn hơn hoặc bằng 0"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const status =
      statusParam &&
      Object.values(ContractStatus).includes(statusParam as ContractStatus)
        ? (statusParam as ContractStatus)
        : undefined;
    const roomId = searchParams.get("roomId");
    const renterId = searchParams.get("renterId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await contractService.getAll({
      status,
      roomId: roomId || undefined,
      renterId:
        authUser.role === "CUSTOMER"
          ? authUser.userId
          : renterId || undefined,
      hostId: authUser.role === "HOST" ? authUser.userId : undefined,
      page,
      limit,
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
      return successResponse(
        { error: "Bạn không có quyền tạo hợp đồng" },
        403
      );
    }

    const body = await request.json();
    const data = createContractSchema.parse(body);
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        contract: { select: { id: true } },
        room: {
          select: {
            id: true,
            ownerId: true,
            priceValue: true,
          },
        },
      },
    });

    if (!booking) {
      return successResponse({ error: "Booking không tìm thấy" }, 404);
    }

    if (booking.status !== "CONFIRMED") {
      return successResponse(
        { error: "Chỉ có thể tạo hợp đồng từ booking đã được xác nhận" },
        400
      );
    }

    if (booking.contract) {
      return successResponse({ error: "Booking này đã có hợp đồng" }, 400);
    }

    if (!booking.room.ownerId) {
      return successResponse(
        { error: "Phòng chưa có chủ nhà để tạo hợp đồng" },
        400
      );
    }

    if (authUser.role === "HOST" && booking.room.ownerId !== authUser.userId) {
      return successResponse(
        { error: "Bạn không có quyền tạo hợp đồng cho booking này" },
        403
      );
    }

    const contract = await contractService.create({
      bookingId: booking.id,
      roomId: booking.roomId,
      renterId: booking.userId,
      hostId: booking.room.ownerId,
      startDate: booking.startDate,
      endDate: data.endDate ? new Date(data.endDate) : booking.endDate,
      monthlyRent:
        data.monthlyRent ??
        (booking.room.priceValue == null ? 0 : Number(booking.room.priceValue)),
      depositAmount: data.depositAmount,
      notes: data.notes,
    });

    return successResponse(contract, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
