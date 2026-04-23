import { NextRequest } from "next/server";
import { verifyToken, extractToken, JWTPayload } from "./jwt";
import { ApiError } from "./api-error";

export const getAuthUser = async (request: NextRequest): Promise<JWTPayload> => {
  try {
    let token: string | null = null;
    
    // Try to get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      token = extractToken(authHeader);
    } else {
      // Try to get token from cookies
      token = request.cookies.get("token")?.value || null;
    }
    
    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }
    
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
