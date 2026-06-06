'use client';

import { useEffect, useState } from 'react';
import { occupancyClient, type Occupant } from '@/lib/services/occupancy-client.service';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface TenantHistoryProps {
  roomId: string;
}

export function TenantHistory({ roomId }: TenantHistoryProps) {
  const [history, setHistory] = useState<Occupant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await occupancyClient.getOccupancyHistory(roomId);
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [roomId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-lg" />
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

  if (history.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
        <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Chưa có lịch sử người thuê nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((record) => (
        <HistoryItem key={record.id} record={record} />
      ))}
    </div>
  );
}

function HistoryItem({ record }: { record: Occupant }) {
  const displayName = record.user.fullName || record.user.name;
  const isActive = record.status === 'ACTIVE';

  const joinedDate = new Date(record.joinedAt);
  const joinedText = formatDistanceToNow(joinedDate, { addSuffix: true, locale: vi });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isActive ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-slate-400" />
            )}
            <p className="font-medium text-slate-900">{displayName || 'Người dùng ẩn danh'}</p>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isActive ? 'Đang ở' : 'Đã rời'}
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-2">{record.user.email}</p>

          <div className="space-y-1 text-xs text-slate-600">
            <p>
              <strong>Ngày bắt đầu:</strong>{' '}
              {new Date(record.joinedAt).toLocaleDateString('vi-VN')} ({joinedText})
            </p>

            {record.terminatedAt && (
              <>
                <p>
                  <strong>Ngày chấm dứt:</strong>{' '}
                  {formatDistanceToNow(new Date(record.terminatedAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
                {record.terminationReason && (
                  <p>
                    <strong>Lý do:</strong> {record.terminationReason}
                  </p>
                )}
              </>
            )}

            {record.notes && (
              <p>
                <strong>Ghi chú:</strong> {record.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {isActive && (
            <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-xs font-medium text-green-800">
              Hiện tại
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
