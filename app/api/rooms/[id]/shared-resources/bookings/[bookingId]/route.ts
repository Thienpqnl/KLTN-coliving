// app/api/shared-resources/bookings/[bookingId]/route.ts
import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { bookingId } = await params;
    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);

    const booking = await prisma.resourceBooking.findUnique({
      where: { id: bookingId },
      include: { resource: true },
    });

    if (!booking) throw new ApiError(404, "Không tìm thấy lịch đặt");

    const isHostOrAdmin = user.role === "HOST" || user.role === "ADMIN";
    
    if (isHostOrAdmin && (status === "APPROVED" || status === "CANCELLED")) {
      const updatedBooking = await prisma.resourceBooking.update({
        where: { id: bookingId },
        data: { status },
      });

      const now = new Date();
      const isCurrentlyActive = 
        status === "APPROVED" && 
        now >= new Date(booking.startTime) && 
        now < new Date(booking.endTime);

      let newResourceStatus = "ACTIVE";
      if (booking.resource.status !== "MAINTENANCE") {
         newResourceStatus = isCurrentlyActive ? "BUSY" : "ACTIVE";
      } else {
         newResourceStatus = "MAINTENANCE"; 
      }

      await prisma.sharedResource.update({
        where: { id: booking.resourceId },
        data: { status: newResourceStatus },
      });

      return successResponse(updatedBooking);
    }

    if (status === "CANCELLED" && booking.userId === user.userId) {
       const updated = await prisma.resourceBooking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });
      
      await prisma.sharedResource.update({
        where: { id: booking.resourceId },
        data: { status: "ACTIVE" },
      });

      return successResponse(updated);
    }

    throw new ApiError(403, "Bạn không có quyền thay đổi trạng thái này");
  } catch (error) {
    return handleApiError(error);
  }
}