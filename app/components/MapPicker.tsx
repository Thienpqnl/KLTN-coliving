"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, MapPinOff } from "lucide-react";
import type { Map, Marker } from "mapbox-gl";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export function MapPicker({ onLocationSelect, initialLat, initialLng }: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const callbackRef = useRef(onLocationSelect);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  useEffect(() => {
    callbackRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError(true);
      return;
    }

    let cancelled = false;
    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !mapContainer.current) return;
        mapboxgl.accessToken = token;

        const defaultLng = initialLng ?? 106.660172;
        const defaultLat = initialLat ?? 10.762622;
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [defaultLng, defaultLat],
          zoom: 14,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", () => setMapError(true));
        mapRef.current = map;

        const setMarker = (lng: number, lat: number) => {
          markerRef.current?.remove();
          markerRef.current = new mapboxgl.Marker({ color: "#f97316" }).setLngLat([lng, lat]).addTo(map);
        };

        if (initialLat != null && initialLng != null) setMarker(initialLng, initialLat);

        map.on("click", async (event) => {
          const { lat, lng } = event.lngLat;
          setIsLoading(true);
          try {
            const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
            const data = await response.json();
            const address = data.address || "Không tìm thấy địa chỉ";
            setMarker(lng, lat);
            setSelectedLocation({ lat, lng, address });
            callbackRef.current(lat, lng, address);
          } catch {
            setSelectedLocation({ lat, lng, address: "Không thể xác định địa chỉ" });
            setMarker(lng, lat);
            callbackRef.current(lat, lng, "Không thể xác định địa chỉ");
          } finally {
            setIsLoading(false);
          }
        });
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLng]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-orange-500" />
        <p className="text-sm font-medium text-foreground">Bấm vào bản đồ để chọn vị trí</p>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
      </div>

      {mapError ? (
        <div className="flex h-80 items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-100">
          <div className="text-center"><MapPinOff className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-600">Không thể tải bản đồ. Vui lòng nhập địa chỉ thủ công.</p></div>
        </div>
      ) : (
        <div ref={mapContainer} className="h-80 w-full overflow-hidden rounded-xl border-2 border-sky-200 shadow-md" style={{ cursor: isLoading ? "wait" : "crosshair" }} />
      )}

      {selectedLocation && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <p className="mb-2 text-xs font-semibold text-sky-900">Vị trí đã chọn:</p>
          <p className="text-sm text-sky-800">{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
          <p className="mt-1 text-sm text-sky-800">{selectedLocation.address}</p>
        </div>
      )}
    </div>
  );
}
