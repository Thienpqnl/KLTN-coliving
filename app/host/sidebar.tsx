"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Receipt,
  Star,
  Plus,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  UserRound,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/useAuth"

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

const navItems: NavItem[] = [
  { label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" />, href: "/host" },
  { label: "Quản lý phòng", icon: <BedDouble className="h-4 w-4" />, href: "/room-management" },
  { label: "Hợp đồng", icon: <CalendarCheck className="h-4 w-4" />, href: "/host/contracts" },
  { label: "Đặt phòng", icon: <CalendarCheck className="h-4 w-4" />, href: "/bookings" },
  { label: "Đánh giá", icon: <Star className="h-4 w-4" />, href: "/host/reviews" },
  { label: "Giao dịch", icon: <Receipt className="h-4 w-4" />, href: "/transactions" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const displayName = user?.fullName || user?.name || user?.email || "Chủ nhà"
  const fallback =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HN"

  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col h-screen sticky top-0 overflow-hidden border-r border-orange-100/70 bg-slate-950 text-white shadow-2xl shadow-slate-950/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-orange-500/25 via-amber-300/10 to-sky-400/10" />
      <div className="relative p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 flex items-center justify-center shadow-lg shadow-orange-950/40">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white">Cổng chủ nhà</h1>
            <p className="text-xs text-slate-300">Không gian quản lý</p>
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-white text-orange-700 font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
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

      <div className="relative px-3 pb-3">
        <Button asChild className="w-full cursor-pointer bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400 gap-2 shadow-lg shadow-orange-950/30">
          <Link href="/room-management/add-room">
            <Plus className="h-4 w-4" />
            Thêm phòng mới
          </Link>
        </Button>
      </div>

      <div className="relative px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
          <Settings className="h-4 w-4" />
          Cài đặt
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
          <HelpCircle className="h-4 w-4" />
          Hỗ trợ
        </button>
      </div>

      <div className="relative p-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          className="w-full flex cursor-pointer items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          aria-expanded={isUserMenuOpen}
        >
          <Avatar className="h-9 w-9 ring-2 ring-orange-300/40">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-orange-100 text-orange-800">{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-300">{user?.email || "Tài khoản chủ nhà"}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-slate-300 transition-transform", isUserMenuOpen && "rotate-180")} />
        </button>
        {isUserMenuOpen && (
          <div className="mt-2 space-y-1">
            <Link
              href="/profile"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <UserRound className="h-4 w-4" />
              Xem trang cá nhân
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15 hover:text-red-100"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
