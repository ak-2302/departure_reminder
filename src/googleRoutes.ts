import type { TravelMode } from './domain'
import { fetchWithRetry } from './network'
import { Capacitor } from '@capacitor/core'

const routesEndpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const cacheTtlMs = 10 * 60 * 1000
const dailyRequestLimit = 50
const dailyRequestKey = 'routes-api-daily-request-count'
const androidPackage = 'jp.ak2302.departurereminder'
const androidCertSha1 = '648DCB1015E78A8685B13AEDFC1003343486B80C'
const routeCache = new Map<string, { travelMinutes: number; expiresAt: number }>()
const pendingRoutes = new Map<string, Promise<number>>()

type GoogleRouteResponse = {
  routes?: Array<{ duration?: string }>
}

export async function fetchTravelMinutes(origin: string, destination: string, mode: TravelMode, departureTime?: string): Promise<number> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('VITE_GOOGLE_MAPS_API_KEYが設定されていません')
  if (!origin.trim() || !destination.trim()) throw new Error('出発地点と目的地を設定してください')
  const cacheKey = `${origin.trim()}\u0000${destination.trim()}\u0000${mode}\u0000${departureTime ?? ''}`
  const cached = routeCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.travelMinutes
  const pending = pendingRoutes.get(cacheKey)
  if (pending) return pending
  reserveDailyRequest()

  const request = requestTravelMinutes(origin.trim(), destination.trim(), mode, apiKey, departureTime)
  pendingRoutes.set(cacheKey, request)
  try {
    const travelMinutes = await request
    routeCache.set(cacheKey, { travelMinutes, expiresAt: Date.now() + cacheTtlMs })
    return travelMinutes
  } finally {
    pendingRoutes.delete(cacheKey)
  }
}

function reserveDailyRequest(): void {
  const today = new Date().toISOString().slice(0, 10)
  const stored = localStorage.getItem(dailyRequestKey)
  let current: { date?: string; count?: number } | undefined
  try {
    current = stored ? JSON.parse(stored) as { date?: string; count?: number } : undefined
  } catch {
    current = undefined
  }
  const count = current?.date === today ? current.count ?? 0 : 0
  if (count >= dailyRequestLimit) throw new Error(`本日の経路取得上限（${dailyRequestLimit}回）に達しました。明日もう一度お試しください`)
  localStorage.setItem(dailyRequestKey, JSON.stringify({ date: today, count: count + 1 }))
}

async function requestTravelMinutes(origin: string, destination: string, mode: TravelMode, apiKey: string, departureTime?: string): Promise<number> {

  const body: Record<string, unknown> = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: mode.toUpperCase(),
    languageCode: 'ja-JP',
    units: 'METRIC',
  }
  if (mode === 'transit') {
    body.transitPreferences = { routingPreference: 'FEWER_TRANSFERS' }
    if (departureTime) body.departureTime = departureTime
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'routes.duration',
  }
  if (Capacitor.isNativePlatform()) {
    headers['X-Android-Package'] = androidPackage
    headers['X-Android-Cert'] = androidCertSha1
  }
  const response = await fetchWithRetry(routesEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Routes API error: ${response.status}`)
  const result = await response.json() as GoogleRouteResponse
  const duration = result.routes?.[0]?.duration
  const seconds = duration ? Number.parseFloat(duration.replace('s', '')) : NaN
  if (!Number.isFinite(seconds)) throw new Error('経路が見つかりませんでした')
  return Math.max(1, Math.ceil(seconds / 60))
}
