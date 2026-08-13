'use client';

import { useEffect, useState } from 'react';
import { History, UsersRound } from 'lucide-react';
import { occupancyClient, type Occupant } from '@/lib/services/occupancy-client.service';
import { TenantDetailsModal } from './tenant-details-modal';
import { TenantHistory } from './tenant-history';
import { TenantsList } from './tenants-list';
import { TerminateTenantModal } from './terminate-tenant-modal';

interface TenantsManagementProps {
  roomId: string;
  roomTitle?: string;
}

export function TenantsManagement({ roomId, roomTitle }: TenantsManagementProps) {
  const [view, setView] = useState<'list' | 'history'>('list');
  const [title, setTitle] = useState(roomTitle || 'Chi tiết thành viên');
  const [capacity, setCapacity] = useState<{ current: number; max: number } | null>(null);
  const [selectedOccupancyId, setSelectedOccupancyId] = useState<string | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<{ id: string; name: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void occupancyClient.getHostOverview().then((overview) => {
      const room = overview.rooms.find((item) => item.id === roomId);
      if (room) {
        setTitle(room.title || 'Chi tiết thành viên');
        setCapacity({ current: room.currentOccupants, max: room.maxOccupants });
      }
    }).catch(() => undefined);
  }, [refreshKey, roomId]);

  const handleTerminate = (occupancyId: string, tenantName: string) => {
    setTerminateTarget({ id: occupancyId, name: tenantName });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">Thành viên trong phòng</p>
          <h1 className="mt-2 bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-3xl font-black tracking-tight text-transparent">{title}</h1>
        </div>
        {capacity && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            <UsersRound className="h-5 w-5" />
            <div><p className="text-xs font-bold uppercase tracking-wider">Sức chứa</p><p className="text-sm font-black">{capacity.current}/{capacity.max} người</p></div>
          </div>
        )}
      </header>

      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        <button onClick={() => setView('list')} className={`rounded-md px-4 py-2 text-sm font-bold ${view === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Đang ở</button>
        <button onClick={() => setView('history')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${view === 'history' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><History className="h-4 w-4" />Lịch sử cư trú</button>
      </div>

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-200/60 backdrop-blur" key={refreshKey}>
        {view === 'list' ? (
          <TenantsList
            roomId={roomId}
            onSelectTenant={(tenant: Occupant) => setSelectedOccupancyId(tenant.id)}
            onTerminate={handleTerminate}
          />
        ) : <TenantHistory roomId={roomId} />}
      </section>

      {selectedOccupancyId && <TenantDetailsModal occupancyId={selectedOccupancyId} onClose={() => setSelectedOccupancyId(null)} />}
      {terminateTarget && (
        <TerminateTenantModal
          occupancyId={terminateTarget.id}
          tenantName={terminateTarget.name}
          onClose={() => setTerminateTarget(null)}
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
      )}
    </div>
  );
}
