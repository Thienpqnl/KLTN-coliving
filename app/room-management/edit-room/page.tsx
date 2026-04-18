import { RoomForm } from "@/app/host/room-form"
import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"

export default function EditRoomPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileHeader />
        <RoomForm />
      </main>
    </div>
  )
}