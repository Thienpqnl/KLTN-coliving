'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Search, AlertCircle } from 'lucide-react'
import { bookingClientService, Booking } from '@/lib/services/booking-client.service'
import { LandlordEvaluationModal } from '@/components/LandlordEvaluationModal'

export function BookingsTable() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [evaluationOpen, setEvaluationOpen] = useState(false)
  const itemsPerPage = 5

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await bookingClientService.getHostAll()
      setBookings(res)
    } catch (error) {
      console.error('Không thể tải đặt phòng:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (bookingId: string) => {
    try {
      setActionLoading(bookingId)
      await bookingClientService.approve(bookingId)
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b)
      )
    } catch (error) {
      console.error('Không thể xác nhận đặt phòng:', error)
      alert('Không thể xác nhận đặt phòng')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (bookingId: string) => {
    try {
      setActionLoading(bookingId)
      await bookingClientService.reject(bookingId)
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)
      )
    } catch (error) {
      console.error('Không thể từ chối đặt phòng:', error)
      alert('Không thể từ chối đặt phòng')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-100 text-orange-700'
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-700'
      case 'CANCELLED':
        return 'bg-red-100 text-red-700'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    const keyword = searchTerm.toLowerCase()
    return (
      booking.id.toLowerCase().includes(keyword) ||
      booking.room?.title.toLowerCase().includes(keyword) ||
      booking.user?.email?.toLowerCase().includes(keyword) ||
      booking.user?.fullName?.toLowerCase().includes(keyword) ||
      booking.user?.name?.toLowerCase().includes(keyword)
    )
  })

  const formatPrice = (booking: Booking) => {
    if (booking.totalPrice) return `${booking.totalPrice.toLocaleString('vi-VN')} đ`
    if (booking.room?.priceText) return booking.room.priceText
    if (booking.room?.priceValue) return `${Number(booking.room.priceValue).toLocaleString('vi-VN')} đ`
    return 'Liên hệ'
  }

  const formatStatus = (status: Booking['status']) => {
    const labels = {
      PENDING: 'Đang chờ',
      CONFIRMED: 'Đã xác nhận',
      CANCELLED: 'Đã hủy',
      COMPLETED: 'Hoàn tất',
    }

    return labels[status] || status
  }

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const displayedBookings = filteredBookings.slice(startIdx, startIdx + itemsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white/80 p-8 text-center shadow-lg shadow-slate-200/60">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Chưa có đặt phòng</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm đặt phòng..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full rounded-full border border-white/80 bg-white/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
        {/* Table Header */}
        <div className="grid grid-cols-7 gap-4 border-b border-orange-100/70 bg-gradient-to-r from-orange-50 via-white to-sky-50 px-6 py-3">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Phòng</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Nhận phòng</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Trả phòng</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Giá</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Trạng thái</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Đánh giá</div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Thao tác</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {displayedBookings.map((booking) => (
            <div key={booking.id} className="grid grid-cols-7 gap-4 px-6 py-4 items-center transition-colors hover:bg-orange-50/50">
              {/* Room ID */}
              <div>
                <p className="text-sm font-semibold text-slate-950">{booking.room?.title || 'Phòng'}</p>
                <p className="text-xs text-muted-foreground">{booking.user?.fullName || booking.user?.name || booking.user?.email || booking.roomId}</p>
              </div>

              {/* Check-in */}
              <div>
                <p className="text-sm text-foreground">
                  {new Date(booking.startDate).toLocaleDateString()}
                </p>
              </div>

              {/* Check-out */}
              <div>
                <p className="text-sm text-foreground">
                  {new Date(booking.endDate).toLocaleDateString()}
                </p>
              </div>

              {/* Price */}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatPrice(booking)}
                </p>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                  {formatStatus(booking.status)}
                </span>
              </div>

              {/* Evaluation */}
              <div>
                <button
                  onClick={() => {
                    setSelectedBookingId(booking.id)
                    setEvaluationOpen(true)
                  }}
                  className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500"
                >
                  Xem
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {booking.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-50"
                    >
                      {actionLoading === booking.id ? (
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                      ) : null}
                      Xác nhận
                    </button>
                    <button
                      onClick={() => handleReject(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Hiển thị {startIdx + 1}-{Math.min(startIdx + itemsPerPage, filteredBookings.length)} trong {filteredBookings.length} đặt phòng
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => currentPage - 1 + i).map((page) => (
              page > 0 && page <= totalPages && (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {selectedBookingId && (
        <LandlordEvaluationModal
          isOpen={evaluationOpen}
          onClose={() => {
            setEvaluationOpen(false)
            setSelectedBookingId(null)
          }}
          bookingId={selectedBookingId}
        />
      )}
    </div>
  )
}
