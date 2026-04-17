import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { RoomStatCards } from "@/app/host/room-stat-cards"
import { RoomsTable } from "@/app/host/room-table"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"
import Link from "next/link"
export default function RoomManagementPage() {
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
            <p className="text-sm text-muted-foreground mb-1">Management Portal</p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Room Management</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Create and manage all the rooms in your co-living space. Browse every room in{" "}
                  <span className="font-medium text-foreground">The Curated Hearth</span>.
                </p>
              </div>
                     <Link href="/room-management/add-room">
                <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors">
                  + Add New Room
                </button>
              </Link>
            </div>
          </header>

          {/* Stat Cards */}
          <section className="mb-8">
            <RoomStatCards />
          </section>

          {/* Active Inventory Section */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-1">Active Inventory</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    All Rooms
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                    Booked
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                    Empty
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search room..."
                  className="px-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <RoomsTable />
          </section>

          {/* Featured Property */}
          <section className="mb-8">
            <FeaturedProperty />
          </section>

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  )
}