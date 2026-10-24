import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Bell, ChevronRight, Clock3, MapPin, Settings as SettingsIcon, Smartphone, TrainFront, X } from 'lucide-react'
import { calculateDeparture, defaultSettings, sampleEvents, travelModeLabel, type CalendarEvent, type Settings, type TravelMode } from './domain'
import { fetchCalendarEvents, requestCalendarAccess } from './googleCalendar'
import { fetchTravelMinutes } from './googleRoutes'
import { scheduleDepartureNotification } from './notifications'
import { loadSettings, saveSettings } from './storage'

function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents)
  const [calendarStatus, setCalendarStatus] = useState('サンプル予定を表示中')
  const nextEvent = events[0]
  const departureAt = useMemo(() => nextEvent ? calculateDeparture(nextEvent, settings) : '--:--', [nextEvent, settings])

  useEffect(() => {
    void loadSettings().then(setSettings)
  }, [])

  const updateSettings = async (next: Settings) => {
    setSettings(next)
    await saveSettings(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const testVibration = async () => {
    if (settings.vibrationEnabled) await Haptics.impact({ style: ImpactStyle.Light })
  }

  const connectCalendar = async () => {
    setCalendarStatus('Googleカレンダーに接続中…')
    try {
      const accessToken = await requestCalendarAccess()
      const calendarEvents = await fetchCalendarEvents(accessToken)
      setEvents(calendarEvents)
      setCalendarStatus(`${calendarEvents.length}件の予定を取得しました`)
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : 'Googleカレンダーに接続できませんでした')
    }
  }

  const refreshRoute = async () => {
    if (!nextEvent) return
    setCalendarStatus('Google Mapsで経路を取得中…')
    try {
      const travelMinutes = await fetchTravelMinutes(settings.origin, nextEvent.location, settings.travelMode)
      setEvents((current) => current.map((event, index) => index === 0 ? { ...event, travelMinutes } : event))
      setCalendarStatus(`経路を更新しました（移動 ${travelMinutes}分）`)
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : '経路を取得できませんでした')
    }
  }

  const scheduleNotification = async () => {
    if (!nextEvent) return
    setCalendarStatus('通知を設定中…')
    try {
      await scheduleDepartureNotification(nextEvent, settings)
      setCalendarStatus('出発通知を設定しました')
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : '通知を設定できませんでした')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">出発リマインダー</div>
        <button className="icon-button" aria-label="設定を開く" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon size={24} strokeWidth={1.8} />
          <span>設定</span>
        </button>
      </header>

      <main className="main-content">
        <section className="departure-hero" aria-labelledby="next-departure-heading">
          <p className="section-label" id="next-departure-heading">次の出発</p>
          <div className="departure-time">{departureAt}</div>
          <p className="departure-caption">この時間に出発してください</p>
        </section>

        <p className="calendar-status" role="status">{calendarStatus}</p>
        {nextEvent ? <section className="event-focus" aria-label="次の予定">
          <div className="event-header">
            <div>
              <p className="event-start">{nextEvent.startsAt}開始</p>
              <h1>{nextEvent.location}</h1>
            </div>
            <button className="text-action" onClick={() => setSettingsOpen(true)}>
              予定の詳細 <ChevronRight size={22} />
            </button>
          </div>
          <button className="secondary-button route-button" onClick={() => void refreshRoute()}>移動時間を更新</button>
          <button className="secondary-button route-button" onClick={() => void scheduleNotification()}>この予定の通知を設定</button>
          <div className="event-breakdown">
            <Breakdown icon={<TrainFront size={24} />} label="移動" value={`${nextEvent.travelMinutes}分`} />
            <Breakdown icon={<Clock3 size={24} />} label="準備" value={`${nextEvent.preparationMinutes}分`} />
            <Breakdown icon={<Clock3 size={24} />} label="余裕" value={`${settings.bufferMinutes}分`} />
          </div>
          <button className="vibration-row" onClick={() => void testVibration()}>
            <Smartphone size={25} />
            <strong>振動通知 {settings.vibrationEnabled ? 'オン' : 'オフ'}</strong>
            <ChevronRight size={22} className="push-right" />
          </button>
        </section> : <section className="empty-state"><h2>予定がありません</h2><p>Googleカレンダーから予定を取得してください。</p></section>}

        <section className="upcoming" aria-labelledby="upcoming-heading">
          <div className="section-heading-row">
            <h2 id="upcoming-heading">今後の予定</h2>
            <span>{travelModeLabel(settings.travelMode)}</span>
          </div>
          <div className="event-list">
            {events.slice(1).map((event) => (
              <article className="event-list-row" key={event.id}>
                <div>
                  <p>{event.startsAt}開始</p>
                  <h3>{event.title}</h3>
                  <span><MapPin size={15} />{event.location}</span>
                </div>
                <div className="row-meta">
                  <span>移動 {event.travelMinutes}分</span>
                  <span>準備 {event.preparationMinutes}分</span>
                </div>
                <ChevronRight size={22} />
              </article>
            ))}
          </div>
        </section>
      </main>

      {saved && <div className="save-toast" role="status">設定を保存しました</div>}
      {settingsOpen && <SettingsPanel settings={settings} onClose={() => setSettingsOpen(false)} onSave={updateSettings} onConnectCalendar={() => void connectCalendar()} />}
    </div>
  )
}

function Breakdown({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="breakdown-item"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
}

function SettingsPanel({ settings, onClose, onSave, onConnectCalendar }: { settings: Settings; onClose: () => void; onSave: (settings: Settings) => Promise<void>; onConnectCalendar: () => void }) {
  const [draft, setDraft] = useState(settings)
  const modes: TravelMode[] = ['transit', 'walking', 'bicycling', 'driving']
  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="settings-panel" aria-label="設定">
        <div className="panel-header"><h2>設定</h2><button className="icon-button" aria-label="設定を閉じる" onClick={onClose}><X size={22} /></button></div>
        <label>出発地点<input value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} placeholder="自宅の住所" /></label>
        <label>移動手段<select value={draft.travelMode} onChange={(event) => setDraft({ ...draft, travelMode: event.target.value as TravelMode })}>{modes.map((mode) => <option value={mode} key={mode}>{travelModeLabel(mode)}</option>)}</select></label>
        <label>準備時間（分）<input type="number" min="0" value={draft.preparationMinutes} onChange={(event) => setDraft({ ...draft, preparationMinutes: Number(event.target.value) || 0 })} /></label>
        <label>余裕時間（分）<input type="number" min="0" value={draft.bufferMinutes} onChange={(event) => setDraft({ ...draft, bufferMinutes: Number(event.target.value) || 0 })} /></label>
        <label className="toggle-row"><span><Bell size={19} />振動通知</span><input type="checkbox" checked={draft.vibrationEnabled} onChange={(event) => setDraft({ ...draft, vibrationEnabled: event.target.checked })} /></label>
        <button className="secondary-button" onClick={onConnectCalendar}>Googleカレンダーに接続</button>
        <button className="primary-button" onClick={() => void onSave(draft).then(onClose)}>保存する</button>
      </aside>
    </div>
  )
}

export default App
