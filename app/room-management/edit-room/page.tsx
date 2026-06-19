import { RoomForm } from "@/app/host/room-form"
import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Suspense } from "react"

export default function EditRoomPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileHeader />
        <Suspense fallback={<div>Đang tải...</div>}>
          <RoomForm />
        </Suspense>
      </main>
    </div>
  )
}
