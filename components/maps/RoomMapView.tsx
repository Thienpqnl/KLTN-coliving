"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMapsLibraries } from "@/lib/google-maps-loader";

interface RoomMapViewProps {
  latitude?: number | null;
  longitude?: number | null;
}

export default function RoomMapView({
  latitude,
  longitude,
}: RoomMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if coordinates are valid numbers
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      console.warn('[RoomMapView] Missing coordinates:', { latitude, longitude });
      return;
    }

    let cancelled = false;

    loadGoogleMapsLibraries().then(({ maps, marker: markerLibrary }) => {
      if (cancelled || !mapContainer.current) return;

      const map = new maps.Map(mapContainer.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        mapId: "272573a64e10d24bf46100e2",
      });

      mapRef.current = map;

      const pinElement = document.createElement("div");
      pinElement.innerHTML = `
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="#f97316"/>
          <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>
      `;

      markerRef.current = new markerLibrary.AdvancedMarkerElement({
        position: { lat: latitude, lng: longitude },
        map: map,
        content: pinElement,
      });
    }).catch((error) => {
      console.error("[RoomMapView] Failed to load Google Maps:", error);
    });

    return () => {
      cancelled = true;
      if (markerRef.current) {
        markerRef.current.map = null;
      }
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  // Show placeholder if no coordinates
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return (
      <div className="h-80 w-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400 block mb-2">location_off</span>
          <p className="text-slate-500 text-sm">Chưa có dữ liệu vị trí</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="h-80 w-full rounded-xl overflow-hidden bg-slate-100"
    />
  );
}
