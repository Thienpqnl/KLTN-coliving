"use client"

import { Sidebar } from "@/app/host/sidebar"
import { MobileHeader } from "@/app/host/mobile-header"
import { Footer } from "@/app/host/footer"
import { HostReviewsManagement } from "./host-reviews-management"
import { HostProtectedRoute } from "@/components/HostProtectedRoute"

function HostReviewsContent() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <MobileHeader />

        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          <HostReviewsManagement />

          <div className="mt-12">
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
