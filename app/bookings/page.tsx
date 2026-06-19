import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { BookingStatCards } from "@/app/host/booking-stat-cards"
import { BookingsTable } from "@/app/host/bookings-table"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"
import { HostProtectedRoute } from "@/components/HostProtectedRoute"

export default function BookingsPage() {
  return (
    <HostProtectedRoute>
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
            <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">Quản lý</p>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
                    Quản lý đặt phòng
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                    Theo dõi, xác nhận và xử lý các yêu cầu đặt phòng mới cho{" "}
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
    </HostProtectedRoute>
  )
}
