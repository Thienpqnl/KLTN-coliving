"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";

type ResendResult = {
  message?: string;
  error?: string;
  devVerificationUrl?: string;
};

export default function CheckEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devVerificationUrl, setDevVerificationUrl] = useState("");

  useEffect(() => {
    setDevVerificationUrl(sessionStorage.getItem("verificationDevUrl") || "");
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resendVerification() {
    if (!email || isSending || cooldown > 0) return;
    setIsSending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as ResendResult;
      if (!response.ok) {
        setError(payload.message || payload.error || "Không thể gửi lại email kích hoạt.");
        return;
      }
      setMessage(payload.message || "Email kích hoạt đã được gửi lại.");
      setCooldown(60);
      if (payload.devVerificationUrl) {
        setDevVerificationUrl(payload.devVerificationUrl);
        sessionStorage.setItem("verificationDevUrl", payload.devVerificationUrl);
      }
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <AuthHeader page="check-email" />
      <main className="min-h-screen bg-slate-50 px-6 pb-16 pt-28">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-10 shadow-xl shadow-slate-900/5">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>

          <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-slate-950">Kiểm tra email của bạn</h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Chúng tôi đã gửi liên kết kích hoạt đến
            {email ? <strong className="ml-1 text-slate-900">{email}</strong> : " email bạn đăng ký"}.
            Hãy mở liên kết để hoàn tất đăng ký.
          </p>

          {!searchParams.get("email") && (
            <label className="mt-6 block text-left">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Địa chỉ email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@example.com"
                className="h-13 w-full rounded-lg border border-slate-200 bg-slate-50 px-5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
          )}

          <div className="mt-7 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p>Liên kết có hiệu lực trong 24 giờ và chỉ sử dụng được một lần. Hãy kiểm tra cả thư mục Spam hoặc Thư rác.</p>
          </div>

          {message && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div>}
          {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

          <div className="mt-7 flex items-center gap-3">
            <button
              type="button"
              onClick={resendVerification}
              disabled={!email || isSending || cooldown > 0}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSending ? "animate-spin" : ""}`} />
              {isSending ? "Đang gửi..." : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
            </button>
            {devVerificationUrl && (
              <Link href={devVerificationUrl} className="inline-flex h-12 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-6 text-sm font-bold text-orange-800 hover:bg-orange-100">
                Mở link thử nghiệm
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
