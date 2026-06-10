"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

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
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if coordinates are valid numbers
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      console.warn('[RoomMapView] Missing coordinates:', { latitude, longitude });
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[RoomMapView] Google Maps API key not found');
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
    });

    loader.load().then(() => {
      const map = new google.maps.Map(mapContainer.current!, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
      });

      mapRef.current = map;

      // Add marker
      markerRef.current = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
        },
      });
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
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