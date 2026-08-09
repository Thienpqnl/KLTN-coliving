import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

export const metadata: Metadata = {
  title: "Kích hoạt tài khoản",
  description: "Xác minh email và kích hoạt tài khoản NhàHợp.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
