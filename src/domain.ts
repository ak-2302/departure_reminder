export type TravelMode = 'transit' | 'walking' | 'bicycling' | 'driving'

export type Settings = {
  origin: string
  travelMode: TravelMode
  preparationMinutes: number
  bufferMinutes: number
  vibrationEnabled: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  startAt?: string
  startsAt: string
  location: string
  travelMinutes: number
  travelUpdatedAt?: string
  notificationEnabled?: boolean
  preparationMinutes: number
}

export const defaultSettings: Settings = {
  origin: '',
  travelMode: 'transit',
  preparationMinutes: 15,
  bufferMinutes: 10,
  vibrationEnabled: true,
}

export const sampleEvents: CalendarEvent[] = [
  {
    id: 'sample-1',
    title: 'サンプル予定',
    startsAt: '09:30',
    location: '東京都庁',
    travelMinutes: 45,
    preparationMinutes: 15,
  },
  {
    id: 'sample-2',
    title: 'クライアント打ち合わせ',
    startsAt: '14:00',
    location: '渋谷ヒカリエ',
    travelMinutes: 30,
    preparationMinutes: 10,
  },
  {
    id: 'sample-3',
    title: 'チーム定例',
    startsAt: '16:30',
    location: 'オンライン',
    travelMinutes: 0,
    preparationMinutes: 10,
  },
]

export function calculateDeparture(event: CalendarEvent, settings: Settings): string {
  const [hours, minutes] = event.startsAt.split(':').map(Number)
  const departureMinutes = hours * 60 + minutes - event.travelMinutes - settings.bufferMinutes - event.preparationMinutes
  const normalized = (departureMinutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

export function travelModeLabel(mode: TravelMode): string {
  return { transit: '公共交通機関', walking: '徒歩', bicycling: '自転車', driving: '自動車' }[mode]
}
