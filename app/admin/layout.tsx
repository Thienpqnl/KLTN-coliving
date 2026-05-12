"use client"

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute"
import { AdminSidebar } from "./admin-sidebar"
import { AdminMobileHeader } from "./admin-mobile-header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProtectedRoute>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Mobile Header */}
          <AdminMobileHeader />
          
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Manage users, rooms, and system statistics
              </p>
            </header>

            {/* Content */}
            {children}
          </div>
        </main>
      </div>
    </AdminProtectedRoute>
  )
}
