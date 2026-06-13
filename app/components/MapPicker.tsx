'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsLibraries } from '@/lib/google-maps-loader'
import { Loader2, MapPin } from 'lucide-react'

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialLat?: number
  initialLng?: number
}

export function MapPicker({ onLocationSelect, initialLat, initialLng }: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address: string
  } | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    let cancelled = false

    loadGoogleMapsLibraries().then(({ maps, marker: markerLibrary }) => {
      if (cancelled || !mapContainer.current) return

      const defaultLng = initialLng || 106.660172
      const defaultLat = initialLat || 10.762622

      const map = new maps.Map(mapContainer.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 14,
        clickableIcons: false,
        mapId: '272573a64e10d24bf46100e2',
      })

      mapRef.current = map

      const createOrangeMarker = (lat: number, lng: number) => {
        const pinElement = document.createElement('div')
        pinElement.innerHTML = `
          <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="#f97316"/>
            <circle cx="15" cy="15" r="6" fill="white"/>
          </svg>
        `

        return new markerLibrary.AdvancedMarkerElement({
          position: { lat, lng },
          map,
          content: pinElement,
        })
      }

      if (initialLat && initialLng) {
        markerRef.current = createOrangeMarker(initialLat, initialLng)
      }

      map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return

        const lat = e.latLng.lat()
        const lng = e.latLng.lng()

        setIsLoading(true)
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
          const data = await response.json()
          const address = data.address || 'Không tìm thấy địa chỉ'

          if (markerRef.current) {
            markerRef.current.map = null
          }

          markerRef.current = createOrangeMarker(lat, lng)

          setSelectedLocation({ lat, lng, address })
          onLocationSelect(lat, lng, address)
        } catch (error) {
          console.error('Lỗi reverse geocoding:', error)
        } finally {
          setIsLoading(false)
        }
      })
    }).catch((error) => {
      console.error('Lỗi tải Google Maps:', error)
    })

    return () => {
      cancelled = true
      if (markerRef.current) {
        markerRef.current.map = null
      }
      mapRef.current = null
    }
  }, [onLocationSelect, initialLat, initialLng])

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
        <p className="text-sm font-medium text-foreground">
          Bấm vào bản đồ để chọn vị trí
        </p>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
      </div>

      <div
        ref={mapContainer}
        className="w-full h-80 rounded-xl border-2 border-blue-200 overflow-hidden shadow-md relative"
        style={{ cursor: isLoading ? 'wait' : 'pointer' }}
      />

      {selectedLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-2">Vị trí đã chọn:</p>
          <p className="text-sm text-blue-800">
            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
          <p className="text-sm text-blue-800 mt-1">
            {selectedLocation.address}
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="font-medium text-foreground mb-1">Mẹo:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Bấm vào bản đồ để xác định vị trí phòng</li>
          <li>Hệ thống sẽ tự động lấy địa chỉ từ tọa độ</li>
          <li>Bạn có thể chỉnh sửa địa chỉ ở ô nhập liệu dưới đây</li>
        </ul>
      </div>
    </div>
  )
}
