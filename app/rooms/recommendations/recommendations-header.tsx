"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, SlidersHorizontal } from "lucide-react";

export function RecommendationsHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="Quay lại trang trước"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <Link
            href="/preferences"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Chỉnh sửa tiêu chí
          </Link>
        </div>

        <Link href="/" className="text-2xl font-black tracking-tight text-slate-950">
          NhàHợp
        </Link>

        <div className="flex justify-end">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Link>
        </div>
      </div>
    </header>
  );
}
