import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import {
  gatewayServiceBase,
  getServiceUrl,
  internalServiceHeaders,
  requestServiceJson,
} from "@/lib/microservices/service-client";
import { serviceUnavailableResponse } from "@/lib/microservices/bff-service";

const AI_SERVICE_URL = gatewayServiceBase(
  "ai-service",
  process.env.AI_SERVICE_URL || "http://localhost:8000",
);

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

type UserSummary = {
  id: string;
  name: string | null;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

type AIEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json({ error: "room_id là bắt buộc" }, { status: 400 });
    }

    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/v1/match-roommates/${authUser.userId}/${roomId}`,
      {
        method: "GET",
        headers: internalServiceHeaders({ "Content-Type": "application/json" }),
        cache: "no-store",
      },
    );

    if (!aiResponse.ok) {
      return serviceUnavailableResponse(
        "AI Service",
        `${aiResponse.status} ${aiResponse.statusText}`,
      );
    }

    const payload = (await aiResponse.json()) as AIEnvelope<AIRoommateMatch[]>;
    const roommates =
      payload.success === false || !Array.isArray(payload.data) ? [] : payload.data;
    if (roommates.length === 0) return NextResponse.json([]);

    const identityServiceUrl = getServiceUrl("IDENTITY");
    if (!identityServiceUrl) {
      return serviceUnavailableResponse(
        "Identity Service",
        "IDENTITY_SERVICE_URL is not configured",
      );
    }

    const roommateIds = roommates.map((roommate) => roommate.roommate_id);
    const users = await requestServiceJson<UserSummary[]>(
      "identity-service",
      identityServiceUrl,
      "/v1/users/summaries",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: roommateIds }),
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );
    const userMap = new Map(users.map((user) => [user.id, user]));

    return NextResponse.json(
      roommates.map((mate) => {
        const userInfo = userMap.get(mate.roommate_id);
        return {
          roommate_id: mate.roommate_id,
          compatibility_score: mate.compatibility_score ?? 0,
          compatibility_reasons: mate.compatibility_reasons ?? [],
          name:
            userInfo?.name ||
            userInfo?.fullName ||
            mate.name ||
            "Người dùng ẩn danh",
          avatar: userInfo?.avatarUrl || mate.avatar || "/default-avatar.png",
          age: mate.age,
          occupation: mate.occupation || "Chưa cập nhật",
          cleanliness_level: mate.cleanliness_level ?? 0,
          social_level: mate.social_level ?? 0,
          accept_smoking: mate.accept_smoking ?? false,
          accept_pets: mate.accept_pets ?? false,
        };
      }),
    );
  } catch (error) {
    console.error("[recommendations/roommates]", error);
    return handleApiError(error);
  }
}
