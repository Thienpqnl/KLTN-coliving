import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/app/host/footer';
import { MobileHeader } from '@/app/host/mobile-header';
import { Sidebar } from '@/app/host/sidebar';
import { TenantsManagement } from '@/app/host/tenants';
import { HostProtectedRoute } from '@/components/HostProtectedRoute';

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function RoomTenantsPage({ params }: Props) {
  const { roomId } = await params;
  return (
    <HostProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/45 to-sky-50/60">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          <MobileHeader />
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 lg:p-8">
            <Link href="/room-management/tenants" className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"><ArrowLeft className="h-4 w-4" />Danh sách phòng</Link>
            <TenantsManagement roomId={roomId} />
            <div className="mt-auto pt-12"><Footer /></div>
          </div>
        </main>
      </div>
    </HostProtectedRoute>
  );
}
