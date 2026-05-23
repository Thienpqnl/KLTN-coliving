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
    return <div className="h-64 rounded-2xl bg-secondary animate-pulse" />
  }

  if (!featuredRoom) {
    return (
      <div className="bg-navy rounded-2xl overflow-hidden shadow-lg p-6">
        <p className="text-xs text-primary font-medium tracking-wider uppercase mb-2">Phòng nổi bật</p>
        <h3 className="text-2xl font-serif text-navy-foreground leading-tight mb-3">Chưa có phòng</h3>
        <p className="text-sm text-navy-foreground/70 mb-5">Tạo phòng đầu tiên để bắt đầu nhận yêu cầu đặt phòng.</p>
        <Link href="/room-management/add-room">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 h-auto">
            Thêm phòng
          </Button>
        </Link>
      </div>
    )
  }

  const roomBookings = bookings.filter((booking) => booking.roomId === featuredRoom.id)
  const confirmedBookings = roomBookings.filter((booking) => booking.status === "CONFIRMED" || booking.status === "COMPLETED").length

  return (
    <div className="bg-navy rounded-2xl overflow-hidden shadow-lg">
      <div className="p-6 pb-4 flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <p className="text-xs text-primary font-medium tracking-wider uppercase mb-2">
            Phòng nổi bật
          </p>
          <h3 className="text-2xl lg:text-3xl font-serif text-navy-foreground leading-tight mb-4">
            {featuredRoom.title}
          </h3>
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Đặt phòng</p>
              <p className="text-xl font-bold text-navy-foreground">{roomBookings.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Đã xác nhận</p>
              <p className="text-xl font-bold text-navy-foreground">{confirmedBookings}</p>
            </div>
            <div>
              <p className="text-[10px] text-navy-foreground/60 uppercase tracking-wider">Giá</p>
              <p className="text-xl font-bold text-navy-foreground">{roomPrice(featuredRoom)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/room-management/edit-room?id=${featuredRoom.id}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 h-auto">
                Quản lý phòng
              </Button>
            </Link>
            <Link href="/bookings">
              <Button
                variant="outline"
                className="border-navy-foreground/30 text-navy-foreground hover:bg-navy-foreground/10 text-xs px-4 py-2 h-auto"
              >
                Xem đặt phòng
              </Button>
            </Link>
          </div>
        </div>
        <div className="lg:w-64 h-48 lg:h-auto relative rounded-xl overflow-hidden">
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
