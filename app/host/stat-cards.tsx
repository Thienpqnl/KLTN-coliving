"use client"

import { useEffect, useState } from "react"
import { BedDouble, CalendarCheck, DollarSign } from "lucide-react"
import { bookingClientService, Booking } from "@/lib/services/booking-client.service"
import { apiClient } from "@/lib/api/client"

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  change?: string
  changeType?: "positive" | "negative"
  sublabel?: string
  action?: string
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  change,
  changeType = "positive",
  sublabel,
  action,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} mb-4`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        {change && (
          <span
            className={`text-xs font-medium ${
              changeType === "positive" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {change}
          </span>
        )}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      {action && (
        <button className="mt-3 text-xs text-primary font-medium hover:underline">
          {action}
        </button>
      )}
    </div>
  )
}

interface HostRoom {
  id: string
  status: string
}

function bookingRevenue(booking: Booking) {
  if (booking.totalPrice) return booking.totalPrice
  if (booking.room?.priceValue) return Number(booking.room.priceValue)
  return 0
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`
}

export function StatCards() {
  const [rooms, setRooms] = useState<HostRoom[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [roomResponse, hostBookings] = await Promise.all([
          apiClient.get<{ rooms: HostRoom[] }>("/rooms-upload"),
          bookingClientService.getHostAll(),
        ])

        setRooms(roomResponse.rooms || [])
        setBookings(hostBookings)
      } catch (error) {
        console.error("Không thể tải thống kê tổng quan:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  const availableRooms = rooms.filter((room) => room.status === "AVAILABLE").length
  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length
  const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED").length
  const totalRevenue = bookings
    .filter((booking) => booking.status === "CONFIRMED" || booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + bookingRevenue(booking), 0)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
            <div className="h-12 w-12 rounded-xl bg-secondary animate-pulse mb-4" />
            <div className="h-3 w-24 bg-secondary animate-pulse rounded mb-3" />
            <div className="h-7 w-20 bg-secondary animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon={<BedDouble className="h-6 w-6 text-primary" />}
        iconBg="bg-primary/10"
        label="Tổng số phòng"
        value={rooms.length.toString()}
        change={`${availableRooms} còn trống`}
        changeType="positive"
        action="Xem tất cả"
      />
      <StatCard
        icon={<CalendarCheck className="h-6 w-6 text-accent" />}
        iconBg="bg-accent/10"
        label="Tổng đặt phòng"
        value={bookings.length.toString()}
        sublabel={`${pendingBookings} đang chờ`}
      />
      <StatCard
        icon={<DollarSign className="h-6 w-6 text-emerald-600" />}
        iconBg="bg-emerald-100"
        label="Tổng doanh thu"
        value={formatCurrency(totalRevenue)}
        change={`${confirmedBookings} đã xác nhận`}
        changeType="positive"
        action="Đặt phòng đã xác nhận"
      />
    </div>
  )
}
