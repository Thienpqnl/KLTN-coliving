import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    
    if (!token) {
      return NextResponse.json({
        status: "error",
        message: "No token provided",
        headers: Object.fromEntries(request.headers.entries()),
      });
    }

    try {
      const payload = verifyToken(token);
      return NextResponse.json({
        status: "success",
        token_payload: payload,
        has_admin_role: payload.role === "ADMIN",
        message: payload.role === "ADMIN" 
          ? "✅ Token is valid and has ADMIN role" 
          : `❌ Token has role: ${payload.role}`,
      });
    } catch (err: unknown) {
      return NextResponse.json({
        status: "error",
        message: "Invalid token",
        error: err instanceof Error ? err.message : String(err),
      }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Server error",
      error: String(error),
    }, { status: 500 });
  }
}
