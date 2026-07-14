"use client";

import Link from "next/link";
import { ClipboardCheck, LogOut } from "lucide-react";
import { CommunityManagerProtectedRoute } from "@/components/CommunityManagerProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";

export default function CommunityManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const displayName = user?.fullName || user?.name || user?.email || "Community Manager";

  return (
    <CommunityManagerProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-6 lg:block">
          <Link href="/community-manager" className="font-headline text-xl font-black text-orange-900">
            NhàHợp
          </Link>
          <div className="mt-8 rounded-2xl bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Nhân viên cộng đồng</p>
            <p className="mt-1 truncate font-bold text-slate-900">{displayName}</p>
          </div>
          <nav className="mt-8 space-y-2">
            <Link href="/community-manager" className="flex items-center gap-3 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white">
              <ClipboardCheck className="h-4 w-4" />
              Xác minh phòng
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => void logout()}
            className="absolute bottom-6 left-6 right-6 flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </aside>

        <main className="lg:pl-72">
          <div className="mx-auto max-w-7xl p-4 lg:p-8">
            <header className="mb-8">
              <p className="text-sm font-bold uppercase tracking-wider text-orange-700">Community Manager</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Xác minh hồ sơ phòng</h1>
            </header>
            {children}
          </div>
        </main>
      </div>
    </CommunityManagerProtectedRoute>
  );
}
