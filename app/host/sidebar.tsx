"use client"

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
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface NavItem {
  label: string
  icon: React.ReactNode
href: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, href: "/" },
  { label: "Room Management", icon: <BedDouble className="h-4 w-4" />, href: "/room-management" },
  { label: "Bookings", icon: <CalendarCheck className="h-4 w-4" />, href: "/bookings" },
  { label: "Transactions", icon: <Receipt className="h-4 w-4" />, href: "/transactions" },
  { label: "Chat", icon: <MessageSquare className="h-4 w-4" />, href: "/chat" },
  { label: "Analytics", icon: <BarChart3 className="h-4 w-4" />, href: "/analytics" },
]
export function Sidebar() {
   const pathname = usePathname()
  return (
    <aside className="hidden lg:flex w-56 flex-shrink-0 bg-card border-r border-border flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Management Portal</h1>
            <p className="text-xs text-muted-foreground">Port Workspace</p>
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
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Plus className="h-4 w-4" />
          Add New Room
        </Button>
      </div>

      {/* Bottom Section */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
          Support
        </button>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-border">
        <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" />
            <AvatarFallback>JH</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">Johan Hearth</p>
            <p className="text-xs text-muted-foreground">Co-founder</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </aside>
  )
}
