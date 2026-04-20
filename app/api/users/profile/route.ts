import { NextRequest } from "next/server";
import { userService } from "@/lib/services/user.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    // Get user profile with related data
    const profile = await userService.getProfile(user.userId);

    return successResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
