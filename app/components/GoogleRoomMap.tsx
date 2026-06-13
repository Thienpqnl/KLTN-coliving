'use client'

import { useEffect, useRef } from 'react'
import { loadGoogleMapsLibraries } from '@/lib/google-maps-loader'
import { Room } from '@/lib/services/room-client.service'

interface Props {
  rooms: Room[]
  onSelectRoom: (room: Room) => void
}

export default function RoomsMap({
  rooms,
  onSelectRoom,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  // Thay đổi type sang AdvancedMarkerElement
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])

  useEffect(() => {
    if (!mapContainer.current) return

    // Sử dụng singleton loader thay vì new Loader()
    let cancelled = false

    loadGoogleMapsLibraries().then(({ maps, marker: markerLibrary }) => {
      if (cancelled || !mapContainer.current) return

      const map = new maps.Map(mapContainer.current, {
        center: { lat: 10.85, lng: 106.809 },
        zoom: 12,
        // Map ID bắt buộc cho Advanced Markers
        mapId: "272573a64e10d24bf46100e2", 
      })

      mapRef.current = map

      // Xóa marker cũ
      markersRef.current.forEach(marker => { marker.map = null })
      markersRef.current = []

      rooms.forEach(room => {
        if (!room.latitude || !room.longitude) return

          const pinElement = document.createElement('div')
          // Thêm class 'whitespace-nowrap' để giá tiền không bị xuống dòng
          pinElement.innerHTML = `
            <div class="bg-white px-3 py-2 rounded-full shadow-lg text-sm font-bold text-slate-800 cursor-pointer hover:bg-orange-50 hover:text-orange-600 transition border border-gray-200 whitespace-nowrap">
              ${Math.round(room.priceValue)}Tr 
            </div>
          `

          const marker = new markerLibrary.AdvancedMarkerElement({
            position: { lat: room.latitude, lng: room.longitude },
            map: map,
            content: pinElement, // Gán cái div chứa giá tiền vào đây
          })

        // AdvancedMarkerElement dùng addEventListener chuẩn DOM
        pinElement.addEventListener('click', () => {
          onSelectRoom(room)
          map.panTo({ lat: room.latitude!, lng: room.longitude! })
          map.setZoom(16)
        })

        markersRef.current.push(marker)
      })
    })

    return () => {
      cancelled = true
      markersRef.current.forEach(marker => { marker.map = null })
      markersRef.current = []
    }
  }, [rooms, onSelectRoom])

  return (
    <div
      ref={mapContainer}
      className="h-[700px] w-full rounded-2xl overflow-hidden"
    />
  )
}
