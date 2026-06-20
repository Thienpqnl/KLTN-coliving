"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { Room } from "@/lib/services/room-client.service";
import { loadGoogleMapsLibraries, waitForGoogleMapTiles } from "@/lib/maps/google-loader";
import { clearGoogleMapsFailure, getGoogleMapsTimeout } from "@/lib/maps/provider-health";
import { useResilientMapProvider } from "@/lib/maps/use-resilient-map-provider";

interface Props {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}

function priceLabel(room: Room) {
  return `${Math.round(Number(room.priceValue || 0)).toLocaleString("vi-VN")} đ`;
}

function removeGoogleMarker(marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker) {
  if (marker instanceof google.maps.Marker) marker.setMap(null);
  else marker.map = null;
}

function GoogleRoomsMap({ rooms, onSelectRoom, onFailure }: Props & { onFailure: (reason: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    const markers: Array<google.maps.marker.AdvancedMarkerElement | google.maps.Marker> = [];

    loadGoogleMapsLibraries().then(async ({ maps, marker: markerLibrary }) => {
      if (cancelled) return;
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const map = new maps.Map(container, { center: { lat: 10.85, lng: 106.809 }, zoom: 11, ...(mapId ? { mapId } : {}) });
      const bounds = new google.maps.LatLngBounds();

      rooms.forEach((room) => {
        if (room.latitude == null || room.longitude == null) return;
        const position = { lat: room.latitude, lng: room.longitude };

        if (mapId) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition hover:bg-orange-50 hover:text-orange-600";
          element.textContent = priceLabel(room);
          element.addEventListener("click", () => {
            onSelectRoom(room);
            map.panTo(position);
            map.setZoom(15);
          });
          markers.push(new markerLibrary.AdvancedMarkerElement({ position, map, content: element }));
        } else {
          const marker = new google.maps.Marker({ position, map, title: `${room.title} - ${priceLabel(room)}`, label: { text: priceLabel(room), color: "#7c2d12", fontWeight: "700" } });
          marker.addListener("click", () => {
            onSelectRoom(room);
            map.panTo(position);
            map.setZoom(15);
          });
          markers.push(marker);
        }
        bounds.extend(position);
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds, 70);
      await waitForGoogleMapTiles(map, getGoogleMapsTimeout());
      if (!cancelled) clearGoogleMapsFailure();
    }).catch((error) => {
      if (!cancelled) onFailure(error instanceof Error ? error.message : "Google Maps failed");
    });

    return () => {
      cancelled = true;
      markers.forEach(removeGoogleMarker);
      container.innerHTML = "";
    };
  }, [onFailure, onSelectRoom, rooms]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function MapboxRoomsMap({ rooms, onSelectRoom, onFailure }: Props & { onFailure: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return onFailure();
    let cancelled = false;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/streets-v12", center: [106.809, 10.85], zoom: 11 });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.once("error", onFailure);
      mapRef.current = map;
      const bounds = new mapboxgl.LngLatBounds();

      rooms.forEach((room) => {
        if (room.latitude == null || room.longitude == null) return;
        const element = document.createElement("button");
        element.type = "button";
        element.className = "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition hover:bg-orange-50 hover:text-orange-600";
        element.textContent = priceLabel(room);
        element.addEventListener("click", () => {
          onSelectRoom(room);
          map.easeTo({ center: [room.longitude!, room.latitude!], zoom: 15 });
        });
        markersRef.current.push(new mapboxgl.Marker({ element }).setLngLat([room.longitude, room.latitude]).addTo(map));
        bounds.extend([room.longitude, room.latitude]);
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 70, maxZoom: 14 });
    }).catch(onFailure);

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onFailure, onSelectRoom, rooms]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default function RoomsMap({ rooms, onSelectRoom }: Props) {
  const { provider, fallbackToMapbox } = useResilientMapProvider();
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const selectRoom = useCallback((room: Room) => onSelectRoom(room), [onSelectRoom]);

  if (mapboxFailed) return <div className="flex h-[700px] items-center justify-center rounded-2xl bg-slate-100"><div className="text-center"><MapPinOff className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-600">Không thể tải bản đồ lúc này</p></div></div>;

  return (
    <div className="h-[700px] w-full overflow-hidden rounded-2xl bg-slate-100">
      {provider === "google" ? (
        <GoogleRoomsMap rooms={rooms} onSelectRoom={selectRoom} onFailure={fallbackToMapbox} />
      ) : (
        <MapboxRoomsMap rooms={rooms} onSelectRoom={selectRoom} onFailure={() => setMapboxFailed(true)} />
      )}
    </div>
  );
}
