import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import {
  gatewayServiceBase,
  getServiceUrl,
  internalServiceHeaders,
  requestServiceJson,
} from "@/lib/microservices/service-client";
import {
  serviceIdentityHeaders,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

const AI_SERVICE_URL = gatewayServiceBase(
  "ai-service",
  process.env.AI_SERVICE_URL || "http://localhost:8000",
);

interface RoomRecommendation {
  roomId: string;
  [key: string]: unknown;
}

type AIEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | null;
};

function serviceUrlOrUnavailable(
  name: "PREFERENCE" | "PROPERTY",
  label: string,
) {
  const url = getServiceUrl(name);
  return url || serviceUnavailableResponse(label, `${name}_SERVICE_URL is not configured`);
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const preferenceServiceUrl = serviceUrlOrUnavailable("PREFERENCE", "Preference Service");
    if (preferenceServiceUrl instanceof Response) return preferenceServiceUrl;

    const preference = await requestServiceJson<Record<string, unknown>>(
      "preference-service",
      preferenceServiceUrl,
      "/v1/preferences",
      {
        headers: serviceIdentityHeaders({
          userId: authUser.userId,
          role: authUser.role,
        }),
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );

    if (!preference || !preference.id) {
      return NextResponse.json(
        { error: "Vui lòng điền thông tin sở thích trước", recommendations: [] },
        { status: 400 },
      );
    }

    const topK = req.nextUrl.searchParams.get("top_k") || "10";
    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/v1/recommend-room/${authUser.userId}?top_k=${topK}`,
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

    const aiPayload = (await aiResponse.json()) as AIEnvelope<RoomRecommendation[]>;
    const recommendations = Array.isArray(aiPayload.data) ? aiPayload.data : [];
    if (aiPayload.success === false || recommendations.length === 0) {
      return NextResponse.json([]);
    }

    const roomIds = recommendations.map((recommendation) => recommendation.roomId);
    const propertyServiceUrl = serviceUrlOrUnavailable("PROPERTY", "Property Service");
    if (propertyServiceUrl instanceof Response) return propertyServiceUrl;

    const rooms = await requestServiceJson<Array<{ id: string }>>(
      "property-service",
      propertyServiceUrl,
      "/v1/rooms/batch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: roomIds }),
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );

    const roomMap = new Map(rooms.map((room) => [room.id, room]));
    return NextResponse.json(
      recommendations.map((recommendation) => ({
        ...recommendation,
        roomDetails: roomMap.get(recommendation.roomId) || null,
      })),
    );
  } catch (error) {
    console.error("[recommendations/rooms]", error);
    return handleApiError(error);
  }
}
