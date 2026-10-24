import type { CalendarEvent } from './domain'
import { Capacitor } from '@capacitor/core'
import { requestNativeCalendarAccess } from './nativeGoogleAuth'

const calendarScope = 'https://www.googleapis.com/auth/calendar.events.readonly'
const scriptUrl = 'https://accounts.google.com/gsi/client'

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void
}

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (options: {
        client_id: string
        scope: string
        callback: (response: { access_token?: string; error?: string }) => void
      }) => GoogleTokenClient
    }
  }
}

declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | undefined

function loadIdentityScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google認証ライブラリを読み込めませんでした'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function requestCalendarAccess(): Promise<string> {
  if (Capacitor.isNativePlatform()) return requestNativeCalendarAccess()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_IDが設定されていません')
  await loadIdentityScript()
  if (!window.google) throw new Error('Google認証ライブラリを利用できません')

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: calendarScope,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Googleカレンダーの認証に失敗しました'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export async function fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const baseParams = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: 'false',
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    maxResults: '50',
  })
  const events: CalendarEvent[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 10; page += 1) {
    const params = new URLSearchParams(baseParams)
    if (pageToken) params.set('pageToken', pageToken)
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (response.status === 401) throw new Error('Google認証の期限が切れています。再接続してください')
    if (!response.ok) throw new Error(`Calendar API error: ${response.status}`)
    const body = await response.json() as { items?: GoogleCalendarEvent[]; nextPageToken?: string }
    events.push(...(body.items ?? []).flatMap(toCalendarEvent))
    pageToken = body.nextPageToken
    if (!pageToken) break
  }
  return events
}

type GoogleCalendarEvent = {
  id?: string
  summary?: string
  location?: string
  status?: string
  start?: { dateTime?: string; date?: string }
}

function toCalendarEvent(event: GoogleCalendarEvent): CalendarEvent[] {
  const start = event.start?.dateTime
  if (!event.id || !start || event.status === 'cancelled' || !event.location) return []
  const date = new Date(start)
  return [{
    id: event.id,
    title: event.summary || '予定',
    startAt: date.toISOString(),
    startsAt: date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    location: event.location,
    travelMinutes: 0,
    preparationMinutes: 0,
  }]
}
