'use client';

import { useState } from 'react';
import { contractClient, TerminateContractPayload } from '@/lib/services/contract-client.service';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, X } from 'lucide-react';

interface TerminateContractModalProps {
  contractId: string;
  renterName: string;
  roomTitle: string;
  onSuccess?: () => void;
  onClose: () => void;
}

export function TerminateContractModal({
  contractId,
  renterName,
  roomTitle,
  onSuccess,
  onClose,
}: TerminateContractModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (terminationReason.trim().length < 5) {
        throw new Error('Lý do chấm dứt phải có ít nhất 5 ký tự');
      }

      if (!confirmChecked) {
        throw new Error('Vui lòng xác nhận chấm dứt hợp đồng');
      }

      const payload: TerminateContractPayload = {
        terminationReason: terminationReason.trim(),
      };

      const result = await contractClient.terminate(contractId, payload);

      if (result.error) {
        throw new Error(result.error || result.message);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-foreground">Chấm Dứt Hợp Đồng</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Cảnh báo</p>
              <p className="text-sm text-yellow-800 mt-1">
                Hành động này sẽ chấm dứt hợp đồng thuê phòng và không thể hoàn tác
              </p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Người thuê</p>
              <p className="font-semibold text-foreground">{renterName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phòng</p>
              <p className="font-semibold text-foreground">{roomTitle}</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="terminationReason" className="block text-sm font-medium text-foreground mb-2">
              Lý Do Chấm Dứt
            </label>
            <textarea
              id="terminationReason"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Nhập lý do chấm dứt hợp đồng (tối thiểu 5 ký tự)"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {terminationReason.length}/5 ký tự tối thiểu
            </p>
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-1 rounded border-slate-300"
            />
            <label htmlFor="confirm" className="text-sm text-foreground">
              Tôi xác nhận chấm dứt hợp đồng này và chấp nhận tất cả hậu quả
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !confirmChecked || terminationReason.length < 5}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang chấm dứt...
                </>
              ) : (
                'Chấm Dứt'
              )}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
