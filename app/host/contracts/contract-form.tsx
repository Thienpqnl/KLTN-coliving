'use client';

import { useEffect, useMemo, useState } from 'react';
import { contractClient, CreateContractPayload } from '@/lib/services/contract-client.service';
import { bookingClientService, Booking } from '@/lib/services/booking-client.service';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ContractFormProps {
  roomId?: string;
  renterId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FormData = {
  bookingId: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  notes: string;
};

function dateInputValue(value?: string) {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

function bookingRent(booking?: Booking | null) {
  const value = booking?.room?.priceValue;
  if (value == null) return 0;
  return Number(value);
}

function bookingLabel(booking: Booking) {
  const roomTitle = booking.room?.title || 'Phòng';
  const renterName =
    booking.user?.fullName || booking.user?.name || booking.user?.email || 'Người thuê';
  const startDate = new Date(booking.startDate).toLocaleDateString('vi-VN');
  return `${roomTitle} - ${renterName} - bắt đầu ${startDate}`;
}

export function ContractForm({ roomId, renterId, onSuccess, onCancel }: ContractFormProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    bookingId: '',
    endDate: '',
    monthlyRent: 0,
    depositAmount: 0,
    notes: '',
  });

  const eligibleBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesRoom = roomId ? booking.roomId === roomId : true;
      const matchesRenter = renterId ? booking.userId === renterId : true;
      return (
        booking.status === 'CONFIRMED' &&
        !booking.contract &&
        matchesRoom &&
        matchesRenter
      );
    });
  }, [bookings, renterId, roomId]);

  const selectedBooking = useMemo(
    () => eligibleBookings.find((booking) => booking.id === formData.bookingId) || null,
    [eligibleBookings, formData.bookingId]
  );

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setIsLoadingBookings(true);
        setError('');
        const data = await bookingClientService.getHostAll();
        setBookings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách booking');
      } finally {
        setIsLoadingBookings(false);
      }
    };

    loadBookings();
  }, []);

  useEffect(() => {
    if (!formData.bookingId && eligibleBookings.length > 0) {
      const booking = eligibleBookings[0];
      setFormData((prev) => ({
        ...prev,
        bookingId: booking.id,
        endDate: dateInputValue(booking.endDate),
        monthlyRent: bookingRent(booking),
      }));
    }
  }, [eligibleBookings, formData.bookingId]);

  const handleBookingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const booking = eligibleBookings.find((item) => item.id === e.target.value) || null;

    setFormData((prev) => ({
      ...prev,
      bookingId: e.target.value,
      endDate: dateInputValue(booking?.endDate),
      monthlyRent: bookingRent(booking),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['monthlyRent', 'depositAmount'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!selectedBooking) {
        throw new Error('Vui lòng chọn một booking đã được xác nhận');
      }

      if (new Date(selectedBooking.startDate) >= new Date(`${formData.endDate}T23:59:59Z`)) {
        throw new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu thuê');
      }

      const payload: CreateContractPayload = {
        bookingId: formData.bookingId,
        endDate: `${formData.endDate}T23:59:59Z`,
        monthlyRent: formData.monthlyRent,
        depositAmount: formData.depositAmount,
        notes: formData.notes || undefined,
      };

      const result = await contractClient.create(payload);

      if (result.error) {
        throw new Error(result.error || result.message);
      }

      setFormData({
        bookingId: '',
        endDate: '',
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
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <label htmlFor="bookingId" className="mb-2 block text-sm font-medium text-foreground">
          Booking đã xác nhận
        </label>
        <select
          id="bookingId"
          name="bookingId"
          value={formData.bookingId}
          onChange={handleBookingChange}
          disabled={isLoadingBookings || eligibleBookings.length === 0}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          required
        >
          {isLoadingBookings ? (
            <option value="">Đang tải booking...</option>
          ) : eligibleBookings.length === 0 ? (
            <option value="">Không có booking đã xác nhận nào cần tạo hợp đồng</option>
          ) : (
            eligibleBookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {bookingLabel(booking)}
              </option>
            ))
          )}
        </select>
        <p className="mt-2 text-xs text-slate-500">
          Chỉ hiển thị booking đã được chủ nhà xác nhận và chưa có hợp đồng.
        </p>
      </div>

      {selectedBooking && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phòng</p>
            <p className="font-semibold text-slate-900">{selectedBooking.room?.title || selectedBooking.roomId}</p>
            <p className="text-slate-600">{selectedBooking.room?.address}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Người thuê</p>
            <p className="font-semibold text-slate-900">
              {selectedBooking.user?.fullName || selectedBooking.user?.name || selectedBooking.user?.email}
            </p>
            <p className="text-slate-600">{selectedBooking.user?.phone || selectedBooking.user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày bắt đầu</p>
            <p className="font-semibold text-slate-900">
              {new Date(selectedBooking.startDate).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá phòng tham chiếu</p>
            <p className="font-semibold text-slate-900">
              {bookingRent(selectedBooking).toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="endDate" className="mb-2 block text-sm font-medium text-foreground">
            Ngày kết thúc hợp đồng
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label htmlFor="monthlyRent" className="mb-2 block text-sm font-medium text-foreground">
            Tiền thuê hàng tháng (VND)
          </label>
          <input
            type="number"
            id="monthlyRent"
            name="monthlyRent"
            value={formData.monthlyRent}
            onChange={handleChange}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            min="0"
          />
        </div>
      </div>

      <div>
        <label htmlFor="depositAmount" className="mb-2 block text-sm font-medium text-foreground">
          Tiền đặt cọc (VND)
        </label>
        <input
          type="number"
          id="depositAmount"
          name="depositAmount"
          value={formData.depositAmount}
          onChange={handleChange}
          placeholder="0"
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
          min="0"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-2 block text-sm font-medium text-foreground">
          Ghi chú
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Nhập điều khoản hoặc ghi chú bổ sung (tùy chọn)"
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading || isLoadingBookings || eligibleBookings.length === 0}
          className="flex-1 bg-orange-600 text-white hover:bg-orange-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tạo...
            </>
          ) : (
            'Tạo hợp đồng'
          )}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
