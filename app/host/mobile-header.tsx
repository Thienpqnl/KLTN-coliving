"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Menu,
  X,
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Receipt,
  MessageSquare,
  BarChart3,
  Plus,
  Settings,
  HelpCircle,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, active: true },
  { label: "Room Management", icon: <BedDouble className="h-4 w-4" /> },
  { label: "Bookings", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Transactions", icon: <Receipt className="h-4 w-4" /> },
  { label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden">
      {/* Mobile Top Bar */}
      <div className="flex items-center  justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Management Portal</h1>
            <p className="text-xs text-muted-foreground">Port Workspace</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="font-semibold text-sm text-foreground">Management Portal</h1>
                  <p className="text-xs text-muted-foreground">Port Workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        item.active
                          ? "bg-sidebar-accent text-accent font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </li>
                ))}
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
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" />
                  <AvatarFallback>JH</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Johan Hearth</p>
                  <p className="text-xs text-muted-foreground">Co-founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
