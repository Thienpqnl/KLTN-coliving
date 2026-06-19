"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { bookingClientService, Booking } from "@/lib/services/booking-client.service"
interface HostRoom {
  id: string
  title: string
  address: string
  price?: number
  priceText?: string | null
  priceValue?: number | string | null
  image?: string | string[]
  images?: { url: string }[]
  bookings?: Booking[]
}
function firstImage(room: HostRoom) {
  return room.images?.[0]?.url || (Array.isArray(room.image) ? room.image[0] : room.image) || "https://via.placeholder.com/500x400?text=Phong"
}

function roomPrice(room: HostRoom) {
  if (room.priceText) return room.priceText
  if (room.priceValue) return `${Number(room.priceValue).toLocaleString("vi-VN")} đ/tháng`
  if (room.price) return `${room.price.toLocaleString("vi-VN")} đ/tháng`
  return "Liên hệ"
}

export function FeaturedProperty() {
  const [rooms, setRooms] = useState<HostRoom[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedProperty = async () => {
      try {
        const [roomResponse, hostBookings] = await Promise.all([
          apiClient.get<{ rooms: HostRoom[] }>("/rooms-upload"),
          bookingClientService.getHostAll(),
        ])

        setRooms(roomResponse.rooms || [])
        setBookings(hostBookings)
      } catch (error) {
        console.error("Không thể tải phòng nổi bật:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProperty()
  }, [])

  const featuredRoom = useMemo(() => {
    if (rooms.length === 0) return null

    return [...rooms].sort((a, b) => {
      const aBookings = bookings.filter((booking) => booking.roomId === a.id).length
      const bBookings = bookings.filter((booking) => booking.roomId === b.id).length
      return bBookings - aBookings
    })[0]
  }, [bookings, rooms])

  if (loading) {
    return <div className="h-64 rounded-[2rem] border border-white/80 bg-white/70 shadow-xl shadow-slate-200/60 animate-pulse" />
  }

  if (!featuredRoom) {
    return (
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-orange-950 to-orange-700 p-6 shadow-xl shadow-orange-200/70">
        <p className="text-xs text-amber-200 font-bold tracking-wider uppercase mb-2">Phòng nổi bật</p>
        <h3 className="text-2xl font-black text-white leading-tight mb-3">Chưa có phòng</h3>
        <p className="text-sm text-orange-50/80 mb-5">Tạo phòng đầu tiên để bắt đầu nhận yêu cầu đặt phòng.</p>
        <Link href="/room-management/add-room">
          <Button className="bg-white text-orange-700 hover:bg-orange-50 text-xs px-4 py-2 h-auto">
            Thêm phòng
          </Button>
        </Link>
      </div>
    )
  }

  const roomBookings = bookings.filter((booking) => booking.roomId === featuredRoom.id)
  const confirmedBookings = roomBookings.filter((booking) => booking.status === "CONFIRMED" || booking.status === "COMPLETED").length
  return (
    <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-orange-950 to-orange-700 shadow-xl shadow-orange-200/70">
      <div className="p-6 pb-4 flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <p className="text-xs text-amber-200 font-bold tracking-wider uppercase mb-2">
            Phòng nổi bật
          </p>
          <h3 className="text-2xl lg:text-3xl font-black text-white leading-tight mb-4">
            {featuredRoom.title}
          </h3>
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-[10px] text-orange-50/60 uppercase tracking-wider">Đặt phòng</p>
              <p className="text-xl font-bold text-white">{roomBookings.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-orange-50/60 uppercase tracking-wider">Đã xác nhận</p>
              <p className="text-xl font-bold text-white">{confirmedBookings}</p>
            </div>
            <div>
              <p className="text-[10px] text-orange-50/60 uppercase tracking-wider">Giá</p>
              <p className="text-xl font-bold text-white">{roomPrice(featuredRoom)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/room-management/tenants/${featuredRoom.id}`}>
              <Button className="bg-white text-orange-700 hover:bg-orange-50 text-xs px-4 py-2 h-auto">
                Quản lý phòng
              </Button>
            </Link>
            <Link href="/bookings">
              <Button
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 text-xs px-4 py-2 h-auto"
              >
                Xem đặt phòng
              </Button>
            </Link>
          </div>
        </div>
        <div className="lg:w-64 h-48 lg:h-auto relative rounded-2xl overflow-hidden ring-1 ring-white/15">
          <img
            src={firstImage(featuredRoom)}
            alt={featuredRoom.title}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  )
}
