import { Geolocation } from '@capacitor/geolocation'

export type CurrentLocation = {
  latitude: number
  longitude: number
}

export async function getCurrentLocation(): Promise<CurrentLocation> {
  const permission = await Geolocation.checkPermissions()
  if (permission.location !== 'granted') {
    const requested = await Geolocation.requestPermissions()
    if (requested.location !== 'granted') throw new Error('現在地の取得が許可されていません')
  }
  const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 })
  return { latitude: position.coords.latitude, longitude: position.coords.longitude }
}

export function formatLocationForRoutes(location: CurrentLocation): string {
  return `${location.latitude},${location.longitude}`
}
