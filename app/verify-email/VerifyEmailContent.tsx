"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailWarning } from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const requested = useRef(false);
  const [state, setState] = useState<VerificationState>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token
      ? "Đang xác minh địa chỉ email của bạn..."
      : "Liên kết kích hoạt đang thiếu token xác thực.",
  );

  useEffect(() => {
    if (requested.current) return;
    if (!token) return;
    requested.current = true;

    async function verify() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setState("error");
          setMessage(payload.message || payload.error || "Không thể kích hoạt tài khoản.");
          return;
        }
        sessionStorage.removeItem("verificationDevUrl");
        setState("success");
        setMessage(payload.message || "Kích hoạt tài khoản thành công.");
      } catch {
        setState("error");
        setMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      }
    }

    void verify();
  }, [token]);

  return (
    <>
      <AuthHeader page="verify-email" />
      <main className="min-h-screen bg-slate-50 px-6 pb-16 pt-28">
        <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white px-10 py-14 text-center shadow-xl shadow-slate-900/5">
          {state === "loading" ? (
            <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-orange-600" />
          ) : state === "success" ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          ) : (
            <MailWarning className="mx-auto h-14 w-14 text-red-500" />
          )}

          <h1 className="mt-6 text-3xl font-extrabold text-slate-950">
            {state === "loading" ? "Đang kích hoạt tài khoản" : state === "success" ? "Tài khoản đã được kích hoạt" : "Không thể kích hoạt"}
          </h1>
          <p className="mt-3 leading-relaxed text-slate-600">{message}</p>

          {state === "success" && (
            <Link href="/login" className="mt-8 inline-flex h-12 items-center rounded-full bg-orange-600 px-7 font-bold text-white hover:bg-orange-700">
              Đăng nhập ngay
            </Link>
          )}
          {state === "error" && (
            <Link href="/check-email" className="mt-8 inline-flex h-12 items-center rounded-full bg-slate-950 px-7 font-bold text-white hover:bg-slate-800">
              Yêu cầu email mới
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
