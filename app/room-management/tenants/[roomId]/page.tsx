import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { TenantsManagement } from "@/app/host/tenants"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{
    roomId: string
  }>
}

export default async function RoomTenantsPage({ params }: Props) {
  const { roomId } = await params
  
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  })

  if (!room) {
    notFound()
  }

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
              href="/room-management/tenants"
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
          </header>

          {/* Content */}
          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <TenantsManagement roomId={roomId} roomTitle={room.title} />
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
