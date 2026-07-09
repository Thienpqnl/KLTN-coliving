import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { successResponse } from "@/lib/api-error";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/host/bookings",
      fallbackMessage: "Không thể tải booking của chủ nhà",
    });
    if (proxied) return proxied;

    const bookings = await prisma.booking.findMany({
      where: { room: { ownerId: user.userId } },
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, title: true, priceText: true, priceValue: true, address: true } },
        invoice: true,
        contract: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(bookings);
  } catch (error) {
    console.error("HOST BOOKINGS ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
