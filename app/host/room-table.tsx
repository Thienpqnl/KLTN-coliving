'use client'

import { useEffect, useState } from 'react'
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'

interface Room {
  id: string
  title: string
  description: string
  price: number
  address: string
  image: string[]
  status: 'AVAILABLE' | 'OCCUPIED' | 'PENDING' | 'HIDDEN'
  amenityIds: string[]
  createdAt: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
    case 'OCCUPIED':
      return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
    case 'PENDING':
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
    case 'HIDDEN':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'Còn trống'
    case 'OCCUPIED':
      return 'Đã thuê'
    case 'PENDING':
      return 'Chờ duyệt'
    case 'HIDDEN':
      return 'Đang ẩn'
    default:
      return 'Không xác định'
  }
}

export function RoomsTable() {
  const [rooms, setRooms] = useState<{ rooms?: Room[] }>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<{ rooms: Room[] }>('/rooms-upload')
      setRooms(res)
    } catch (err) {
      console.error('Không thể tải danh sách phòng:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('Bạn có chắc muốn xóa phòng này không?')) {
      return
    }

    try {
      setDeleting(roomId)
      await apiClient.delete(`/rooms/${roomId}`)
      setRooms(prev => ({
        ...prev,
        rooms: prev.rooms?.filter(room => room.id !== roomId) || []
      }))
      window.dispatchEvent(new Event('host-rooms-updated'))
    } catch (err) {
      console.error('Không thể xóa phòng:', err)
      alert('Không thể xóa phòng')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rooms.rooms?.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white/80 p-12 text-center shadow-lg shadow-slate-200/50">
        <p className="text-muted-foreground mb-6">Bạn chưa tạo phòng nào</p>
        <Link href="/room-management/add-room">
          <Button className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400">
            <Plus className="w-4 h-4 mr-2" />
            Tạo phòng đầu tiên
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
      {/* Table Header */}
      <div className="border-b border-orange-100/70 bg-gradient-to-r from-orange-50 via-white to-sky-50 px-6 py-4">
        <div className="grid grid-cols-12 gap-4 items-center text-xs font-black uppercase tracking-wider text-slate-500">
          <div className="col-span-4">Tên phòng</div>
          <div className="col-span-2">Giá</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-2">Địa chỉ</div>
          <div className="col-span-2">Thao tác</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {rooms.rooms?.map((room) => (
          <div
            key={room.id}
            className="px-6 py-4 transition-colors hover:bg-orange-50/50"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Room Name with Image */}
              <div className="col-span-4 flex items-center gap-3">
                {room.image?.length > 0 && (
                 <img
  src={room.image?.[0] || "https://via.placeholder.com/150"}
  alt={room.title}
  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm"
/>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950 text-sm">{room.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="col-span-2 text-sm font-bold text-slate-950">
                {room.price.toLocaleString('vi-VN')} đ
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusColor(
                    room.status
                  )}`}
                >
                  {getStatusLabel(room.status)}
                </span>
              </div>

              {/* Address */}
              <div className="col-span-2 text-sm text-muted-foreground truncate">
                {room.address}
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center gap-2">
                <Link href={`/room-management/edit-room?id=${room.id}`}>
                  <button className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(room.id)}
                  disabled={deleting === room.id}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  {deleting === room.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between border-t border-orange-100/70 bg-orange-50/50 px-6 py-3 text-xs font-medium text-slate-500">
        <span>Đang hiển thị {rooms.rooms?.length || 0} phòng</span>
      </div>
    </div>
  )
}
