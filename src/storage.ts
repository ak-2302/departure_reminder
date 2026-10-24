import { Preferences } from '@capacitor/preferences'
import { defaultSettings, type Settings } from './domain'

const settingsKey = 'departure-settings'

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: settingsKey })
  if (!value) return defaultSettings
  try {
    return { ...defaultSettings, ...JSON.parse(value) as Partial<Settings> }
  } catch {
    return defaultSettings
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await Preferences.set({ key: settingsKey, value: JSON.stringify(settings) })
}
