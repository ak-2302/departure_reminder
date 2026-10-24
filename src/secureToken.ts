import { registerPlugin } from '@capacitor/core'

interface SecureTokenPlugin {
  saveRefreshToken: (options: { token: string; clientId: string }) => Promise<void>
  getRefreshToken: () => Promise<{ token?: string }>
  clearRefreshToken: () => Promise<void>
}

export const secureToken = registerPlugin<SecureTokenPlugin>('SecureToken')
