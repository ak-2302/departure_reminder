import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

const calendarScope = 'https://www.googleapis.com/auth/calendar.events.readonly'
let initialized = false

async function initialize(): Promise<void> {
  if (initialized) return
  await GoogleAuth.initialize({
    scopes: [calendarScope],
    grantOfflineAccess: true,
  })
  initialized = true
}

export async function requestNativeCalendarAccess(): Promise<string> {
  await initialize()
  const user = await GoogleAuth.signIn()
  const accessToken = user.authentication?.accessToken
  if (!accessToken) throw new Error('Googleアクセストークンがありません')
  return accessToken
}

export async function refreshNativeCalendarAccess(): Promise<string | undefined> {
  await initialize()
  try {
    const authentication = await GoogleAuth.refresh()
    return authentication.accessToken || undefined
  } catch {
    return undefined
  }
}
