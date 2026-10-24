import { describe, expect, it } from 'vitest'
import { calculateDeparture, defaultSettings, mergeCalendarEvents, type CalendarEvent } from './domain'

const event: CalendarEvent = {
  id: 'test-event',
  title: '会議',
  startsAt: '09:30',
  location: '東京駅',
  travelMinutes: 45,
  preparationMinutes: 15,
}

describe('calculateDeparture', () => {
  it('移動・準備・余裕時間から出発時刻を計算する', () => {
    expect(calculateDeparture(event, defaultSettings)).toBe('08:20')
  })

  it('日付をまたぐ計算を24時間表記へ正規化する', () => {
    expect(calculateDeparture({ ...event, startsAt: '00:20', travelMinutes: 30 }, defaultSettings)).toBe('23:25')
  })

  it('実予定のISO日時を優先して日付境界を計算する', () => {
    expect(calculateDeparture({ ...event, startAt: '2026-10-25T00:20:00+09:00', travelMinutes: 30 }, defaultSettings)).toBe('23:25')
  })
})

describe('mergeCalendarEvents', () => {
  it('削除された予定を返し、既存の経路情報を維持する', () => {
    const current = [{ ...event, travelMinutes: 20, travelUpdatedAt: '2026-10-24T00:00:00Z', notificationEnabled: true }, { ...event, id: 'deleted' }]
    const result = mergeCalendarEvents(current, [{ ...event, travelMinutes: 0 }])
    expect(result.removedIds).toEqual(['deleted'])
    expect(result.events[0].travelMinutes).toBe(20)
    expect(result.events[0].notificationEnabled).toBe(true)
  })

  it('開始時刻が変わった予定の通知設定を解除する', () => {
    const current = [{ ...event, startAt: '2026-10-24T09:30:00+09:00', notificationEnabled: true, travelUpdatedAt: '2026-10-24T00:00:00Z' }]
    const result = mergeCalendarEvents(current, [{ ...event, startAt: '2026-10-24T10:00:00+09:00' }])
    expect(result.changedIds).toEqual(['test-event'])
    expect(result.events[0].notificationEnabled).toBeUndefined()
    expect(result.events[0].travelUpdatedAt).toBeUndefined()
  })
})
