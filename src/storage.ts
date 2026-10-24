import { Preferences } from '@capacitor/preferences'
import { defaultSettings, type CalendarEvent, type Settings } from './domain'

const settingsKey = 'departure-settings'
const eventsKey = 'calendar-events'

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

export async function loadEvents(): Promise<CalendarEvent[] | null> {
  const { value } = await Preferences.get({ key: eventsKey })
  if (!value) return null
  try {
    const events = JSON.parse(value) as CalendarEvent[]
    return Array.isArray(events) ? events : null
  } catch {
    return null
  }
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  await Preferences.set({ key: eventsKey, value: JSON.stringify(events) })
}

export async function clearEvents(): Promise<void> {
  await Preferences.remove({ key: eventsKey })
}
