import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/user/occupancy",
      fallbackMessage: "Không thể tải trạng thái cư trú",
    });
    if (proxied) {
      const payload = await proxied.json();
      return NextResponse.json(payload.data, { status: proxied.status });
    }

    const [occupancy, ownedRooms] = await Promise.all([
      prisma.occupancy.findFirst({
        where: { userId: user.userId, status: "ACTIVE" },
        include: { room: { select: { id: true, title: true, address: true } } },
      }),
      prisma.room.findMany({
        where: { ownerId: user.userId },
        select: { id: true, title: true, address: true },
      }),
    ]);

    return NextResponse.json({ occupancy, ownedRooms });
  } catch (error) {
    console.error("Occupancy error:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
