'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Edit2, Trash2, Plus, Loader2, X } from 'lucide-react'
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
  status: 'DRAFT' | 'AVAILABLE' | 'OCCUPIED' | 'PENDING' | 'NEEDS_REVISION' | 'REJECTED' | 'HIDDEN'
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
    case 'DRAFT':
      return 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
    case 'NEEDS_REVISION':
      return 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-700 ring-1 ring-red-200'
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
      return 'Đã đủ người'
    case 'PENDING':
      return 'Chờ duyệt'
    case 'DRAFT':
      return 'Bản nháp'
    case 'NEEDS_REVISION':
      return 'Cần bổ sung'
    case 'REJECTED':
      return 'Bị từ chối'
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
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    if (!roomToDelete) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        setRoomToDelete(null)
        setDeleteError('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [deleting, roomToDelete])

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

  const openDeleteDialog = (room: Room) => {
    setDeleteError('')
    setRoomToDelete(room)
  }

  const closeDeleteDialog = () => {
    if (deleting) return
    setDeleteError('')
    setRoomToDelete(null)
  }

  const handleDelete = async () => {
    if (!roomToDelete) return
    const roomId = roomToDelete.id

    try {
      setDeleting(roomId)
      setDeleteError('')
      await apiClient.delete(`/rooms/${roomId}`)
      setRooms(prev => ({
        ...prev,
        rooms: prev.rooms?.filter(room => room.id !== roomId) || []
      }))
      window.dispatchEvent(new Event('host-rooms-updated'))
      setRoomToDelete(null)
    } catch (err) {
      console.error('Không thể xóa phòng:', err)
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Không thể xóa phòng. Vui lòng thử lại.'
      )
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
    <>
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
                  onClick={() => openDeleteDialog(room)}
                  disabled={deleting === room.id}
                  title={`Xóa ${room.title}`}
                  className="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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

    {roomToDelete && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-sm"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDeleteDialog()
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-title"
          aria-describedby="delete-room-description"
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl shadow-slate-950/25"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">Xác nhận thao tác</p>
                <h2 id="delete-room-title" className="mt-1 text-2xl font-black text-slate-950">
                  Xóa phòng khỏi hệ thống?
                </h2>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={closeDeleteDialog}
              disabled={Boolean(deleting)}
              title="Đóng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <p id="delete-room-description" className="leading-7 text-slate-600">
              Bạn đang chuẩn bị xóa <strong className="font-extrabold text-slate-950">{roomToDelete.title}</strong>.
              Phòng sẽ không còn xuất hiện trong danh sách, trang thành viên và kết quả tìm kiếm.
            </p>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Lưu ý:</span> Thao tác này không thể hoàn tác. Lịch sử đặt phòng,
              hợp đồng và cư trú đã phát sinh vẫn được giữ lại để đối soát.
            </div>

            {deleteError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{deleteError}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={closeDeleteDialog}
              disabled={Boolean(deleting)}
              className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Giữ lại phòng
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={Boolean(deleting)}
              className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Đang xóa...' : 'Xóa phòng'}
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  )
}
