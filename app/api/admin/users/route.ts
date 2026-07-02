import { NextRequest, NextResponse } from "next/server";
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
    const role = searchParams.get("role") as string | null;
    const status = searchParams.get("status") as string | null;
    const search = searchParams.get("search");

    const result = await AdminService.getAllUsers({
      page,
      limit,
      role: (role as any) || undefined,
      status: (status as any) || undefined,
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
