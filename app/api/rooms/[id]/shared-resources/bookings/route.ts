// app/api/rooms/[id]/shared-resources/bookings/route.ts
import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBookingSchema = z.object({
  resourceId: z.string().uuid("ID tài nguyên không hợp lệ"),
  title: z.string().min(1, "Vui lòng nhập mục đích sử dụng").max(100),
  startTime: z.string().transform((val) => new Date(val)),
  endTime: z.string().transform((val) => new Date(val)),
}).refine(data => data.endTime > data.startTime, {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthUser(request);
    const { id: roomId } = await params;

    const resources = await prisma.sharedResource.findMany({
      where: { roomId },
      include: {
        resourceBookings: {
          where: { status: { not: "CANCELLED" } }, // Chỉ lấy booking còn hiệu lực
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(resources);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;
    const body = await request.json();
    
    const validated = createBookingSchema.parse(body);

    // Kiểm tra trùng lặp thời gian
    const conflict = await prisma.resourceBooking.findFirst({
      where: {
        resourceId: validated.resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { startTime: { lt: validated.endTime }, endTime: { gt: validated.startTime } },
        ],
      },
    });

    if (conflict) {
      return handleApiError(new Error("Khung giờ này đã được đặt hoặc đang chờ duyệt"));
    }

    // Kiểm tra giới hạn thời gian tối đa của tài nguyên
    const resource = await prisma.sharedResource.findUnique({
      where: { id: validated.resourceId },
    });

    if (!resource) {
      return handleApiError(new Error("Tài nguyên không tồn tại"));
    }

    const durationMinutes = (validated.endTime.getTime() - validated.startTime.getTime()) / (1000 * 60);
    if (durationMinutes > resource.maxDurationMinutes) {
      return handleApiError(new Error(`Thời gian đặt vượt quá mức tối đa (${resource.maxDurationMinutes} phút)`));
    }

    const booking = await prisma.resourceBooking.create({
      data: {
        resourceId: validated.resourceId,
        userId: user.userId,
        title: validated.title,
        startTime: validated.startTime,
        endTime: validated.endTime,
        status: "PENDING",
      },
      include: { resource: true },
    });

    return successResponse(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}