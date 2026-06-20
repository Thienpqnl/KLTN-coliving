export type MapProvider = "google" | "mapbox";

const FAILURE_KEY = "coliving:google-maps-failure";
export const GOOGLE_MAPS_FAILURE_EVENT = "coliving:google-maps-failure";

type FailureRecord = {
  retryAfter: number;
  reason: string;
};

function nextLocalMidnight() {
  const date = new Date();
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

export function getPreferredMapProvider(): MapProvider {
  if (process.env.NEXT_PUBLIC_MAP_PROVIDER === "mapbox") return "mapbox";
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return "mapbox";
  if (typeof window === "undefined") return "google";

  try {
    const raw = window.sessionStorage.getItem(FAILURE_KEY);
    if (!raw) return "google";
    const failure = JSON.parse(raw) as FailureRecord;
    if (failure.retryAfter > Date.now()) return "mapbox";
    window.sessionStorage.removeItem(FAILURE_KEY);
  } catch {
    window.sessionStorage.removeItem(FAILURE_KEY);
  }

  return "google";
}

export function markGoogleMapsFailed(reason: string) {
  if (typeof window === "undefined") return;
  const failure: FailureRecord = { retryAfter: nextLocalMidnight(), reason };
  window.sessionStorage.setItem(FAILURE_KEY, JSON.stringify(failure));
  window.dispatchEvent(new CustomEvent(GOOGLE_MAPS_FAILURE_EVENT, { detail: failure }));
}

export function clearGoogleMapsFailure() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(FAILURE_KEY);
}

export function getGoogleMapsTimeout() {
  const configured = Number(process.env.NEXT_PUBLIC_GOOGLE_MAP_TIMEOUT_MS || 10000);
  return Number.isFinite(configured) && configured >= 3000 ? configured : 10000;
}
