"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPinOff } from "lucide-react";
import type { Map, Marker } from "mapbox-gl";

interface RoomMapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
}

export default function RoomMapView({ latitude, longitude, mapUrl }: RoomMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || latitude == null || longitude == null) return;

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

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [longitude, latitude],
          zoom: 14,
          interactive: false,
          attributionControl: true,
        });

        map.on("error", () => setMapError(true));
        mapRef.current = map;

        const markerElement = document.createElement("div");
        markerElement.className = "h-9 w-9 rounded-full border-4 border-white bg-orange-500 shadow-lg";
        markerRef.current = new mapboxgl.Marker({ element: markerElement })
          .setLngLat([longitude, latitude])
          .addTo(map);
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  const unavailable = latitude == null || longitude == null || mapError;
  if (unavailable) {
    return (
      <div className="flex h-80 w-full items-center justify-center bg-slate-100">
        <div className="max-w-sm px-6 text-center">
          <MapPinOff className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {mapError ? "Không thể tải bản đồ lúc này" : "Chưa có dữ liệu vị trí"}
          </p>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-600">
              Mở vị trí bên ngoài <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-80 w-full overflow-hidden bg-slate-100">
      <div ref={mapContainer} className="h-full w-full" />
      {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" aria-label="Mở vị trí phòng trên Google Maps" className="absolute inset-0" />}
    </div>
  );
}
