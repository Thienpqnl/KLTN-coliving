import { NextRequest } from "next/server";
import { userService } from "@/lib/services/user.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const proxied = await tryProxyIdentityServiceRaw({
      identity: { userId: user.userId, role: user.role },
      path: "/v1/users/profile",
      fallbackMessage: "Cannot load user profile",
    });
    if (proxied) {
      if (proxied.status >= 400) return proxied;
      const data = await proxied.json();
      return successResponse(data, proxied.status);
    }

    // Get user profile with related data
    const profile = await userService.getProfile(user.userId);

    return successResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
