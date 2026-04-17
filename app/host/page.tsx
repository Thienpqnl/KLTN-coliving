import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { StatCards } from "@/app/host/stat-cards"
import { RevenueChart } from "@/app/host/revenue-chart"
import { RecentBookings } from "@/app/host/recent-bookings"
import { CommunityPulse } from "@/app/host/community-pulse"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"

export default function DashboardPage() {
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
            <p className="text-sm text-muted-foreground mb-1">Welcome back, Johan</p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Your co-living community is thriving. Here&apos;s a summary of your performance and upcoming milestones for{" "}
                  <span className="font-medium text-foreground">The Curated Hearth</span>.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-foreground">Oct 24, 2024</p>
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
