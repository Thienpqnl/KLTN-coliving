"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPinOff } from "lucide-react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { loadGoogleMapsLibraries, waitForGoogleMapTiles } from "@/lib/maps/google-loader";
import { clearGoogleMapsFailure, getGoogleMapsTimeout } from "@/lib/maps/provider-health";
import { useResilientMapProvider } from "@/lib/maps/use-resilient-map-provider";

interface RoomMapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
}

function removeGoogleMarker(marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null) {
  if (!marker) return;
  if (marker instanceof google.maps.Marker) marker.setMap(null);
  else marker.map = null;
}

function GoogleRoomMap({ latitude, longitude, onFailure }: { latitude: number; longitude: number; onFailure: (reason: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null = null;

    loadGoogleMapsLibraries()
      .then(async ({ maps, marker: markerLibrary }) => {
        if (cancelled) return;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
        const map = new maps.Map(container, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          disableDefaultUI: true,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          ...(mapId ? { mapId } : {}),
        });

        if (mapId) {
          marker = new markerLibrary.AdvancedMarkerElement({ position: { lat: latitude, lng: longitude }, map });
        } else {
          marker = new google.maps.Marker({ position: { lat: latitude, lng: longitude }, map });
        }

        await waitForGoogleMapTiles(map, getGoogleMapsTimeout());
        if (!cancelled) clearGoogleMapsFailure();
      })
      .catch((error) => {
        if (!cancelled) onFailure(error instanceof Error ? error.message : "Google Maps failed");
      });

    return () => {
      cancelled = true;
      removeGoogleMarker(marker);
      container.innerHTML = "";
    };
  }, [latitude, longitude, onFailure]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function MapboxRoomMap({ latitude, longitude, onFailure }: { latitude: number; longitude: number; onFailure: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return onFailure();
    let cancelled = false;
    let loadTimeoutId: number | undefined;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/streets-v12", center: [longitude, latitude], zoom: 14, interactive: false });
      loadTimeoutId = window.setTimeout(() => {
        if (!cancelled) onFailure();
      }, getGoogleMapsTimeout());
      map.once("load", () => {
        if (loadTimeoutId !== undefined) window.clearTimeout(loadTimeoutId);
      });
      mapRef.current = map;
      const markerElement = document.createElement("div");
      markerElement.className = "h-9 w-9 rounded-full border-4 border-white bg-orange-500 shadow-lg";
      markerRef.current = new mapboxgl.Marker({ element: markerElement }).setLngLat([longitude, latitude]).addTo(map);
    }).catch(() => {
      if (!cancelled) onFailure();
    });

    return () => {
      cancelled = true;
      if (loadTimeoutId !== undefined) window.clearTimeout(loadTimeoutId);
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [latitude, longitude, onFailure]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default function RoomMapView({ latitude, longitude, mapUrl }: RoomMapViewProps) {
  const { provider, fallbackToMapbox } = useResilientMapProvider();
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const hasCoordinates = latitude != null && longitude != null;

  if (!hasCoordinates || mapboxFailed) {
    return (
      <div className="flex h-80 w-full items-center justify-center bg-slate-100">
        <div className="max-w-sm px-6 text-center">
          <MapPinOff className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-600">{mapboxFailed ? "Không thể tải bản đồ lúc này" : "Chưa có dữ liệu vị trí"}</p>
          {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-700">Mở vị trí bên ngoài <ExternalLink className="h-4 w-4" /></a>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-80 w-full overflow-hidden bg-slate-100">
      {provider === "google" ? (
        <GoogleRoomMap latitude={latitude} longitude={longitude} onFailure={fallbackToMapbox} />
      ) : (
        <MapboxRoomMap latitude={latitude} longitude={longitude} onFailure={() => setMapboxFailed(true)} />
      )}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Mở vị trí phòng trên Google Maps"
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur hover:text-orange-700"
        >
          Mở bản đồ
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
