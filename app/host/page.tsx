"use client"

import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { StatCards } from "@/app/host/stat-cards"
import { RevenueChart } from "@/app/host/revenue-chart"
import { RecentBookings } from "@/app/host/recent-bookings"
import { CommunityPulse } from "@/app/host/community-pulse"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"
import { HostProtectedRoute } from "@/components/HostProtectedRoute"
import { useAuth } from "@/lib/hooks/useAuth"

function HostDashboardContent() {
  const { user } = useAuth()
  const displayName = user?.fullName || user?.name || user?.email || "chủ nhà"
  const today = new Date().toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <MobileHeader />
        
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <header className="mb-8">
            <p className="text-sm text-muted-foreground mb-1">Chào mừng trở lại, {displayName}</p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tổng quan vận hành</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Cộng đồng co-living của bạn đang được cập nhật theo dữ liệu thực. Đây là tóm tắt hiệu suất và các hoạt động mới nhất của{" "}
                  <span className="font-medium text-foreground">The Curated Hearth</span>.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-foreground" suppressHydrationWarning>{today}</p>
              </div>
            </div>
          </header>

          {/* Stat Cards */}
          <section className="mb-6">
            <StatCards />
          </section>

          {/* Charts and Widgets Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <RevenueChart />
            </div>
            <div className="space-y-4">
              <RecentBookings />
              <CommunityPulse />
            </div>
          </section>

          {/* Featured Property */}
          <section className="mb-6">
            <FeaturedProperty />
          </section>

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <HostProtectedRoute>
      <HostDashboardContent />
    </HostProtectedRoute>
  )
}
