'use client'

import { useEffect, useState } from 'react'
import { Calendar, TrendingUp, Users, Loader2 } from 'lucide-react'
import { bookingClientService } from '@/lib/services/booking-client.service'

export function BookingStatCards() {
  const [stats, setStats] = useState({
    pending: 0,
    occupancy: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const bookingStats = await bookingClientService.getHostStats() as {
          pendingCount?: number
          occupancyPercentage?: number
          projectedRevenue?: number
        }
        setStats({
          pending: (bookingStats?.pendingCount as number) || 0,
          occupancy: (bookingStats?.occupancyPercentage as number) || 0,
          revenue: (bookingStats?.projectedRevenue as number) || 0,
        })
      } catch (error) {
        console.error('Không thể tải thống kê đặt phòng:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      icon: <Calendar className="h-5 w-5" />,
      label: 'Đặt phòng đang chờ',
      value: stats.pending.toString(),
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Tỷ lệ lấp đầy',
      value: `${stats.occupancy}%`,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Doanh thu dự kiến',
      value: `${stats.revenue.toLocaleString('vi-VN')} đ`,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-200/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <div key={idx} className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/60">
          <div className="flex items-start justify-between mb-3">
            <div className={`${stat.color} p-2.5 rounded-2xl ring-1 ring-white/70`}>
              <div className={`${stat.iconColor}`}>{stat.icon}</div>
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</p>
          <p className="text-2xl font-black text-slate-950">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
