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
              href="/room-management/tenants"
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
          </header>

          {/* Content */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <TenantsManagement roomId={roomId} roomTitle={room.title} />
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
