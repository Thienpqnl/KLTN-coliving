"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, CalendarClock, User, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { sharedSpaceClientService, ResourceBooking, SharedResource } from "@/lib/services/shared-space-client.service"

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  booking: ResourceBooking | null
  resource: SharedResource | undefined
  onSuccess: () => void
}

export default function ApprovalModal({ isOpen, onClose, booking, resource, onSuccess }: ApprovalModalProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null)
    }
  }, [isOpen])

  if (!isOpen || !booking) return null

  const handleAction = async (status: 'APPROVED' | 'CANCELLED') => {
    try {
      setLoading(true)
      setFeedback(null)
      await sharedSpaceClientService.updateBookingStatus(booking.id, status)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      if (!(err instanceof Error)) throw err;
      setFeedback({ type: "error", message: err.message || "Có lỗi xảy ra" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-orange-600" />
              Xét duyệt đặt lịch
            </h2>
            <p className="text-sm text-slate-500 mt-1">Vui lòng xem xét yêu cầu sử dụng tài nguyên</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Chi tiết Booking */}
        <div className="p-6 space-y-5">
          {feedback && (
            <div className={`rounded-xl border px-3 py-2.5 text-sm flex items-start gap-2 ${feedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <User className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Người đặt</p>
                <p className="text-sm font-semibold text-slate-800">{booking.user?.fullName || booking.user?.name || "Tenant"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Thời gian bắt đầu</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(booking.startTime).toLocaleString('vi-VN', { 
                    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' 
                  })}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Thời gian kết thúc</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(booking.endTime).toLocaleString('vi-VN', { 
                    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' 
                  })}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700 font-bold uppercase">Mục đích sử dụng</p>
              </div>
              <p className="text-sm text-slate-700 italic">&ldquo;{booking.title}&rdquo;</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tài nguyên</p>
              <p className="text-sm font-semibold text-slate-800">{resource?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Tối đa {resource?.maxDurationMinutes} phút/lượt • {resource?.type === 'EQUIPMENT' ? 'Thiết bị' : 'Không gian'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Hành động */}
        <div className="p-6 border-t border-slate-200 flex gap-3 bg-slate-50/30">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => handleAction('CANCELLED')}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-2"
          >
            <XCircle className="w-4 h-4" />
            Từ chối
          </Button>
          <Button
            disabled={loading}
            onClick={() => handleAction('APPROVED')}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 gap-2 shadow-lg shadow-emerald-900/20"
          >
            <CheckCircle className="w-4 h-4" />
            Phê duyệt
          </Button>
        </div>
      </div>
    </div>
  )
}
