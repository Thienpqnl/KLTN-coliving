import { NextRequest, NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { AdminService } from "@/lib/services/admin.service";
import { ApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN")
      throw new ApiError(403, "Forbidden: Admin only");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const roleParam = searchParams.get("role");
    const statusParam = searchParams.get("status");
    const role = roleParam && Object.values(Role).includes(roleParam as Role) ? (roleParam as Role) : undefined;
    const status = statusParam && Object.values(UserStatus).includes(statusParam as UserStatus) ? (statusParam as UserStatus) : undefined;
    const search = searchParams.get("search");

    const result = await AdminService.getAllUsers({
      page,
      limit,
      role,
      status,
      search: search || undefined,
    });

    return NextResponse.json(result);
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
