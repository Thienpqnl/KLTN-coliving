'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type HostRoom = {
  id: string
  status?: 'AVAILABLE' | 'OCCUPIED' | 'PENDING' | 'HIDDEN'
  currentOccupants?: number | null
  maxOccupants?: number | null
}

type HostRoomsResponse = {
  rooms?: HostRoom[]
}

function getRoomCapacity(room: HostRoom) {
  const max = Number(room.maxOccupants ?? 0)
  const current = Number(room.currentOccupants ?? 0)
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1
  const safeCurrent = Number.isFinite(current) ? Math.min(Math.max(current, 0), safeMax) : 0

  return {
    max: safeMax,
    current: safeCurrent,
    available: Math.max(safeMax - safeCurrent, 0),
  }
}

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
        const response = await apiClient.get<HostRoomsResponse | HostRoom[]>('/rooms-upload')
        const roomsData = Array.isArray(response) ? response : response.rooms || []
        const total = roomsData.length
        const totalCapacity = roomsData.reduce((sum, room) => sum + getRoomCapacity(room).max, 0)
        const occupiedSlots = roomsData.reduce((sum, room) => sum + getRoomCapacity(room).current, 0)
        const availableRooms = roomsData.filter((room) => {
          const capacity = getRoomCapacity(room)
          return room.status === 'AVAILABLE' && capacity.available > 0
        }).length
        const occupiedRooms = roomsData.filter((room) => {
          const capacity = getRoomCapacity(room)
          return room.status === 'OCCUPIED' || capacity.available === 0
        }).length

        setStats({
          totalRooms: total,
          availableRooms,
          occupiedRooms,
          occupancyRate: totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0,
        })
      } catch (error) {
        console.error('Không thể tải thống kê phòng:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    window.addEventListener('host-rooms-updated', fetchStats)

    return () => {
      window.removeEventListener('host-rooms-updated', fetchStats)
    }
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
            className="flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-200/60"
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
          className="group overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-6 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/60"
        >
          <div className="mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r from-orange-500 via-amber-300 to-sky-300 transition group-hover:w-24" />
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">
            {stat.label}
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-slate-950">{stat.value}</span>
          </div>
          {stat.change && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-orange-600" />
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
