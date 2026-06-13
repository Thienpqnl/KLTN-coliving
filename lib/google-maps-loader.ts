// lib/google-maps-loader.ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let isConfigured = false
let librariesPromise: Promise<{
  maps: google.maps.MapsLibrary
  marker: google.maps.MarkerLibrary
}> | null = null

function configureGoogleMaps() {
  if (isConfigured) return

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing')
  }

  setOptions({
    key: apiKey,
    v: 'weekly',
    libraries: ['marker'],
  })

  isConfigured = true
}

export function loadGoogleMapsLibraries() {
  configureGoogleMaps()

  librariesPromise ??= Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
  ]).then(([maps, marker]) => ({ maps, marker }))

  return librariesPromise
}
