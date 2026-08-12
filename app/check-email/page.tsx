import type { Metadata } from "next";
import { Suspense } from "react";
import CheckEmailContent from "./CheckEmailContent";

export const metadata: Metadata = {
  title: "Kiểm tra email",
  description: "Kiểm tra email để kích hoạt tài khoản NhàHợp.",
};

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <CheckEmailContent />
    </Suspense>
  );
}
