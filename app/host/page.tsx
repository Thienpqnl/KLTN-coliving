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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Mobile Header */}
        <MobileHeader />
        
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 lg:p-8">
          {/* Header */}
          <header className="mb-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              Chào mừng trở lại, {displayName}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
                  Tổng quan vận hành
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Cộng đồng co-living của bạn đang được cập nhật theo dữ liệu thực. Đây là tóm tắt hiệu suất và các hoạt động mới nhất của{" "}
                  <span className="font-medium text-foreground">NhàHợp</span>.
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-left sm:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Hôm nay</p>
                <p className="text-sm font-semibold text-slate-900" suppressHydrationWarning>{today}</p>
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
