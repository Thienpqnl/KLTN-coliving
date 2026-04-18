import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { BookingStatCards } from "@/app/host/booking-stat-cards"
import { BookingsTable } from "@/app/host/bookings-table"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"

export default function BookingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <MobileHeader />

        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <header className="mb-8">
            <p className="text-sm text-muted-foreground mb-1">Management</p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bookings Management</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Review and curate incoming stay requests. Ensure each resident aligns with the community spirit of{" "}
                  <span className="font-medium text-foreground">The Curated Hearth</span>.
                </p>
              </div>
            </div>
          </header>

          {/* Stat Cards */}
          <BookingStatCards />

          {/* Bookings Table */}
          <BookingsTable />

          {/* Featured Property */}
          <div className="mt-12">
            <FeaturedProperty />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  )
}