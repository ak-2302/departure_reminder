import { LocalNotifications } from '@capacitor/local-notifications'
import type { CalendarEvent, Settings } from './domain'

const channelId = 'departure-reminders'

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const permission = await LocalNotifications.checkPermissions()
  return permission.display === 'granted' ? 'granted' : permission.display === 'denied' ? 'denied' : 'prompt'
}

export function notificationId(eventId: string): number {
  let hash = 0
  for (const character of eventId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return Math.max(1, hash % 2147483647)
}

export async function cancelDepartureNotifications(eventIds: string[]): Promise<void> {
  if (!eventIds.length) return
  await LocalNotifications.cancel({ notifications: eventIds.map((eventId) => ({ id: notificationId(eventId) })) })
}

export async function scheduleDepartureNotification(event: CalendarEvent, settings: Settings): Promise<void> {
  if (!event.startAt) throw new Error('実際のカレンダー予定を取得してから通知を設定してください')
  if (!event.travelUpdatedAt) throw new Error('先に移動時間を更新してください')
  const departureAt = new Date(new Date(event.startAt).getTime() - (event.travelMinutes + event.preparationMinutes + settings.bufferMinutes) * 60_000)
  if (departureAt.getTime() <= Date.now()) throw new Error('出発時刻が過ぎているため通知を設定できません')

  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') throw new Error('通知の許可が必要です')
  await LocalNotifications.createChannel({ id: channelId, name: '出発リマインダー', description: '出発時刻の通知', importance: 3, vibration: settings.vibrationEnabled })
  const id = notificationId(event.id)
  await LocalNotifications.cancel({ notifications: [{ id }] })
  await LocalNotifications.schedule({ notifications: [{ id, title: '出発時刻です', body: `${event.location}へ向かうため、出発してください`, schedule: { at: departureAt }, channelId, smallIcon: 'ic_stat_icon_config_sample' }] })
}
