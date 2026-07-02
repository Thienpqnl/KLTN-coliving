// app/api/rooms/[id]/shared-resources/bookings/route.ts
import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hasBookingConflict } from "@/lib/utils/shared-space-conflicts";

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
          include: {
            user: {
              select: {
                id: true,
                name: true,
                fullName: true,
              },
            },
          },
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

    const booking = await prisma.$transaction(async (tx) => {
      const lockedResourceRows = await tx.$queryRaw<{ id: string }[]>
        `SELECT id FROM shared_resources WHERE id = ${validated.resourceId} FOR UPDATE`;

      if (lockedResourceRows.length === 0) {
        throw new ApiError(404, "Tài nguyên không tồn tại");
      }

      const resource = await tx.sharedResource.findUnique({
        where: { id: validated.resourceId },
      });

      if (!resource) {
        throw new ApiError(404, "Tài nguyên không tồn tại");
      }

      if (resource.status === "MAINTENANCE") {
        throw new ApiError(409, "Tài nguyên hiện đang bảo trì, không thể đặt lịch");
      }

      const durationMinutes = (validated.endTime.getTime() - validated.startTime.getTime()) / (1000 * 60);
      if (durationMinutes > resource.maxDurationMinutes) {
        throw new ApiError(400, `Thời gian đặt vượt quá mức tối đa (${resource.maxDurationMinutes} phút)`);
      }

      if (validated.startTime < new Date()) {
        throw new ApiError(400, "Không thể đặt lịch trong quá khứ");
      }

      const existingBookings = await tx.resourceBooking.findMany({
        where: {
          resourceId: validated.resourceId,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: {
          startTime: true,
          endTime: true,
          status: true,
        },
      });

      if (hasBookingConflict(validated.startTime, validated.endTime, existingBookings)) {
        throw new ApiError(409, "Khung giờ này đã bị trùng với lịch đặt khác hoặc đang chờ duyệt");
      }

      return tx.resourceBooking.create({
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
    });

    return successResponse(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}