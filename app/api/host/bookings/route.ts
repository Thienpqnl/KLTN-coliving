import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const bookings = await prisma.booking.findMany({
      where: {
        room: {
          ownerId: user.userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        room: {
          select: {
            id: true,
            title: true,
            priceText: true,
            priceValue: true,
            address: true,
          },
        },
        invoice: true,
        contract: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(bookings);
  } catch (error) {
  console.error("HOST BOOKINGS ERROR:", error);

  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    },
    { status: 500 }
  );
}
}
