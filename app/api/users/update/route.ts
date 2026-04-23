import { NextRequest } from "next/server";
import { userService } from "@/lib/services/user.service";
import { userProfileUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const data = userProfileUpdateSchema.parse(body);

    const updatedUser = await userService.updateProfile(user.userId, data);

    return successResponse(updatedUser);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    await userService.delete(user.userId);

    return successResponse({ message: "Account deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
