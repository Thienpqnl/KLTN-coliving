import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { ContractsManagement } from "@/app/host/contracts"

export default function HostContractsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <MobileHeader />

        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* Content */}
          <ContractsManagement />

          {/* Footer */}
          <div className="mt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}
