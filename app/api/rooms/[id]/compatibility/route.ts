import { NextRequest, NextResponse } from "next/server";
import {
  gatewayServiceBase,
  internalServiceHeaders,
} from "@/lib/microservices/service-client";
import { getAuthUser } from "@/lib/auth";

type AIEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | null;
  statusCode?: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthUser(_req);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Khong duoc phep truy cap" }, { status: 401 });
    }

    const { id: roomId } = await params;
    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    const aiServiceUrl = gatewayServiceBase(
      "ai-service",
      process.env.AI_SERVICE_URL || "http://localhost:8000",
    );
    const response = await fetch(
      `${aiServiceUrl}/v1/compatibility-detail/${payload.userId}/${roomId}`,
      {
        method: "GET",
        headers: internalServiceHeaders({ "Content-Type": "application/json" }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Khong the tinh toan do tuong dong" },
        { status: response.status },
      );
    }

    const envelope = (await response.json()) as AIEnvelope<unknown>;
    if (envelope.success === false) {
      return NextResponse.json(
        {
          error: envelope.error || "Khong the tinh toan do tuong dong",
          data: envelope.data,
        },
        { status: envelope.statusCode && envelope.statusCode >= 400 ? envelope.statusCode : 200 },
      );
    }

    return NextResponse.json(envelope.data ?? envelope);
  } catch (error) {
    console.error("Compatibility API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
