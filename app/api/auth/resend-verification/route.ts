import { NextResponse } from "next/server";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";
import { serviceUnavailableResponse } from "@/lib/microservices/bff-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const proxied = await tryProxyIdentityServiceRaw({
    path: "/v1/auth/email-verification/resend",
    method: "POST",
    body,
    fallbackMessage: "Không thể gửi lại email kích hoạt",
  });

  return proxied ?? serviceUnavailableResponse(
    "Identity Service",
    "Gửi lại email kích hoạt chỉ được xử lý bởi Identity Service",
  );
}
