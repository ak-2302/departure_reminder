import { registerPlugin } from '@capacitor/core'

interface AppSettingsPlugin {
  openNotificationSettings: () => Promise<void>
}

export const appSettings = registerPlugin<AppSettingsPlugin>('AppSettings')
