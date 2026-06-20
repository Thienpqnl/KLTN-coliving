"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  BarChart3,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Users,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/useAuth"

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, href: "/admin" },
  { label: "Quản lý người dùng", icon: <Users className="h-4 w-4" />, href: "/admin/users" },
  { label: "Duyệt phòng", icon: <Building2 className="h-4 w-4" />, href: "/admin/rooms" },
  { label: "Quản lý đánh giá", icon: <MessageSquareText className="h-4 w-4" />, href: "/admin/reviews" },
  { label: "Báo cáo", icon: <BarChart3 className="h-4 w-4" />, href: "/admin/reports" },
  { label: "Nhật ký hệ thống", icon: <FileText className="h-4 w-4" />, href: "/admin/logs" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <aside className="hidden h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-card lg:flex sticky top-0">
      <div className="border-b border-border p-4">
        <Link href="/admin" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Bảng quản trị</h1>
            <p className="text-xs text-muted-foreground">Hệ thống</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-red-100 font-medium text-red-700"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 pb-2">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Settings className="h-4 w-4" />
          Cài đặt
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
          Hỗ trợ
        </button>
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </div>
    </aside>
  )
}
