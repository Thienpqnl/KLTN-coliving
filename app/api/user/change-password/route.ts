import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  getBearerAuthorization,
  isForwardableServiceError,
  isMicroserviceStrictMode,
  serviceErrorPayload,
  serviceUnavailableResponse,
} from "@/lib/microservices/bff-service";

export async function PUT(request: NextRequest) {
  if (!getBearerAuthorization(request)) {
    return NextResponse.json(
      { message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    const identityServiceUrl = getServiceUrl("IDENTITY");
    const authorization = getBearerAuthorization(request);
    if (!identityServiceUrl && isMicroserviceStrictMode()) {
      return serviceUnavailableResponse(
        "Identity Service",
        "IDENTITY_SERVICE_URL is not configured",
      );
    }

    if (identityServiceUrl && authorization) {
      try {
        const result = await requestServiceJson<unknown>(
          "identity-service",
          identityServiceUrl,
          "/v1/auth/change-password",
          {
            method: "PUT",
            headers: {
              authorization,
              "content-type": "application/json",
            },
            body: JSON.stringify({ currentPassword, newPassword }),
            timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
          },
        );
        return NextResponse.json(result);
      } catch (error) {
        if (
          isForwardableServiceError(error) &&
          error instanceof ServiceHttpError
        ) {
          return NextResponse.json(
            serviceErrorPayload(error, "Không thể đổi mật khẩu"),
            { status: error.status },
          );
        }
        const reason = error instanceof Error ? error.message : "Unknown error";
        if (isMicroserviceStrictMode()) {
          return serviceUnavailableResponse("Identity Service", reason);
        }
        console.warn(
          "[BFF] Identity Service unavailable; using local change-password implementation.",
        );
      }
    }

    const authUser = await getAuthUser(request);
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 },
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: "Mật khẩu mới phải khác mật khẩu hiện tại." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, password: true },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Không tìm thấy tài khoản." },
        { status: 404 },
      );
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json(
        { message: "Mật khẩu hiện tại không chính xác." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return NextResponse.json({ message: "Đã đổi mật khẩu thành công." });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
      { status: 401 },
    );
  }
}
