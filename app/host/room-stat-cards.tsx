'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { roomClientService, Room } from '@/lib/services/room-client.service'

export function RoomStatCards() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await roomClientService.getAll() as Room[] | { rooms?: Room[] }
        const roomsData = (Array.isArray(response) ? response : response.rooms || []) as Room[];
        console.log('Fetched rooms for stats:', roomsData)
        const availableRooms = roomsData.filter((r: Room) => r.status === 'AVAILABLE').length
        const occupiedRooms = roomsData.filter((r: Room) => r.status === 'OCCUPIED').length
        const total = roomsData.length

        setStats({
          totalRooms: total,
          availableRooms : availableRooms,
          occupiedRooms : occupiedRooms,
          occupancyRate: total > 0 ? Math.round((occupiedRooms / total) * 100) : 0,
        })
      } catch (error) {
        console.error('Không thể tải thống kê phòng:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Tổng số phòng',
      value: stats.totalRooms,
      change: 'Tất cả phòng',
    },
    {
      label: 'Còn trống',
      value: stats.availableRooms,
      change: 'Sẵn sàng đặt',
    },
    {
      label: 'Đã thuê',
      value: stats.occupiedRooms,
      change: 'Đang có khách',
    },
    {
      label: 'Tỷ lệ lấp đầy',
      value: `${stats.occupancyRate}%`,
      change: 'trên tổng sức chứa',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            {stat.label}
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{stat.value}</span>
          </div>
          {stat.change && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
