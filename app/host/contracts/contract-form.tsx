"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { contractClient, CreateContractPayload } from "@/lib/services/contract-client.service";
import { bookingClientService, Booking } from "@/lib/services/booking-client.service";
import { Button } from "@/components/ui/button";

interface ContractFormProps {
  roomId?: string;
  renterId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type InventoryItem = { name: string; quantity: number; condition: string };
type FormData = {
  bookingId: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  paymentMethod: string;
  electricityRate: number;
  waterRate: number;
  utilitiesNotes: string;
  noticeDays: number;
  depositReturnDays: number;
  houseRules: string;
  notes: string;
};

const initialForm: FormData = {
  bookingId: "",
  endDate: "",
  monthlyRent: 0,
  depositAmount: 0,
  paymentDueDay: 5,
  paymentMethod: "Chuyển khoản ngân hàng",
  electricityRate: 0,
  waterRate: 0,
  utilitiesNotes: "",
  noticeDays: 30,
  depositReturnDays: 7,
  houseRules: "Không sử dụng phòng vào mục đích trái pháp luật; tuân thủ quy định cư trú, an ninh và phòng cháy chữa cháy.",
  notes: "",
};

function dateInputValue(value?: string) {
  return value ? new Date(value).toISOString().split("T")[0] : "";
}

function bookingRent(booking?: Booking | null) {
  return Number(booking?.room?.priceValue ?? 0);
}

function bookingLabel(booking: Booking) {
  const room = booking.room?.title || "Phòng";
  const renter = booking.user?.fullName || booking.user?.name || booking.user?.email || "Người thuê";
  return `${room} - ${renter} - từ ${new Date(booking.startDate).toLocaleDateString("vi-VN")}`;
}

export function ContractForm({ roomId, renterId, onSuccess, onCancel }: ContractFormProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const eligibleBookings = useMemo(() => bookings.filter((booking) => (
    booking.status === "CONFIRMED" &&
    !booking.contract &&
    (!roomId || booking.roomId === roomId) &&
    (!renterId || booking.userId === renterId)
  )), [bookings, roomId, renterId]);

  const selectedBooking = useMemo(
    () => eligibleBookings.find((booking) => booking.id === formData.bookingId) || null,
    [eligibleBookings, formData.bookingId],
  );

  useEffect(() => {
    bookingClientService.getHostAll()
      .then(setBookings)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải danh sách booking"))
      .finally(() => setIsLoadingBookings(false));
  }, []);

  useEffect(() => {
    if (!formData.bookingId && eligibleBookings[0]) {
      const booking = eligibleBookings[0];
      setFormData((current) => ({
        ...current,
        bookingId: booking.id,
        endDate: dateInputValue(booking.endDate),
        monthlyRent: bookingRent(booking),
        depositAmount: bookingRent(booking),
      }));
    }
  }, [eligibleBookings, formData.bookingId]);

  function handleBookingChange(value: string) {
    const booking = eligibleBookings.find((item) => item.id === value);
    setFormData((current) => ({
      ...current,
      bookingId: value,
      endDate: dateInputValue(booking?.endDate),
      monthlyRent: bookingRent(booking),
      depositAmount: bookingRent(booking),
    }));
  }

  function updateField(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    const numericFields = ["monthlyRent", "depositAmount", "paymentDueDay", "electricityRate", "waterRate", "noticeDays", "depositReturnDays"];
    setFormData((current) => ({ ...current, [name]: numericFields.includes(name) ? Number(value) : value }));
  }

  function updateInventory(index: number, key: keyof InventoryItem, value: string) {
    setInventory((items) => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, [key]: key === "quantity" ? Math.max(1, Number(value)) : value }
      : item));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (!selectedBooking) throw new Error("Vui lòng chọn booking đã được xác nhận");
      if (new Date(selectedBooking.startDate) >= new Date(`${formData.endDate}T23:59:59.000Z`)) {
        throw new Error("Ngày kết thúc phải sau ngày bắt đầu thuê");
      }

      const payload: CreateContractPayload = {
        ...formData,
        endDate: `${formData.endDate}T23:59:59.000Z`,
        electricityRate: formData.electricityRate || undefined,
        waterRate: formData.waterRate || undefined,
        utilitiesNotes: formData.utilitiesNotes || undefined,
        houseRules: formData.houseRules || undefined,
        notes: formData.notes || undefined,
        inventory: inventory.filter((item) => item.name.trim()).map((item) => ({ ...item, name: item.name.trim() })),
      };
      await contractClient.create(payload);
      setFormData(initialForm);
      setInventory([]);
      onSuccess?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo hợp đồng");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="mb-4 text-base font-bold text-slate-900">Booking và thời hạn thuê</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Booking đã xác nhận
            <select className={`${inputClass} mt-2`} value={formData.bookingId} onChange={(event) => handleBookingChange(event.target.value)} disabled={isLoadingBookings || !eligibleBookings.length} required>
              {isLoadingBookings && <option value="">Đang tải booking...</option>}
              {!isLoadingBookings && !eligibleBookings.length && <option value="">Không có booking phù hợp</option>}
              {eligibleBookings.map((booking) => <option key={booking.id} value={booking.id}>{bookingLabel(booking)}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Ngày kết thúc<input className={`${inputClass} mt-2`} type="date" name="endDate" value={formData.endDate} onChange={updateField} required /></label>
          <label className="text-sm font-medium text-slate-700">Ngày thanh toán hàng tháng<input className={`${inputClass} mt-2`} type="number" name="paymentDueDay" min="1" max="28" value={formData.paymentDueDay} onChange={updateField} required /></label>
        </div>
      </section>

      {selectedBooking && (
        <div className="grid gap-4 border-y border-orange-200 bg-orange-50/70 px-4 py-4 text-sm md:grid-cols-2">
          <div><span className="text-slate-500">Phòng</span><p className="font-semibold text-slate-900">{selectedBooking.room?.title}</p><p className="text-slate-600">{selectedBooking.room?.address}</p></div>
          <div><span className="text-slate-500">Người thuê</span><p className="font-semibold text-slate-900">{selectedBooking.user?.fullName || selectedBooking.user?.name}</p><p className="text-slate-600">{selectedBooking.user?.phone || selectedBooking.user?.email}</p></div>
        </div>
      )}

      <section>
        <h3 className="mb-4 text-base font-bold text-slate-900">Tài chính và dịch vụ</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Tiền thuê mỗi tháng<input className={`${inputClass} mt-2`} type="number" name="monthlyRent" min="0" value={formData.monthlyRent} onChange={updateField} required /></label>
          <label className="text-sm font-medium text-slate-700">Tiền đặt cọc<input className={`${inputClass} mt-2`} type="number" name="depositAmount" min="0" value={formData.depositAmount} onChange={updateField} required /></label>
          <label className="text-sm font-medium text-slate-700">Hình thức thanh toán<input className={`${inputClass} mt-2`} name="paymentMethod" value={formData.paymentMethod} onChange={updateField} /></label>
          <label className="text-sm font-medium text-slate-700">Thời hạn hoàn cọc (ngày)<input className={`${inputClass} mt-2`} type="number" name="depositReturnDays" min="0" max="60" value={formData.depositReturnDays} onChange={updateField} /></label>
          <label className="text-sm font-medium text-slate-700">Đơn giá điện (đ/kWh)<input className={`${inputClass} mt-2`} type="number" name="electricityRate" min="0" value={formData.electricityRate} onChange={updateField} /></label>
          <label className="text-sm font-medium text-slate-700">Đơn giá nước<input className={`${inputClass} mt-2`} type="number" name="waterRate" min="0" value={formData.waterRate} onChange={updateField} /></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Ghi chú dịch vụ<textarea className={`${inputClass} mt-2 resize-none`} name="utilitiesNotes" rows={2} value={formData.utilitiesNotes} onChange={updateField} placeholder="Cách tính nước, internet, phí quản lý và thời điểm chốt chỉ số" /></label>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Tài sản bàn giao</h3>
          <Button type="button" variant="outline" onClick={() => setInventory((items) => [...items, { name: "", quantity: 1, condition: "Tốt" }])}><Plus className="mr-2 h-4 w-4" />Thêm tài sản</Button>
        </div>
        <div className="space-y-3">
          {inventory.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_90px_1fr_40px] gap-2">
              <input className={inputClass} value={item.name} onChange={(event) => updateInventory(index, "name", event.target.value)} placeholder="Tên tài sản" />
              <input className={inputClass} type="number" min="1" value={item.quantity} onChange={(event) => updateInventory(index, "quantity", event.target.value)} aria-label="Số lượng" />
              <input className={inputClass} value={item.condition} onChange={(event) => updateInventory(index, "condition", event.target.value)} placeholder="Tình trạng" />
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md text-red-600 hover:bg-red-50" onClick={() => setInventory((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa tài sản"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!inventory.length && <p className="text-sm text-slate-500">Chưa có tài sản bàn giao.</p>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Thời hạn báo trước (ngày)<input className={`${inputClass} mt-2`} type="number" name="noticeDays" min="0" max="180" value={formData.noticeDays} onChange={updateField} /></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Nội quy và cam kết<textarea className={`${inputClass} mt-2 resize-none`} name="houseRules" rows={4} value={formData.houseRules} onChange={updateField} /></label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Điều khoản bổ sung<textarea className={`${inputClass} mt-2 resize-none`} name="notes" rows={3} value={formData.notes} onChange={updateField} /></label>
      </section>

      {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || isLoadingBookings || !eligibleBookings.length} className="bg-orange-600 text-white hover:bg-orange-700">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo bản nháp</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>}
      </div>
    </form>
  );
}
