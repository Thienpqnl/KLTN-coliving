import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

type AIRoommateMatch = {
  roommate_id: string;
  compatibility_score?: number;
  compatibility_reasons?: string[];
  name?: string;
  avatar?: string;
  age?: unknown;
  occupation?: string;
  cleanliness_level?: number;
  social_level?: number;
  accept_smoking?: boolean;
  accept_pets?: boolean;
};

type AIEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Nguoi dung khong tim thay" }, { status: 404 });
    }

    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json({ error: "room_id la bat buoc" }, { status: 400 });
    }

    const response = await fetch(
      `${AI_SERVICE_URL}/v1/match-roommates/${user.id}/${roomId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as AIEnvelope<AIRoommateMatch[]>;
    const roommates = payload.success === false || !Array.isArray(payload.data)
      ? []
      : payload.data;

    if (roommates.length === 0) {
      return NextResponse.json([]);
    }

    const roommateIds = roommates.map((roommate) => roommate.roommate_id);
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

    const result = roommates.map((mate) => {
      const userInfo = roommateUsers.find((item) => item.id === mate.roommate_id);
      return {
        roommate_id: mate.roommate_id,
        compatibility_score: mate.compatibility_score ?? 0,
        compatibility_reasons: mate.compatibility_reasons ?? [],
        name: userInfo?.name || mate.name || "Nguoi dung an danh",
        avatar: userInfo?.avatarUrl || mate.avatar || "/default-avatar.png",
        age: mate.age,
        occupation: mate.occupation || "Chua cap nhat",
        cleanliness_level: mate.cleanliness_level ?? 0,
        social_level: mate.social_level ?? 0,
        accept_smoking: mate.accept_smoking ?? false,
        accept_pets: mate.accept_pets ?? false,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR]", error);
    return handleApiError(error);
  }
}
