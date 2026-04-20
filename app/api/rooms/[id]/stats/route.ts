import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        bookings: true,
        reviews: true,
      },
    });

    if (!room) {
      return successResponse({ error: "Room not found" }, 404);
    }

    const totalBookings = room.bookings.length;
    const confirmedBookings = room.bookings.filter(
      (b) => b.status === "CONFIRMED"
    ).length;
    const pendingBookings = room.bookings.filter(
      (b) => b.status === "PENDING"
    ).length;

    const reviews = room.reviews;
    const averageRating =
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
          ) / 10
        : 0;

    // Calculate total revenue
    const totalRevenue = room.bookings.reduce((sum, booking) => {
      const nights = Math.ceil(
        (booking.endDate.getTime() - booking.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + room.price * nights;
    }, 0);

    return successResponse({
      roomId: room.id,
      title: room.title,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalReviews: reviews.length,
      averageRating,
      totalRevenue,
      status: room.status,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
