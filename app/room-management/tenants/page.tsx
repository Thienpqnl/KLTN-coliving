import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TenantsManagementPage() {
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
            <Link
              href="/room-management"
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại quản lý phòng
            </Link>
            <h1 className="mb-2 bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
              Quản lý người thuê
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Chọn một phòng bên dưới để xem danh sách người thuê, lịch sử, hoặc thêm người thuê mới.
            </p>
          </header>

          {/* Info Box */}
          <div className="rounded-[2rem] bg-sky-50/80 border border-sky-200 p-6 mb-8 shadow-lg shadow-sky-100/60">
            <h3 className="font-semibold text-blue-900 mb-2">Cách sử dụng</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Chọn một phòng để xem danh sách người thuê hiện tại</li>
              <li>• Xem chi tiết từng người thuê (thông tin liên hệ, ngày bắt đầu, v.v.)</li>
              <li>• Thêm người thuê mới khi tạo hợp đồng hoặc owner duyệt yêu cầu</li>
              <li>• Chấm dứt thuê (không xóa record, chỉ cập nhật trạng thái)</li>
              <li>• Xem lịch sử tất cả những người thuê trước đây</li>
            </ul>
          </div>

          {/* Coming Soon */}
          <div className="rounded-[2rem] border-2 border-dashed border-orange-200 bg-white/75 p-12 text-center shadow-lg shadow-slate-200/60">
            <p className="text-slate-600 mb-4">
              Để sử dụng chức năng này, vui lòng:
            </p>
            <Link
              href="/room-management"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-100 transition hover:from-orange-500 hover:to-amber-400"
            >
              Quay lại và chọn một phòng
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}
