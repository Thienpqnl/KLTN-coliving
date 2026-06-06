import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TenantsManagementPage() {
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
            <Link
              href="/room-management"
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại quản lý phòng
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Quản lý người thuê
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Chọn một phòng bên dưới để xem danh sách người thuê, lịch sử, hoặc thêm người thuê mới.
            </p>
          </header>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 mb-8">
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
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-600 mb-4">
              Để sử dụng chức năng này, vui lòng:
            </p>
            <Link
              href="/room-management"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Quay lại và chọn một phòng
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}
