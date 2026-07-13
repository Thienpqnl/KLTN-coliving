import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { ApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN")
      throw new ApiError(403, "Forbidden: Admin only");

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const adminId = searchParams.get("adminId");

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: `/v1/admin/logs?${searchParams.toString()}`,
      fallbackMessage: "Cannot load admin logs",
    });
    if (proxied) return proxied;

    const logs = await AdminService.getAdminLogs({
      page,
      limit,
      action: action || undefined,
      targetType: targetType || undefined,
      adminId: adminId || undefined,
    });

    return NextResponse.json(logs);
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
