import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
if (typeof BigInt !== 'undefined') {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value() {
      return this.toString();
    },
    configurable: true,
  });
}

interface RoomRecommendation {
  roomId: string;
  [key: string]: unknown;
}
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthUser(req);
    if (!payload?.userId) {
      return NextResponse.json(
        { error: "Không được phép truy cập" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { preference: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

    if (!user.preference) {
      return NextResponse.json(
        { error: "Vui lòng điền thông tin sở thích trước", recommendations: [] },
        { status: 400 }
      );
    }

    const topK = req.nextUrl.searchParams.get("top_k") || "10";

    // Gọi Python AI Service
    console.log(`[AI] Requesting recommendations for user ${user.id}`);
    const response = await fetch(
      `${AI_SERVICE_URL}/recommend-room/${user.id}?top_k=${topK}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      console.error(
        `[AI] Service error: ${response.status} ${response.statusText}`
      );
      throw new Error(
        `AI Service error: ${response.status} ${response.statusText}`
      );
    }

    const recommendations = (await response.json()) as RoomRecommendation[];

    // Lấy chi tiết các phòng từ database
    const roomIds = recommendations.map((recommendation) => recommendation.roomId);
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds }, status: "AVAILABLE" },
      include: {
        amenities: { include: { amenity: true } },
        images: true,
        owner: { select: { name: true, email: true, phone: true } },
      },
    });

    // Merge recommendation scores với room details
    const result = recommendations.map((rec) => {
      const room = rooms.find((r) => r.id === rec.roomId);
      return {
        ...rec,
        roomDetails: room,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR]", error);
    return handleApiError(error);
  }
}
