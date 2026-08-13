import { Footer } from '@/app/host/footer';
import { MembersOverview } from '@/app/host/tenants/members-overview';
import { MobileHeader } from '@/app/host/mobile-header';
import { Sidebar } from '@/app/host/sidebar';
import { HostProtectedRoute } from '@/components/HostProtectedRoute';

export default function TenantsManagementPage() {
  return (
    <HostProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          <MobileHeader />
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 lg:p-8">
            <MembersOverview />
            <div className="mt-auto pt-12"><Footer /></div>
          </div>
        </main>
      </div>
    </HostProtectedRoute>
  );
}
