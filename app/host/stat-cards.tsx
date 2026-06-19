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
    <div className="group overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/60">
      <div className="mb-4 flex items-start justify-between">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ring-1 ring-white/70`}>
        {icon}
        </div>
        <span className="h-2 w-12 rounded-full bg-gradient-to-r from-orange-400 to-sky-300 opacity-70 transition group-hover:w-16" />
      </div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-slate-950">{value}</h3>
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
        <button className="mt-3 text-xs text-orange-700 font-bold hover:underline">
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
          <div key={item} className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/60">
            <div className="h-12 w-12 rounded-2xl bg-orange-100 animate-pulse mb-4" />
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
        icon={<BedDouble className="h-6 w-6 text-orange-700" />}
        iconBg="bg-orange-100"
        label="Tổng số phòng"
        value={rooms.length.toString()}
        change={`${availableRooms} còn trống`}
        changeType="positive"
        action="Xem tất cả"
      />
      <StatCard
        icon={<CalendarCheck className="h-6 w-6 text-sky-700" />}
        iconBg="bg-sky-100"
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
