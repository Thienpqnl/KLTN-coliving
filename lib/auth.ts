import { NextRequest } from "next/server";
import { verifyToken, extractToken, JWTPayload } from "./jwt";
import { ApiError } from "./api-error";

export const getAuthUser = async (request: NextRequest): Promise<JWTPayload> => {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractToken(authHeader);
    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Unauthorized");
  }
};

export const optionalAuthUser = async (
  request: NextRequest
): Promise<JWTPayload | null> => {
  try {
    return await getAuthUser(request);
  } catch {
    return null;
  }
};
