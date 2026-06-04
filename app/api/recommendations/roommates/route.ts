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
    console.log(`[AI] AI_SERVICE_URL: ${AI_SERVICE_URL}`);
    
    const aiUrl = `${AI_SERVICE_URL}/match-roommates/${user.id}/${roomId}`;
    console.log(`[AI] Full URL: ${aiUrl}`);
    
    const response = await fetch(aiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`[AI] Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`[AI] Response text: ${responseText}`);

    if (!response.ok) {
      console.error(
        `[AI] Service error: ${response.status} ${response.statusText}`
      );
      console.error(`[AI] Response body: ${responseText}`);
      throw new Error(
        `AI Service error: ${response.status} ${response.statusText}`
      );
    }

    let roommates: AIRoommateMatch[] = [];
    try {
      roommates = JSON.parse(responseText) as AIRoommateMatch[];
    } catch (parseError) {
      console.error(`[AI] Failed to parse JSON:`, parseError);
      console.error(`[AI] Raw response was:`, responseText);
      return NextResponse.json([]);
    }

    console.log("[AI] Raw roommates:", roommates);
    console.log("[AI] Count:", roommates.length);
    
    if (roommates.length === 0) {
      console.warn("[AI] ⚠️ No roommates returned from AI service");
      return NextResponse.json([]);
    }
    
    // Lấy thông tin roommates từ database để có dữ liệu thực
    const roommateIds = roommates.map((r) => r.roommate_id);
    console.log("[DB] Looking for roommate IDs:", roommateIds);
    
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

    console.log("[DB] Found users:", roommateUsers.length);

    // Merge dữ liệu từ AI và database, trả về flat structure
    const result = roommates.map((mate) => {
      const userInfo = roommateUsers.find((u) => u.id === mate.roommate_id);
      
      const mappedRoommate = {
        roommate_id: mate.roommate_id,
        compatibility_score: mate.compatibility_score ?? 0,
        compatibility_reasons: mate.compatibility_reasons ?? [],
        name: userInfo?.name || mate.name || "Người dùng ẩn danh",
        avatar: userInfo?.avatarUrl || mate.avatar || "/default-avatar.png",
        age: mate.age,
        occupation: mate.occupation || "Chưa cập nhật",
        cleanliness_level: mate.cleanliness_level ?? 0,
        social_level: mate.social_level ?? 0,
        accept_smoking: mate.accept_smoking ?? false,
        accept_pets: mate.accept_pets ?? false,
      };
      
      console.log(`[MERGE] Roommate ${mate.roommate_id}:`, {
        hasUserInfo: !!userInfo,
        name: mappedRoommate.name,
        avatar: mappedRoommate.avatar,
      });
      
      return mappedRoommate;
    });

    console.log("[ROOMMATES] Returning result count:", result.length);
    console.log("[ROOMMATES] Returning result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR]", error);
    return handleApiError(error);
  }
}
