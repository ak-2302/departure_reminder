import type { TravelMode } from './domain'

const routesEndpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const cacheTtlMs = 10 * 60 * 1000
const routeCache = new Map<string, { travelMinutes: number; expiresAt: number }>()
const pendingRoutes = new Map<string, Promise<number>>()

type GoogleRouteResponse = {
  routes?: Array<{ duration?: string }>
}

export async function fetchTravelMinutes(origin: string, destination: string, mode: TravelMode): Promise<number> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('VITE_GOOGLE_MAPS_API_KEYが設定されていません')
  if (!origin.trim() || !destination.trim()) throw new Error('出発地点と目的地を設定してください')
  const cacheKey = `${origin.trim()}\u0000${destination.trim()}\u0000${mode}`
  const cached = routeCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.travelMinutes
  const pending = pendingRoutes.get(cacheKey)
  if (pending) return pending

  const request = requestTravelMinutes(origin.trim(), destination.trim(), mode, apiKey)
  pendingRoutes.set(cacheKey, request)
  try {
    const travelMinutes = await request
    routeCache.set(cacheKey, { travelMinutes, expiresAt: Date.now() + cacheTtlMs })
    return travelMinutes
  } finally {
    pendingRoutes.delete(cacheKey)
  }
}

async function requestTravelMinutes(origin: string, destination: string, mode: TravelMode, apiKey: string): Promise<number> {

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
