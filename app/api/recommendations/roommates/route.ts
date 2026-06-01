import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Không được phép truy cập" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json(
        { error: "room_id là bắt buộc" },
        { status: 400 }
      );
    }

    // Gọi Python AI Service
    console.log(
      `[AI] Requesting roommate match for user ${user.id}, room ${roomId}`
    );
    const response = await fetch(
      `${AI_SERVICE_URL}/match-roommates/${user.id}/${roomId}`,
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

    const roommates = await response.json();

    // Lấy thông tin roommates từ database
    const roommateIds = roommates.map((r: any) => r.roommate_id);
    const roommateUsers = await prisma.user.findMany({
      where: { id: { in: roommateIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        preference: true,
      },
    });

    // Merge với scores từ AI
    const result = roommates.map((mate: any) => {
      const userInfo = roommateUsers.find((u) => u.id === mate.roommate_id);
      return {
        ...mate,
        userInfo,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR]", error);
    return ApiError.handle(error);
  }
}
