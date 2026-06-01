import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const where = {
      room: {
        ownerId: user.userId,
      },
    };

    const [total, pending, confirmed, completed, hostRooms, occupiedRooms, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: "PENDING" } }),
      prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.room.count({ where: { ownerId: user.userId } }),
      prisma.room.count({ where: { ownerId: user.userId, status: "OCCUPIED" } }),
      prisma.booking.findMany({
        where: {
          ...where,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
        include: {
          room: {
            select: {
              priceValue: true,
            },
          },
        },
      }),
    ]);

    const projectedRevenue = bookings.reduce((sum, booking) => {
      return sum + Number(booking.room.priceValue || 0);
    }, 0);

    return successResponse({
      total,
      pending,
      confirmed,
      completed,
      pendingCount: pending,
      occupancyPercentage: hostRooms > 0 ? Math.round((occupiedRooms / hostRooms) * 100) : 0,
      projectedRevenue,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
