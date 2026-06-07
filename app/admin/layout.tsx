"use client"

import { usePathname } from "next/navigation"
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute"
import { AdminSidebar } from "./admin-sidebar"
import { AdminMobileHeader } from "./admin-mobile-header"

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Quản lý người dùng",
  "/admin/reports": "Báo cáo hệ thống",
  "/admin/logs": "Nhật ký hệ thống",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "Bảng quản trị"

  return (
    <AdminProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />

        <main className="flex-1 overflow-auto">
          <AdminMobileHeader />

          <div className="mx-auto max-w-7xl p-4 lg:p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </header>

            {children}
          </div>
        </main>
      </div>
    </AdminProtectedRoute>
  )
}
