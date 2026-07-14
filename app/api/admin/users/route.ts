import { NextRequest, NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { AdminService } from "@/lib/services/admin.service";
import { ApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(72),
  fullName: z.string().trim().min(2, "Họ và tên cần ít nhất 2 ký tự"),
  phone: z.string().trim().regex(/^\+?[0-9\s.-]{9,20}$/, "Số điện thoại không hợp lệ").optional().or(z.literal("")),
  role: z.enum(["CUSTOMER", "HOST", "COMMUNITY_MANAGER"]),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN") throw new ApiError(403, "Forbidden: Admin only");
    const input = createUserSchema.parse(await request.json());

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: "/v1/admin/users",
      method: "POST",
      body: input,
      fallbackMessage: "Cannot create user",
    });
    if (proxied) return proxied;

    return NextResponse.json(
      { error: "Identity Service không khả dụng" },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Dữ liệu không hợp lệ", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: `/v1/admin/users?${searchParams.toString()}`,
      fallbackMessage: "Cannot load users",
    });
    if (proxied) return proxied;

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
