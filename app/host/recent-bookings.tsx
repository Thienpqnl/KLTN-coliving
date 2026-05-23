"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { bookingClientService, Booking } from "@/lib/services/booking-client.service"

function StatusBadge({ status }: { status: Booking["status"] }) {
  const styles = {
    PENDING: "bg-primary/10 text-primary",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    COMPLETED: "bg-blue-100 text-blue-700",
  }
  const labels = {
    PENDING: "Đang chờ",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    COMPLETED: "Hoàn tất",
  }

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function monthDiff(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  return Math.max(1, months)
}

export function RecentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        const hostBookings = await bookingClientService.getHostAll()
        setBookings(hostBookings.slice(0, 3))
      } catch (error) {
        console.error("Không thể tải đặt phòng gần đây:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentBookings()
  }, [])

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <h3 className="font-semibold text-foreground mb-4">Đặt phòng gần đây</h3>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-secondary animate-pulse rounded" />
                <div className="h-3 w-36 bg-secondary animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có đặt phòng</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const guestName = booking.user?.fullName || booking.user?.name || booking.user?.email || "Khách"

            return (
              <div key={booking.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>{guestName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{guestName}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {booking.room?.title || "Phòng"} · {monthDiff(booking.startDate, booking.endDate)} tháng
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button className="w-full mt-4 pt-4 border-t border-border text-xs text-primary font-medium hover:underline">
        Xem tất cả đặt phòng
      </button>
    </div>
  )
}
