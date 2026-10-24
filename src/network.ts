const timeoutMs = 12_000
const retryDelays = [400, 1_000]

export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      if (response.ok || !isRetryable(response.status) || attempt === retryDelays.length) return response
      await delay(retryDelays[attempt])
    } catch (error) {
      if (attempt === retryDelays.length) throw error instanceof DOMException && error.name === 'AbortError' ? new Error('通信がタイムアウトしました') : error
      await delay(retryDelays[attempt])
    } finally {
      window.clearTimeout(timeout)
    }
  }
  throw new Error('通信に失敗しました')
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
