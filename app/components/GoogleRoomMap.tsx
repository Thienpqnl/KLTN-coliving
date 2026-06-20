"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";
import type { Map, Marker } from "mapbox-gl";
import { Room } from "@/lib/services/room-client.service";

interface Props {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}

export default function RoomsMap({ rooms, onSelectRoom }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const callbackRef = useRef(onSelectRoom);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    callbackRef.current = onSelectRoom;
  }, [onSelectRoom]);

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

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [106.809, 10.85],
          zoom: 11,
        });
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.on("error", () => setMapError(true));
        mapRef.current = map;

        const bounds = new mapboxgl.LngLatBounds();
        rooms.forEach((room) => {
          if (room.latitude == null || room.longitude == null) return;

          const element = document.createElement("button");
          element.type = "button";
          element.className = "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition hover:bg-orange-50 hover:text-orange-600";
          element.textContent = `${Math.round(Number(room.priceValue || 0)).toLocaleString("vi-VN")} đ`;
          element.addEventListener("click", () => {
            callbackRef.current(room);
            map.easeTo({ center: [room.longitude!, room.latitude!], zoom: 15 });
          });

          markersRef.current.push(new mapboxgl.Marker({ element }).setLngLat([room.longitude, room.latitude]).addTo(map));
          bounds.extend([room.longitude, room.latitude]);
        });

        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 70, maxZoom: 14 });
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [rooms]);

  if (mapError) {
    return (
      <div className="flex h-[700px] w-full items-center justify-center rounded-2xl bg-slate-100">
        <div className="text-center"><MapPinOff className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-600">Không thể tải bản đồ lúc này</p></div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-[700px] w-full overflow-hidden rounded-2xl" />;
}
