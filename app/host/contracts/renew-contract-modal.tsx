'use client';

import { useState } from 'react';
import { contractClient, RenewContractPayload } from '@/lib/services/contract-client.service';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, X } from 'lucide-react';

interface RenewContractModalProps {
  contractId: string;
  currentEndDate: string;
  currentMonthlyRent: number;
  onSuccess?: () => void;
  onClose: () => void;
}

export function RenewContractModal({
  contractId,
  currentEndDate,
  currentMonthlyRent,
  onSuccess,
  onClose,
}: RenewContractModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    newEndDate: new Date(new Date(currentEndDate).getTime() + 12 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    newMonthlyRent: currentMonthlyRent,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'newMonthlyRent' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (new Date(formData.newEndDate) <= new Date(currentEndDate)) {
        throw new Error('Ngày kết thúc mới phải lớn hơn ngày kết thúc hiện tại');
      }

      const payload: RenewContractPayload = {
        newEndDate: `${formData.newEndDate}T23:59:59Z`,
        newMonthlyRent: formData.newMonthlyRent,
      };

      const result = await contractClient.renew(contractId, payload);

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
          <h2 className="text-xl font-bold text-foreground">Gia Hạn Hợp Đồng</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="newEndDate" className="block text-sm font-medium text-foreground mb-2">
              Ngày Kết Thúc Mới
            </label>
            <input
              type="date"
              id="newEndDate"
              name="newEndDate"
              value={formData.newEndDate}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ngày kết thúc hiện tại: {new Date(currentEndDate).toLocaleDateString('vi-VN')}
            </p>
          </div>

          <div>
            <label htmlFor="newMonthlyRent" className="block text-sm font-medium text-foreground mb-2">
              Tiền Thuê Mới (VND) - Tùy chọn
            </label>
            <input
              type="number"
              id="newMonthlyRent"
              name="newMonthlyRent"
              value={formData.newMonthlyRent}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Để nguyên nếu không thay đổi (hiện tại: {currentMonthlyRent.toLocaleString('vi-VN')} VND)
            </p>
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
              disabled={isLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gia hạn...
                </>
              ) : (
                'Gia Hạn'
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
