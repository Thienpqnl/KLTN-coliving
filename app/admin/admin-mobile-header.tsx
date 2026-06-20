"use client"

import { useState } from "react"
import { Menu, X, Bell } from "lucide-react"
import Link from "next/link"

export function AdminMobileHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Quản lý người dùng", href: "/admin/users" },
    { label: "Duyệt phòng", href: "/admin/rooms" },
    { label: "Quản lý đánh giá", href: "/admin/reviews" },
    { label: "Báo cáo", href: "/admin/reports" },
    { label: "Nhật ký hệ thống", href: "/admin/logs" },
  ]

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="font-semibold text-foreground">Bảng quản trị</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors" aria-label="Thông báo">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="px-4 py-3 bg-secondary border-t border-border">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-tertiary hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
