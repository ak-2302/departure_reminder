import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { secureToken } from './secureToken'

const scope = 'https://www.googleapis.com/auth/calendar.events.readonly'
const redirectUri = 'https://ak-2302.github.io/departure_reminder/oauth2redirect'
const appCallbackUri = 'jp.ak2302.departurereminder:/oauth2redirect'
let pendingVerifier: string | undefined

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createChallenge(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}

export async function requestNativeCalendarAccess(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_IDが設定されていません')
  const { verifier, challenge } = await createChallenge()
  pendingVerifier = verifier
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)))
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return new Promise((resolve, reject) => {
    let settled = false
    let appListener: { remove: () => Promise<void> } | undefined
    let browserListener: { remove: () => Promise<void> } | undefined
    const cleanup = async () => {
      pendingVerifier = undefined
      await appListener?.remove()
      await browserListener?.remove()
    }
    const fail = async (error: Error) => {
      if (settled) return
      settled = true
      await cleanup()
      reject(error)
    }
    const callback = async ({ url }: { url: string }) => {
      if (!url.startsWith(appCallbackUri)) return
      try {
        await browserListener?.remove()
        await Browser.close()
        const callback = new URL(url)
        if (callback.searchParams.get('state') !== state) throw new Error('認証状態を確認できませんでした')
        const code = callback.searchParams.get('code')
        if (!code || !pendingVerifier) throw new Error('Google認証コードを取得できませんでした')
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: clientId, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: pendingVerifier }),
        })
        if (!response.ok) throw new Error('Google認証トークンを取得できませんでした')
        const token = await response.json() as { access_token?: string; refresh_token?: string }
        if (!token.access_token) throw new Error('Googleアクセストークンがありません')
        if (token.refresh_token) await secureToken.saveRefreshToken({ token: token.refresh_token, clientId })
        if (settled) return
        settled = true
        await cleanup()
        resolve(token.access_token)
      } catch (error) {
        await fail(error instanceof Error ? error : new Error('Google認証に失敗しました'))
      }
    }
    void App.addListener('appUrlOpen', callback)
      .then(async (listener) => {
        appListener = listener
        browserListener = await Browser.addListener('browserFinished', () => void fail(new Error('Google認証をキャンセルしました')))
        await Browser.open({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
      })
      .catch((error) => void fail(error instanceof Error ? error : new Error('Google認証画面を開けませんでした')))
  })
}

export async function refreshNativeCalendarAccess(): Promise<string | undefined> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_IDが設定されていません')
  const { token: refreshToken } = await secureToken.getRefreshToken()
  if (!refreshToken) return undefined
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  if (!response.ok) throw new Error('Google認証を更新できませんでした。再接続してください')
  const token = await response.json() as { access_token?: string }
  if (!token.access_token) throw new Error('更新されたGoogleアクセストークンがありません')
  return token.access_token
}
