"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { bookingClientService, Booking } from "@/lib/services/booking-client.service"

function bookingRevenue(booking: Booking) {
  if (booking.totalPrice) return booking.totalPrice
  if (booking.room?.priceValue) return Number(booking.room.priceValue)
  return 0
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

export function RevenueChart() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const hostBookings = await bookingClientService.getHostAll()
        setBookings(hostBookings)
      } catch (error) {
        console.error("Không thể tải dữ liệu doanh thu:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const data = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1)
      return {
        key: monthKey(date),
        month: date.toLocaleString("en-US", { month: "short" }),
        revenue: 0,
        pending: 0,
      }
    })

    bookings.forEach((booking) => {
      const date = new Date(booking.startDate)
      const entry = months.find((item) => item.key === monthKey(date))
      if (!entry) return

      const value = bookingRevenue(booking)
      if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
        entry.revenue += value
      }

      if (booking.status === "PENDING") {
        entry.pending += value
      }
    })

    return months
  }, [bookings])

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-black text-slate-950">Xu hướng doanh thu</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Doanh thu đã xác nhận và nguồn doanh thu đang chờ từ các đặt phòng
          </p>
        </div>
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
          8 tháng gần nhất
        </span>
      </div>

      <div className="h-52">
        {loading ? (
          <div className="h-full rounded-2xl bg-orange-100/70 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.25 0.08 260)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.25 0.08 260)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.7 0.18 55)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.7 0.18 55)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 70)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(1 0 0)",
                border: "1px solid oklch(0.9 0.01 280)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="oklch(0.55 0.18 45)"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke="oklch(0.55 0.13 230)"
              strokeWidth={2}
              fill="url(#colorExpenses)"
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-orange-100/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">Doanh thu đã xác nhận</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-xs text-muted-foreground">Doanh thu đang chờ</span>
          </div>
        </div>
        <button className="text-xs text-orange-700 font-bold hover:underline">
          Báo cáo đầy đủ
        </button>
      </div>
    </div>
  )
}
