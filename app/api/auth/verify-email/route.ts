import { NextResponse } from "next/server";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";
import { serviceUnavailableResponse } from "@/lib/microservices/bff-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu xác minh không hợp lệ." }, { status: 400 });
  }

  const proxied = await tryProxyIdentityServiceRaw({
    path: "/v1/auth/email-verification/confirm",
    method: "POST",
    body,
    fallbackMessage: "Không thể kích hoạt tài khoản",
  });

  return proxied ?? serviceUnavailableResponse(
    "Identity Service",
    "Kích hoạt tài khoản chỉ được xử lý bởi Identity Service",
  );
}
