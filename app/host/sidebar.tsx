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
  MessageSquare,
  BarChart3,
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
  { label: "Đặt phòng", icon: <CalendarCheck className="h-4 w-4" />, href: "/bookings" },
  { label: "Giao dịch", icon: <Receipt className="h-4 w-4" />, href: "/transactions" },
  { label: "Tin nhắn", icon: <MessageSquare className="h-4 w-4" />, href: "/chat" },
  { label: "Phân tích", icon: <BarChart3 className="h-4 w-4" />, href: "/analytics" },
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
    <aside className="hidden lg:flex w-56 flex-shrink-0 bg-card border-r border-border flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Cổng chủ nhà</h1>
            <p className="text-xs text-muted-foreground">Không gian quản lý</p>
          </div>
      
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
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
                      ? "bg-sidebar-accent text-accent font-medium"
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

      {/* Add Room Button */}
      <div className="px-3 pb-3">
        <Button asChild className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Link href="/room-management/add-room">
          <Plus className="h-4 w-4" />
          Thêm phòng mới
          </Link>
        </Button>
      </div>

      {/* Bottom Section */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
          Cài đặt
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
          Hỗ trợ
        </button>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          className="w-full flex cursor-pointer items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-expanded={isUserMenuOpen}
        >
          <Avatar className="h-9 w-9">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || "Tài khoản chủ nhà"}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isUserMenuOpen && "rotate-180")} />
        </button>
        {isUserMenuOpen && (
          <div className="mt-2 space-y-1">
            <Link
              href="/profile"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <UserRound className="h-4 w-4" />
              Xem trang cá nhân
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
