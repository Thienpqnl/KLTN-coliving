import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { ContractsManagement } from "@/app/host/contracts"

export default function HostContractsPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Mobile Header */}
        <MobileHeader />

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 lg:p-8">
          {/* Content */}
          <ContractsManagement />

          {/* Footer */}
          <div className="mt-auto pt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}
