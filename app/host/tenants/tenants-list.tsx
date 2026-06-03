'use client';

import { useEffect, useState } from 'react';
import { occupancyClient, type Occupant } from '@/lib/services/occupancy-client.service';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TenantsListProps {
  roomId: string;
  onSelectTenant?: (tenant: Occupant) => void;
  onTerminate?: (occupancyId: string, tenantName: string) => void;
}

export function TenantsList({ roomId, onSelectTenant, onTerminate }: TenantsListProps) {
  const [tenants, setTenants] = useState<Occupant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const data = await occupancyClient.getRoomOccupants(roomId);
        setTenants(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenants');
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [roomId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-900">Lỗi tải dữ liệu</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
        <p className="text-slate-500 text-sm">Chưa có người thuê nào trong phòng này</p>
      </div>
    );
  }

  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE');
  const inactiveTenants = tenants.filter((t) => t.status === 'INACTIVE');

  return (
    <div className="space-y-6">
      {/* Active Tenants */}
      {activeTenants.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
            Người thuê hiện tại ({activeTenants.length})
          </h3>
          <div className="space-y-3">
            {activeTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onSelect={onSelectTenant}
                onTerminate={onTerminate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Tenants */}
      {inactiveTenants.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
            Người thuê trước đây ({inactiveTenants.length})
          </h3>
          <div className="space-y-3">
            {inactiveTenants.map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} onSelect={onSelectTenant} inactive />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TenantCard({
  tenant,
  onSelect,
  onTerminate,
  inactive = false,
}: {
  tenant: Occupant;
  onSelect?: (tenant: Occupant) => void;
  onTerminate?: (occupancyId: string, tenantName: string) => void;
  inactive?: boolean;
}) {
  const displayName = tenant.user.fullName || tenant.user.name;
  const initials = displayName
    ?.split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const joinedDate = new Date(tenant.joinedAt);
  const joinedText = formatDistanceToNow(joinedDate, { addSuffix: true, locale: vi });

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        inactive ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-orange-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className={`h-10 w-10 flex-shrink-0 ${inactive ? 'opacity-60' : ''}`}>
            {tenant.user.avatarUrl && (
              <AvatarImage src={tenant.user.avatarUrl} alt={displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p
              className={`font-medium text-sm leading-tight ${
                inactive ? 'text-slate-600' : 'text-slate-900'
              }`}
            >
              {displayName || 'Người dùng ẩn danh'}
            </p>

            <div className={`mt-2 space-y-1 text-xs ${inactive ? 'text-slate-500' : 'text-slate-600'}`}>
              {tenant.user.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{tenant.user.email}</span>
                </div>
              )}
              {tenant.user.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{tenant.user.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Từ {joinedText}</span>
            </div>

            {inactive && tenant.terminatedAt && (
              <div className="mt-2 flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                <div className="text-xs text-slate-600">
                  <p>
                    Chấm dứt:{' '}
                    {formatDistanceToNow(new Date(tenant.terminatedAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                  {tenant.terminationReason && (
                    <p className="text-slate-500 mt-0.5">Lý do: {tenant.terminationReason}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            {inactive ? (
              <XCircle className="h-4 w-4 text-slate-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <span className="text-xs font-medium text-slate-600">
              {inactive ? 'Không hoạt động' : 'Đang ở'}
            </span>
          </div>

          {!inactive && (
            <div className="flex gap-2">
              <button
                onClick={() => onSelect?.(tenant)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="Xem chi tiết"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onTerminate?.(tenant.id, displayName || 'Người dùng ẩn danh')}
                className="p-1.5 rounded hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                title="Chấm dứt thuê"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
