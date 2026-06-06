'use client';

import { useEffect, useState } from 'react';
import { occupancyClient, type OccupantDetails } from '@/lib/services/occupancy-client.service';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Mail, Phone, MapPin, Calendar, Building2, AlertCircle, Loader } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';

interface TenantDetailsModalProps {
  occupancyId: string;
  onClose: () => void;
}

export function TenantDetailsModal({ occupancyId, onClose }: TenantDetailsModalProps) {
  const [tenant, setTenant] = useState<OccupantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const data = await occupancyClient.getOccupantDetails(occupancyId);
        setTenant(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant details');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [occupancyId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 flex items-center justify-center">
          <Loader className="h-5 w-5 animate-spin text-orange-600" />
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold">Chi tiết người thuê</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 flex gap-3 bg-red-50 border-l-4 border-red-600">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error || 'Không tìm thấy dữ liệu'}</p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold">Chi tiết người thuê</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="text-center">
            <Avatar className="h-16 w-16 mx-auto mb-3">
              {tenant.user.avatarUrl && (
                <AvatarImage src={tenant.user.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <p className="text-lg font-bold text-slate-900">{displayName || 'Người dùng ẩn danh'}</p>
            <p className="text-sm text-slate-500 mt-1">{tenant.user.email}</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Thông tin liên hệ</h3>

            {tenant.user.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Số điện thoại</p>
                  <p className="text-sm text-slate-900">{tenant.user.phone}</p>
                </div>
              </div>
            )}

            {tenant.user.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Địa chỉ</p>
                  <p className="text-sm text-slate-900">{tenant.user.address}</p>
                </div>
              </div>
            )}

            {tenant.user.birthDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Ngày sinh</p>
                  <p className="text-sm text-slate-900">
                    {new Date(tenant.user.birthDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            )}

            {tenant.user.gender && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Giới tính</p>
                <p className="text-sm text-slate-900">
                  {tenant.user.gender === 'MALE' ? 'Nam' : tenant.user.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                </p>
              </div>
            )}
          </div>

          {/* Room Info */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Thông tin phòng</h3>

            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-600">Phòng</p>
                <p className="text-sm font-medium text-slate-900">{tenant.room.title}</p>
                <p className="text-xs text-slate-500 mt-1">{tenant.room.address}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Giá thuê</p>
              <p className="text-sm font-medium text-orange-600">
                {(tenant.room.priceValue || 0).toLocaleString('vi-VN')} VNĐ/tháng
              </p>
            </div>
          </div>

          {/* Occupancy Info */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Thông tin thuê</h3>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-600">Từ ngày</p>
                <p className="text-sm text-slate-900">
                  {new Date(tenant.joinedAt).toLocaleDateString('vi-VN')} ({joinedText})
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Trạng thái</p>
              <span
                className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {tenant.status === 'ACTIVE' ? 'Đang ở' : 'Không hoạt động'}
              </span>
            </div>

            {tenant.notes && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Ghi chú</p>
                <p className="text-sm text-slate-700">{tenant.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
