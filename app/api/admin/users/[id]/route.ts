import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { ApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role } from "@prisma/client";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";

const updateUserSchema = z.object({
  action: z.enum(["lock", "unlock", "delete", "update_role"]),
  reason: z.string().optional(),
  newRole: z.enum(["CUSTOMER", "HOST", "ADMIN", "COMMUNITY_MANAGER"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN")
      throw new ApiError(403, "Forbidden: Admin only");

    const body = await request.json();
    const { action, reason, newRole } = updateUserSchema.parse(body);
    const userId = id;

    if (
      userId === payload.userId &&
      (action === "lock" || action === "delete" || action === "update_role")
    ) {
      throw new ApiError(
        400,
        "Không thể khóa, xóa hoặc thay đổi vai trò của tài khoản admin hiện tại"
      );
    }

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: `/v1/admin/users/${userId}`,
      method: "PATCH",
      body: { action, reason, newRole },
      fallbackMessage: "Cannot update user",
    });
    if (proxied) return proxied;

    let result;

    switch (action) {
      case "lock":
        result = await AdminService.lockUser(userId, payload.userId, reason);
        break;
      case "unlock":
        result = await AdminService.unlockUser(payload.userId, userId, reason);
        break;
      case "delete":
        result = await AdminService.deleteUser(userId, payload.userId, reason);
        break;
      case "update_role":
        if (!newRole) throw new ApiError(400, "newRole is required");
        result = await AdminService.updateUserRole(
          userId,
          newRole as Role,
          payload.userId,
          reason
        );
        break;
      default:
        throw new ApiError(400, "Invalid action");
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    if (payload.role !== "ADMIN")
      throw new ApiError(403, "Forbidden: Admin only");

    const { id } = await params;

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: `/v1/admin/users/${id}`,
      fallbackMessage: "Cannot load user",
    });
    if (proxied) return proxied;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { bookings: true, rooms: true },
        },
      },
    });

    if (!user) throw new ApiError(404, "User not found");

    return NextResponse.json(user);
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
