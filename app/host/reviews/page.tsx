"use client"

import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { HostReviewsManagement } from "./host-reviews-management"
import { HostProtectedRoute } from "@/components/HostProtectedRoute"

function HostReviewsContent() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-auto">
        <MobileHeader />

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 lg:p-8">
          <HostReviewsManagement />

          <div className="mt-auto pt-12">
            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HostReviewsPage() {
  return (
    <HostProtectedRoute>
      <HostReviewsContent />
    </HostProtectedRoute>
  )
}
