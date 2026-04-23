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
        const bookingStats = await bookingClientService.getStats() as any
        setStats({
          pending: (bookingStats?.pendingCount as number) || 0,
          occupancy: (bookingStats?.occupancyPercentage as number) || 0,
          revenue: (bookingStats?.projectedRevenue as number) || 0,
        })
      } catch (error) {
        console.error('Failed to fetch booking stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      icon: <Calendar className="h-5 w-5" />,
      label: 'Pending Bookings',
      value: stats.pending.toString(),
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Current Occupancy',
      value: `${stats.occupancy}%`,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Projected Revenue',
      value: `$${stats.revenue.toFixed(2)}`,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-lg border border-border p-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <div key={idx} className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start justify-between mb-3">
            <div className={`${stat.color} p-2.5 rounded-lg`}>
              <div className={`${stat.iconColor}`}>{stat.icon}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}