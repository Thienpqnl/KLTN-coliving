'use client';

import { useState } from 'react';
import { contractClient, CreateContractPayload } from '@/lib/services/contract-client.service';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ContractFormProps {
  roomId?: string;
  renterId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ContractForm({ roomId, renterId, onSuccess, onCancel }: ContractFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    roomId: roomId || '',
    renterId: renterId || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthlyRent: 0,
    depositAmount: 0,
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['monthlyRent', 'depositAmount'].includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.roomId) throw new Error('Vui lòng chọn phòng');
      if (!formData.renterId) throw new Error('Vui lòng chọn người thuê');
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        throw new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu');
      }

      const payload: CreateContractPayload = {
        ...formData,
        startDate: `${formData.startDate}T00:00:00Z`,
        endDate: `${formData.endDate}T23:59:59Z`,
      };

      const result = await contractClient.create(payload);

      if (result.error) {
        throw new Error(result.error || result.message);
      }

      setFormData({
        roomId: '',
        renterId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthlyRent: 0,
        depositAmount: 0,
        notes: '',
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Room ID */}
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-foreground mb-2">
            Mã Phòng
          </label>
          <input
            type="text"
            id="roomId"
            name="roomId"
            value={formData.roomId}
            onChange={handleChange}
            placeholder="Nhập mã phòng"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        {/* Renter ID */}
        <div>
          <label htmlFor="renterId" className="block text-sm font-medium text-foreground mb-2">
            Mã Người Thuê
          </label>
          <input
            type="text"
            id="renterId"
            name="renterId"
            value={formData.renterId}
            onChange={handleChange}
            placeholder="Nhập mã người thuê"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-2">
            Ngày Bắt Đầu
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-2">
            Ngày Kết Thúc
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Rent */}
        <div>
          <label htmlFor="monthlyRent" className="block text-sm font-medium text-foreground mb-2">
            Tiền Thuê Hàng Tháng (VND)
          </label>
          <input
            type="number"
            id="monthlyRent"
            name="monthlyRent"
            value={formData.monthlyRent}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            min="0"
          />
        </div>

        {/* Deposit Amount */}
        <div>
          <label htmlFor="depositAmount" className="block text-sm font-medium text-foreground mb-2">
            Tiền Đặt Cọc (VND)
          </label>
          <input
            type="number"
            id="depositAmount"
            name="depositAmount"
            value={formData.depositAmount}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            min="0"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
          Ghi Chú
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Nhập ghi chú (tùy chọn)"
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tạo...
            </>
          ) : (
            'Tạo hợp đồng'
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
