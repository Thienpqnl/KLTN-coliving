"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, CalendarClock, AlertCircle } from "lucide-react";
import { sharedSpaceClientService, SharedResource } from "@/lib/services/shared-space-client.service";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: SharedResource[];
  roomId: string;
  onSuccess: () => void;
}

export default function BookingModal({ isOpen, onClose, resources, roomId, onSuccess }: BookingModalProps) {
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60"); // Thời lượng mặc định là 60 phút (1 tiếng)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  // Danh sách các khoảng thời gian gợi ý phổ biến cho người dùng chọn nhanh
  const durationOptions = [
    { label: "30 phút", value: "30" },
    { label: "1 tiếng", value: "60" },
    { label: "1 tiếng 30 phút", value: "90" },
    { label: "2 tiếng", value: "120" },
    { label: "3 tiếng", value: "180" },
    { label: "4 tiếng", value: "240" },
  ];

  // Tự động điều chỉnh thời lượng phù hợp nếu tài nguyên có giới hạn thấp hơn mốc mặc định
  useEffect(() => {
    if (selectedResource) {
      const maxMinutes = selectedResource.maxDurationMinutes;
      if (parseInt(duration) > maxMinutes) {
        setDuration(maxMinutes.toString());
      }
    }
  }, [selectedResourceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!selectedResourceId || !title || !startTime || !duration) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);

      // Tự động tính toán End Time dựa trên Start Time + Số phút đã chọn
      const startMinutes = new Date(startTime);
      const endMinutes = new Date(startMinutes.getTime() + parseInt(duration) * 60000);

      const startDate = new Date(startMinutes);
      const endDate = new Date(endMinutes);

      if (startDate >= endDate) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }

      if (selectedResource?.status === 'MAINTENANCE') {
        setError("Tài nguyên này hiện đang bảo trì, vui lòng chọn tài nguyên khác");
        return;
      }

      await sharedSpaceClientService.createBooking(roomId, {
        resourceId: selectedResourceId,
        title,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });
      
      onSuccess();
      onClose();
      
      // Reset form trạng thái ban đầu
      setTitle("");
      setStartTime("");
      setDuration("60");
    } catch (err: unknown) {
      if (!(err instanceof Error)) throw err;
      setError(err.message || "Có lỗi xảy ra khi đặt lịch");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-600" />
            Đặt tài nguyên dùng chung
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Chọn tài nguyên */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn tài nguyên</label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 text-sm"
              required
            >
              <option value="">-- Chọn thiết bị/không gian --</option>
              {resources.map(res => (
                <option key={res.id} value={res.id}>
                  {res.name} ({res.type === 'EQUIPMENT' ? 'Thiết bị' : 'Không gian'})
                </option>
              ))}
            </select>
            {selectedResource && (
              <p className="text-xs text-slate-500 mt-1">
                ⏱ Tối đa {selectedResource.maxDurationMinutes} phút/lượt 
                {selectedResource.requiresApproval && " • Cần phê duyệt"}
              </p>
            )}
          </div>

          {/* Mục đích sử dụng */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mục đích sử dụng</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Giặt đồ tuần này, Họp nhóm tầng chung..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 text-sm"
              maxLength={100}
              required
            />
          </div>

          {/* Cấu trúc nhập thời gian gọn nhẹ hơn */}
          <div className="grid grid-cols-2 gap-4">
            {/* Thời gian bắt đầu */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Thời gian bắt đầu</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 text-sm"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            {/* Độ dài thời gian dạng Select nhanh */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Sử dụng trong bao lâu?</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500 text-sm"
                required
              >
                {durationOptions
                  // Chỉ hiển thị các mốc thời gian nhỏ hơn hoặc bằng giới hạn tối đa của thiết bị đó
                  .filter(opt => !selectedResource || parseInt(opt.value) <= selectedResource.maxDurationMinutes)
                  .map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400"
            >
              {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
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
