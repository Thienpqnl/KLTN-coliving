"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, MapPinOff } from "lucide-react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { loadGoogleMapsLibraries, waitForGoogleMapTiles } from "@/lib/maps/google-loader";
import { clearGoogleMapsFailure, getGoogleMapsTimeout } from "@/lib/maps/provider-health";
import { useResilientMapProvider } from "@/lib/maps/use-resilient-map-provider";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

type SelectedLocation = { lat: number; lng: number; address: string };

function removeGoogleMarker(marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null) {
  if (!marker) return;
  if (marker instanceof google.maps.Marker) marker.setMap(null);
  else marker.map = null;
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = await response.json();
    return data.address || "Không tìm thấy địa chỉ";
  } catch {
    return "Không thể xác định địa chỉ";
  }
}

function GooglePicker({ initialLat, initialLng, onPick, onFailure }: { initialLat?: number; initialLng?: number; onPick: (lat: number, lng: number) => void; onFailure: (reason: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null = null;
    let clickListener: google.maps.MapsEventListener | null = null;

    loadGoogleMapsLibraries().then(async ({ maps, marker: markerLibrary }) => {
      if (cancelled) return;
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const center = { lat: initialLat ?? 10.762622, lng: initialLng ?? 106.660172 };
      const map = new maps.Map(container, { center, zoom: 14, clickableIcons: false, ...(mapId ? { mapId } : {}) });

      const setMarker = (position: google.maps.LatLngLiteral) => {
        removeGoogleMarker(marker);
        marker = mapId
          ? new markerLibrary.AdvancedMarkerElement({ position, map })
          : new google.maps.Marker({ position, map });
      };

      if (initialLat != null && initialLng != null) setMarker({ lat: initialLat, lng: initialLng });
      clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setMarker({ lat, lng });
        onPick(lat, lng);
      });

      await waitForGoogleMapTiles(map, getGoogleMapsTimeout());
      if (!cancelled) clearGoogleMapsFailure();
    }).catch((error) => {
      if (!cancelled) onFailure(error instanceof Error ? error.message : "Google Maps failed");
    });

    return () => {
      cancelled = true;
      clickListener?.remove();
      removeGoogleMarker(marker);
      container.innerHTML = "";
    };
  }, [initialLat, initialLng, onFailure, onPick]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function MapboxPicker({ initialLat, initialLng, onPick, onFailure }: { initialLat?: number; initialLng?: number; onPick: (lat: number, lng: number) => void; onFailure: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return onFailure();
    let cancelled = false;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/streets-v12", center: [initialLng ?? 106.660172, initialLat ?? 10.762622], zoom: 14 });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.once("error", onFailure);
      mapRef.current = map;

      const setMarker = (lng: number, lat: number) => {
        markerRef.current?.remove();
        markerRef.current = new mapboxgl.Marker({ color: "#f97316" }).setLngLat([lng, lat]).addTo(map);
      };
      if (initialLat != null && initialLng != null) setMarker(initialLng, initialLat);
      map.on("click", (event) => {
        setMarker(event.lngLat.lng, event.lngLat.lat);
        onPick(event.lngLat.lat, event.lngLat.lng);
      });
    }).catch(onFailure);

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [initialLat, initialLng, onFailure, onPick]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export function MapPicker({ onLocationSelect, initialLat, initialLng }: MapPickerProps) {
  const { provider, fallbackToMapbox } = useResilientMapProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  const handlePick = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const address = await reverseGeocode(lat, lng);
    setSelectedLocation({ lat, lng, address });
    onLocationSelect(lat, lng, address);
    setIsLoading(false);
  }, [onLocationSelect]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-orange-500" />
        <p className="text-sm font-medium text-foreground">Bấm vào bản đồ để chọn vị trí</p>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
      </div>

      <div className="h-80 w-full overflow-hidden rounded-xl border-2 border-sky-200 bg-slate-100 shadow-md">
        {mapboxFailed ? (
          <div className="flex h-full items-center justify-center"><div className="text-center"><MapPinOff className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-600">Không thể tải bản đồ. Vui lòng nhập địa chỉ thủ công.</p></div></div>
        ) : provider === "google" ? (
          <GooglePicker initialLat={initialLat} initialLng={initialLng} onPick={handlePick} onFailure={fallbackToMapbox} />
        ) : (
          <MapboxPicker initialLat={initialLat} initialLng={initialLng} onPick={handlePick} onFailure={() => setMapboxFailed(true)} />
        )}
      </div>

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
