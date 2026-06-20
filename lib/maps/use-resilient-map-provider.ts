"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GOOGLE_MAPS_FAILURE_EVENT,
  getPreferredMapProvider,
  MapProvider,
  markGoogleMapsFailed,
} from "@/lib/maps/provider-health";

export function useResilientMapProvider() {
  const [provider, setProvider] = useState<MapProvider>(() => getPreferredMapProvider());

  useEffect(() => {
    const handleGoogleFailure = () => setProvider("mapbox");
    window.addEventListener(GOOGLE_MAPS_FAILURE_EVENT, handleGoogleFailure);
    return () => window.removeEventListener(GOOGLE_MAPS_FAILURE_EVENT, handleGoogleFailure);
  }, []);

  const fallbackToMapbox = useCallback((reason: string) => {
    markGoogleMapsFailed(reason);
    setProvider("mapbox");
  }, []);

  return { provider, fallbackToMapbox };
}
