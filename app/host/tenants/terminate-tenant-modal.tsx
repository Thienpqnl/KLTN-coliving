'use client';

import { useState } from 'react';
import { occupancyClient } from '@/lib/services/occupancy-client.service';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TerminateTenantModalProps {
  occupancyId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TerminateTenantModal({
  occupancyId,
  tenantName,
  onClose,
  onSuccess,
}: TerminateTenantModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTerminate = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do chấm dứt thuê');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await occupancyClient.terminateOccupancy(occupancyId, reason);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate occupancy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold">Chấm dứt hợp đồng thuê</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm text-slate-700">
                Đã chấm dứt hợp đồng thuê cho <strong>{tenantName}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  Bạn sắp chấm dứt hợp đồng thuê cho <strong>{tenantName}</strong>. Hành động này không
                  thể hoàn tác.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Lý do chấm dứt <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ví dụ: Người thuê đã hoàn tất hợp đồng, hết thời gian thuê..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleTerminate}
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận chấm dứt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
