import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Network } from '@capacitor/network'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Browser } from '@capacitor/browser'
import { Bell, ChevronRight, Clock3, MapPin, Settings as SettingsIcon, Smartphone, TrainFront, X } from 'lucide-react'
import { calculateDeparture, defaultSettings, sampleEvents, travelModeLabel, type CalendarEvent, type Settings, type TravelMode } from './domain'
import { fetchCalendarEvents, requestCalendarAccess } from './googleCalendar'
import { fetchTravelMinutes } from './googleRoutes'
import { cancelDepartureNotifications, getNotificationPermission, notificationId, scheduleDepartureNotification } from './notifications'
import { appSettings } from './appSettings'
import { clearEvents, loadEvents, loadSettings, saveEvents, saveSettings } from './storage'

function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [calendarStatus, setCalendarStatus] = useState('サンプル予定を表示中')
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const accessTokenRef = useRef<string | undefined>(undefined)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const nextEvent = events[0]
  const departureAt = useMemo(() => nextEvent ? calculateDeparture(nextEvent, settings) : '--:--', [nextEvent, settings])

  useEffect(() => {
    void loadSettings().then(setSettings)
    void loadEvents().then((storedEvents) => {
      if (storedEvents?.length) setEvents(storedEvents)
    })
    const syncWhenActive = ({ isActive }: { isActive: boolean }) => {
      if (isActive) void syncCalendar(accessTokenRef.current, true)
    }
    const syncWhenOnline = ({ connected }: { connected: boolean }) => {
      if (connected) void syncCalendar(accessTokenRef.current, true)
    }
    let appListener: { remove: () => Promise<void> } | undefined
    let networkListener: { remove: () => Promise<void> } | undefined
    let notificationListener: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('appStateChange', syncWhenActive).then((listener) => { appListener = listener })
    void Network.addListener('networkStatusChange', syncWhenOnline).then((listener) => { networkListener = listener })
    void LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const event = eventsRef.current.find((item) => notificationId(item.id) === notification.id)
      if (!event) return
      const reorderedEvents = [event, ...eventsRef.current.filter((item) => item.id !== event.id)]
      setEvents(reorderedEvents)
      setDetailEvent(event)
      setCalendarStatus(`「${event.title}」の予定を開きました`)
    }).then((listener) => { notificationListener = listener })
    return () => {
      void appListener?.remove()
      void networkListener?.remove()
      void notificationListener?.remove()
    }
  }, [])

  useEffect(() => {
    if (settingsOpen) void getNotificationPermission().then(setNotificationPermission)
  }, [settingsOpen])

  const updateSettings = async (next: Settings) => {
    setSettings(next)
    await saveSettings(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const testVibration = async () => {
    if (settings.vibrationEnabled) await Haptics.impact({ style: ImpactStyle.Light })
  }

  const syncCalendar = async (accessToken: string | undefined, automatic: boolean) => {
    if (!accessToken) return
    setCalendarStatus(automatic ? 'カレンダーを再同期中…' : 'Googleカレンダーに接続中…')
    try {
      const calendarEvents = await fetchCalendarEvents(accessToken)
      const currentEvents = eventsRef.current
      const currentIds = new Set(currentEvents.map((event) => event.id))
      const nextIds = new Set(calendarEvents.map((event) => event.id))
      await cancelDepartureNotifications([...currentIds].filter((id) => !nextIds.has(id)))
      const currentById = new Map(currentEvents.map((event) => [event.id, event]))
      const refreshedEvents = calendarEvents.map((event) => {
        const previous = currentById.get(event.id)
        if (!previous || previous.startAt === event.startAt) return { ...event, notificationEnabled: previous?.notificationEnabled, travelMinutes: previous?.travelMinutes ?? event.travelMinutes, travelUpdatedAt: previous?.travelUpdatedAt }
        if (previous.notificationEnabled) void cancelDepartureNotifications([event.id])
        return event
      })
      setEvents(refreshedEvents)
      await saveEvents(refreshedEvents)
      setCalendarStatus(`${calendarEvents.length}件の予定を取得しました`)
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : 'Googleカレンダーに接続できませんでした')
    }
  }

  const connectCalendar = async () => {
    setCalendarStatus('Googleカレンダーに接続中…')
    try {
      const accessToken = await requestCalendarAccess()
      accessTokenRef.current = accessToken
      await syncCalendar(accessToken, false)
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : 'Googleカレンダーに接続できませんでした')
    }
  }

  const disconnectCalendar = async () => {
    await cancelDepartureNotifications(events.map((event) => event.id))
    accessTokenRef.current = undefined
    await clearEvents()
    setEvents([])
    setCalendarStatus('Googleカレンダーとの連携を解除しました')
    setSettingsOpen(false)
  }

  const openNotificationSettings = async () => {
    await appSettings.openNotificationSettings()
  }

  const refreshRoute = async () => {
    if (!nextEvent) return
    setCalendarStatus('Google Mapsで経路を取得中…')
    try {
      const travelMinutes = await fetchTravelMinutes(settings.origin, nextEvent.location, settings.travelMode, nextEvent.startAt)
      const updatedEvents = events.map((event, index) => index === 0 ? { ...event, travelMinutes, travelUpdatedAt: new Date().toISOString() } : event)
      setEvents(updatedEvents)
      await saveEvents(updatedEvents)
      if (nextEvent.notificationEnabled) await scheduleDepartureNotification(updatedEvents[0], settings)
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
      const updatedEvents = events.map((event, index) => index === 0 ? { ...event, notificationEnabled: true } : event)
      setEvents(updatedEvents)
      await saveEvents(updatedEvents)
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
            <button className="text-action" onClick={() => setDetailEvent(nextEvent)}>
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
      {detailEvent && <EventDetail event={detailEvent} settings={settings} onClose={() => setDetailEvent(null)} />}
      {settingsOpen && <SettingsPanel settings={settings} notificationPermission={notificationPermission} onClose={() => setSettingsOpen(false)} onSave={updateSettings} onConnectCalendar={() => void connectCalendar()} onDisconnectCalendar={() => void disconnectCalendar()} onOpenNotificationSettings={() => void openNotificationSettings()} />}
    </div>
  )
}

function Breakdown({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="breakdown-item"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
}

function EventDetail({ event, settings, onClose }: { event: CalendarEvent; settings: Settings; onClose: () => void }) {
  const departure = calculateDeparture(event, settings)
  const openMaps = () => {
    const params = new URLSearchParams({ api: '1', origin: settings.origin, destination: event.location, travelmode: settings.travelMode === 'transit' ? 'transit' : settings.travelMode })
    void Browser.open({ url: `https://www.google.com/maps/dir/?${params}` })
  }
  const dialogRef = useRef<HTMLElement>(null)
  useDialogAccessibility(dialogRef, onClose)
  return <div className="panel-backdrop" role="presentation" onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}>
    <section ref={dialogRef} className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="event-detail-title" aria-describedby="event-detail-description">
      <div className="panel-header"><h2>予定の詳細</h2><button className="icon-button" aria-label="予定の詳細を閉じる" onClick={onClose}><X size={22} /></button></div>
      <p className="event-start">{event.startsAt}開始</p>
      <h2 id="event-detail-title">{event.title}</h2>
      <p className="detail-location"><MapPin size={17} />{event.location}</p>
      <div className="detail-grid">
        <span>出発時刻</span><strong>{departure}</strong>
        <span>移動時間</span><strong>{event.travelMinutes}分</strong>
        <span>準備時間</span><strong>{event.preparationMinutes}分</strong>
        <span>余裕時間</span><strong>{settings.bufferMinutes}分</strong>
      </div>
      <p className="detail-status" id="event-detail-description">{event.travelUpdatedAt ? `経路更新：${new Date(event.travelUpdatedAt).toLocaleString('ja-JP')}` : '経路は未取得です'}</p>
      <p className="detail-status">通知：{event.notificationEnabled ? '設定済み' : '未設定'}</p>
      <button className="primary-button" onClick={openMaps} disabled={!settings.origin.trim()}>Google Mapsで経路を開く</button>
    </section>
  </div>
}

function useDialogAccessibility(dialogRef: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const dialog = dialogRef.current
    const focusable = () => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, [href], [tabindex]:not([tabindex="-1"])')) : []
    const first = focusable()[0]
    first?.focus()
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') { onClose(); return }
      if (keyboardEvent.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) return
      const current = document.activeElement
      const index = elements.indexOf(current as HTMLElement)
      const nextIndex = keyboardEvent.shiftKey ? (index <= 0 ? elements.length - 1 : index - 1) : (index === elements.length - 1 ? 0 : index + 1)
      keyboardEvent.preventDefault()
      elements[nextIndex].focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogRef, onClose])
}

function SettingsPanel({ settings, notificationPermission, onClose, onSave, onConnectCalendar, onDisconnectCalendar, onOpenNotificationSettings }: { settings: Settings; notificationPermission: 'granted' | 'denied' | 'prompt'; onClose: () => void; onSave: (settings: Settings) => Promise<void>; onConnectCalendar: () => void; onDisconnectCalendar: () => void; onOpenNotificationSettings: () => void }) {
  const [draft, setDraft] = useState(settings)
  const dialogRef = useRef<HTMLElement>(null)
  const modes: TravelMode[] = ['transit', 'walking', 'bicycling', 'driving']
  useDialogAccessibility(dialogRef, onClose)
  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} className="settings-panel" role="dialog" aria-modal="true" aria-label="設定">
        <div className="panel-header"><h2>設定</h2><button className="icon-button" aria-label="設定を閉じる" onClick={onClose}><X size={22} /></button></div>
        <label>出発地点<input value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} placeholder="自宅の住所" /></label>
        <label>移動手段<select value={draft.travelMode} onChange={(event) => setDraft({ ...draft, travelMode: event.target.value as TravelMode })}>{modes.map((mode) => <option value={mode} key={mode}>{travelModeLabel(mode)}</option>)}</select></label>
        <label>準備時間（分）<input type="number" min="0" value={draft.preparationMinutes} onChange={(event) => setDraft({ ...draft, preparationMinutes: Number(event.target.value) || 0 })} /></label>
        <label>余裕時間（分）<input type="number" min="0" value={draft.bufferMinutes} onChange={(event) => setDraft({ ...draft, bufferMinutes: Number(event.target.value) || 0 })} /></label>
        <label className="toggle-row"><span><Bell size={19} />振動通知</span><input type="checkbox" checked={draft.vibrationEnabled} onChange={(event) => setDraft({ ...draft, vibrationEnabled: event.target.checked })} /></label>
        <p className="permission-status">通知権限：{notificationPermission === 'granted' ? '許可されています' : notificationPermission === 'denied' ? '拒否されています' : '未確認です'}</p>
        {notificationPermission === 'denied' && <button className="secondary-button" onClick={onOpenNotificationSettings}>端末の通知設定を開く</button>}
        <button className="secondary-button" onClick={onConnectCalendar}>Googleカレンダーに接続</button>
        <button className="secondary-button danger-button" onClick={onDisconnectCalendar}>Google連携を解除してデータを削除</button>
        <button className="primary-button" onClick={() => void onSave(draft).then(onClose)}>保存する</button>
      </aside>
    </div>
  )
}

export default App
