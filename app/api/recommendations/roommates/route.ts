import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

type AIRoommateMatch = {
  roommate_id: string;
  compatibility_score?: number;
  compatibility_reasons?: string[];
  [key: string]: unknown;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
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

    const roommates = (await response.json()) as AIRoommateMatch[];

    // Lấy thông tin roommates từ database
    const roommateIds = roommates.map((r) => r.roommate_id);
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
    const result = roommates.map((mate) => {
      const userInfo = roommateUsers.find((u) => u.id === mate.roommate_id);
      return {
        ...mate,
        userInfo,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR]", error);
    return handleApiError(error);
  }
}
