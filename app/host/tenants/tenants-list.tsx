'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Eye, LogOut, Mail, Phone, UsersRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { occupancyClient, type Occupant } from '@/lib/services/occupancy-client.service';

interface TenantsListProps {
  roomId: string;
  onSelectTenant?: (tenant: Occupant) => void;
  onTerminate?: (occupancyId: string, tenantName: string) => void;
}

function displayName(tenant: Occupant) {
  return tenant.user?.fullName || tenant.user?.name || tenant.user?.email || 'Thành viên';
}

export function TenantsList({ roomId, onSelectTenant, onTerminate }: TenantsListProps) {
  const [tenants, setTenants] = useState<Occupant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void occupancyClient.getRoomOccupants(roomId)
      .then((items) => setTenants(items.filter((item) => item.status === 'ACTIVE')))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Không thể tải thành viên'))
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) return <div className="space-y-3">{[0, 1].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}</div>;
  if (error) return <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4"><AlertCircle className="h-5 w-5 text-red-600" /><div><p className="font-bold text-red-900">Không thể tải dữ liệu</p><p className="text-sm text-red-700">{error}</p></div></div>;
  if (tenants.length === 0) return <div className="flex min-h-52 flex-col items-center justify-center text-center"><UsersRound className="h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-800">Phòng chưa có thành viên</p><p className="mt-1 max-w-md text-sm text-slate-500">Người thuê sẽ xuất hiện tại đây sau khi hợp đồng được ký và hai bên hoàn tất bàn giao phòng.</p></div>;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_180px_150px] gap-4 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span>Thành viên</span><span>Liên hệ</span><span>Ngày vào ở</span><span className="text-right">Thao tác</span>
      </div>
      <div className="divide-y divide-slate-200">
        {tenants.map((tenant) => {
          const name = displayName(tenant);
          const initials = name.split(' ').filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
          return (
            <div key={tenant.id} className="grid grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_180px_150px] items-center gap-4 px-5 py-4 hover:bg-orange-50/40">
              <div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={tenant.user?.avatarUrl} alt={name} /><AvatarFallback className="bg-orange-100 text-orange-800">{initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-bold text-slate-950">{name}</p><span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Đang ở</span></div></div>
              <div className="min-w-0 space-y-1 text-sm text-slate-600">{tenant.user?.email && <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4" />{tenant.user.email}</p>}{tenant.user?.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{tenant.user.phone}</p>}</div>
              <p className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4" />{new Date(tenant.joinedAt).toLocaleDateString('vi-VN')}</p>
              <div className="flex justify-end gap-2"><button onClick={() => onSelectTenant?.(tenant)} title="Xem chi tiết" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"><Eye className="h-4 w-4" /></button><button onClick={() => onTerminate?.(tenant.id, name)} title="Kết thúc cư trú" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" /></button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
