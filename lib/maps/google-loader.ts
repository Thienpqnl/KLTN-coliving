import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

type GoogleLibraries = {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
};

let configured = false;
let librariesPromise: Promise<GoogleLibraries> | null = null;
let authenticationFailed = false;
const authFailureListeners = new Set<() => void>();

function configure() {
  if (configured) return;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Thiếu NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

  if (typeof window !== "undefined") {
    const target = window as Window & { gm_authFailure?: () => void };
    const previousHandler = target.gm_authFailure;
    target.gm_authFailure = () => {
      authenticationFailed = true;
      authFailureListeners.forEach((listener) => listener());
      previousHandler?.();
    };
  }

  setOptions({ key, v: "weekly", libraries: ["marker"] });
  configured = true;
}

export function loadGoogleMapsLibraries() {
  configure();
  if (authenticationFailed) return Promise.reject(new Error("Google Maps authentication failed"));

  librariesPromise ??= Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
  ])
    .then(([maps, marker]) => ({ maps, marker }))
    .catch((error) => {
      // Cho phép thử lại sau lỗi mạng hoặc lỗi tải script tạm thời.
      librariesPromise = null;
      throw error;
    });

  return librariesPromise;
}

export function waitForGoogleMapTiles(map: google.maps.Map, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    if (authenticationFailed) {
      reject(new Error("Google Maps authentication failed"));
      return;
    }

    let settled = false;
    const resources: {
      timeoutId?: number;
      tilesListener?: google.maps.MapsEventListener;
    } = {};

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (resources.timeoutId !== undefined) window.clearTimeout(resources.timeoutId);
      resources.tilesListener?.remove();
      authFailureListeners.delete(onAuthFailure);
      if (error) reject(error);
      else resolve();
    };
    const onAuthFailure = () => finish(new Error("Google Maps authentication failed"));
    resources.tilesListener = map.addListener("tilesloaded", () => finish());
    resources.timeoutId = window.setTimeout(
      () => finish(new Error("Google Maps tiles loading timed out")),
      timeoutMs,
    );
    authFailureListeners.add(onAuthFailure);
  });
}
