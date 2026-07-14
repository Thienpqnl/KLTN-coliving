import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { RoomStatCards } from "@/app/host/room-stat-cards"
import { RoomsTable } from "@/app/host/room-table"
import { FeaturedProperty } from "@/app/host/featured-property"
import { Footer } from "@/app/host/footer"
import Link from "next/link"
export default function RoomManagementPage() {
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
              Cổng quản lý
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
                  Quản lý phòng
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Tạo mới và quản lý tất cả phòng trong không gian co-living của{" "}
                  <span className="font-medium text-foreground">NhàHợp</span>.
                </p>
              </div>
                     <Link href="/room-management/add-room">
                <button className="cursor-pointer rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:from-orange-500 hover:to-amber-400">
                  + Thêm phòng mới
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
              <h2 className="text-xl font-black text-slate-900 mb-1">Danh sách phòng đang quản lý</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2">
                  <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                    Tất cả phòng
                  </button>
                  <button className="rounded-full border border-orange-100 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                    Đã đặt
                  </button>
                  <button className="rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                    Còn trống
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Tìm phòng..."
                  className="rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
