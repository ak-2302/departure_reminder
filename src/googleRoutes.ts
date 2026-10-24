import type { TravelMode } from './domain'

const routesEndpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes'

type GoogleRouteResponse = {
  routes?: Array<{ duration?: string }>
}

export async function fetchTravelMinutes(origin: string, destination: string, mode: TravelMode): Promise<number> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('VITE_GOOGLE_MAPS_API_KEYが設定されていません')
  if (!origin.trim() || !destination.trim()) throw new Error('出発地点と目的地を設定してください')

  const body: Record<string, unknown> = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: mode.toUpperCase(),
    languageCode: 'ja-JP',
    units: 'METRIC',
  }
  if (mode === 'transit') body.transitPreferences = { routingPreference: 'FEWER_TRANSFERS' }

  const response = await fetch(routesEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Routes API error: ${response.status}`)
  const result = await response.json() as GoogleRouteResponse
  const duration = result.routes?.[0]?.duration
  const seconds = duration ? Number.parseFloat(duration.replace('s', '')) : NaN
  if (!Number.isFinite(seconds)) throw new Error('経路が見つかりませんでした')
  return Math.max(1, Math.ceil(seconds / 60))
}
