import { describe, expect, it } from 'vitest'
import { calculateDeparture, defaultSettings, type CalendarEvent } from './domain'

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
