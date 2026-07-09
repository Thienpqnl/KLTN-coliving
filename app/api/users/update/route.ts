import { NextRequest } from "next/server";
import { userService } from "@/lib/services/user.service";
import { userProfileUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const data = userProfileUpdateSchema.parse(body);

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: user.userId, role: user.role },
      path: "/v1/users/profile",
      method: "PUT",
      body: data,
      fallbackMessage: "Cannot update user profile",
    });
    if (proxied) {
      if (proxied.status >= 400) return proxied;
      const payload = await proxied.json();
      return successResponse(payload, proxied.status);
    }

    const updatedUser = await userService.updateProfile(user.userId, data);

    return successResponse(updatedUser);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: user.userId, role: user.role },
      path: "/v1/users/profile",
      method: "DELETE",
      fallbackMessage: "Cannot delete account",
    });
    if (proxied) {
      if (proxied.status >= 400) return proxied;
      const payload = await proxied.json();
      return successResponse(payload, proxied.status);
    }

    await userService.delete(user.userId);

    return successResponse({ message: "Account deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
