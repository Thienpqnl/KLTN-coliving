import jwt from "jsonwebtoken";
import { ApiError } from "./api-error";

export interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export const verifyToken = (token: string): JWTPayload => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
};

export const extractToken = (authHeader: string | null): string => {
  if (!authHeader) {
    throw new ApiError(401, "Missing authorization header");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new ApiError(401, "Invalid authorization header format");
  }

  return parts[1];
};

export const generateToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
