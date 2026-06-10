// lib/google-maps-loader.ts
import { Loader } from '@googlemaps/js-api-loader'

let loaderInstance: Loader | null = null

export function getGoogleMapsLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['marker'], // ️ Bắt buộc phải có cho Advanced Markers
    })
  }
  return loaderInstance
}