"use client"

import { useState } from "react"
import { Menu, X, Bell, Settings } from "lucide-react"
import Link from "next/link"

export function AdminMobileHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "User Management", href: "/admin/users" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Audit Logs", href: "/admin/logs" },
  ]

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="font-semibold text-foreground">Admin Panel</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
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
