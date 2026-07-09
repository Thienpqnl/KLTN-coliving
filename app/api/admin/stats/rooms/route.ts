import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { ApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { tryProxyPropertyServiceRaw } from "@/lib/microservices/property-bff";

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN")
      throw new ApiError(403, "Forbidden: Admin only");

    const proxied = await tryProxyPropertyServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: "/v1/admin/stats/rooms",
      fallbackMessage: "Cannot load room stats",
    });
    if (proxied) return proxied;

    const stats = await AdminService.getRoomStats();

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
