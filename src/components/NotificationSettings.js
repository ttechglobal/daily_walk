'use client'

// ── NotificationSettings — Part 4 ──
// Mounted inside Profile page. Full notification settings UI.

import { useState, useEffect } from 'react'
import { Bell, Clock, Flame, Trophy, Send } from 'lucide-react'
import {
  requestNotificationPermission,
  sendLocalNotification,
  scheduleDailyReminder,
  clearDailyReminder,
  getNotificationSettings,
  saveNotificationSettings,
} from '../lib/notifications'

// ── Reusable toggle switch ──
function Toggle({ on, onToggle, disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      aria-checked={on}
      role="switch"
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        on ? 'bg-purple' : 'bg-gray-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: on ? '#5B4FCF' : undefined }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Time picker row ──
function TimePicker({ hour, minute, ampm, onChange }) {
  const hours   = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = [0, 15, 30, 45]

  const selectClass = "border border-gray-200 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-text-primary bg-white focus:outline-none focus:border-purple transition-colors"

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Hour */}
      <select value={hour} onChange={e => onChange({ hour: Number(e.target.value), minute, ampm })} className={selectClass}>
        {hours.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-text-muted font-bold">:</span>
      {/* Minute */}
      <select value={minute} onChange={e => onChange({ hour, minute: Number(e.target.value), ampm })} className={selectClass}>
        {minutes.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
      </select>
      {/* AM/PM */}
      <select value={ampm} onChange={e => onChange({ hour, minute, ampm: e.target.value })} className={selectClass}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

/** Convert 12h {hour, ampm} to 24h */
function to24h(hour, ampm) {
  if (ampm === 'AM') return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

/** Convert 24h hour to 12h {hour, ampm} */
function to12h(hour24) {
  if (hour24 === 0) return { hour: 12, ampm: 'AM' }
  if (hour24 < 12) return { hour: hour24, ampm: 'AM' }
  if (hour24 === 12) return { hour: 12, ampm: 'PM' }
  return { hour: hour24 - 12, ampm: 'PM' }
}

export default function NotificationSettings() {
  const [permission,  setPermission]  = useState('default') // 'default'|'granted'|'denied'
  const [settings,    setSettings]    = useState({
    dailyReminder: false, hour: 7, minute: 0,
    streakAlerts: true, challengeNudges: false,
  })
  const [timeUI, setTimeUI] = useState({ hour: 7, minute: 0, ampm: 'AM' })
  const [requesting, setRequesting] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    setPermission(Notification?.permission ?? 'default')
    const saved = getNotificationSettings()
    setSettings(saved)
    const t12 = to12h(saved.hour)
    setTimeUI({ hour: t12.hour, minute: saved.minute, ampm: t12.ampm })
  }, [])

  async function handleRequestPermission() {
    setRequesting(true)
    const granted = await requestNotificationPermission()
    setPermission(granted ? 'granted' : 'denied')
    setRequesting(false)
  }

  function updateSettings(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveNotificationSettings(next)
    return next
  }

  function handleDailyToggle() {
    const next = updateSettings({ dailyReminder: !settings.dailyReminder })
    if (next.dailyReminder) {
      scheduleDailyReminder(next.hour, next.minute)
    } else {
      clearDailyReminder()
    }
  }

  function handleTimeChange(t) {
    setTimeUI(t)
    const h24 = to24h(t.hour, t.ampm)
    const next = updateSettings({ hour: h24, minute: t.minute })
    if (next.dailyReminder) {
      scheduleDailyReminder(h24, t.minute)
    }
  }

  function handleStreakToggle()    { updateSettings({ streakAlerts:    !settings.streakAlerts    }) }
  function handleChallengeToggle() { updateSettings({ challengeNudges: !settings.challengeNudges }) }

  function handleTestNotification() {
    sendLocalNotification('Test notification', 'Daily Walk notifications are working!')
  }

  const granted = permission === 'granted'
  const denied  = permission === 'denied'

  const rowClass = "flex items-center justify-between p-4 bg-white rounded-2xl shadow-card"

  return (
    <div className="flex flex-col gap-3">
      {/* Section heading */}
      <div className="flex items-center gap-2 px-1">
        <Bell size={15} className="text-text-muted" />
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Notifications</p>
      </div>

      {/* Permission banner */}
      {!granted && (
        <div className="bg-purple-light rounded-2xl p-4 flex flex-col gap-3">
          {denied ? (
            <>
              <p className="font-bold text-text-primary text-[14px]">Notifications are blocked</p>
              <p className="text-text-muted text-[13px] leading-relaxed">
                Enable them in your browser or device settings to get daily reminders.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-text-primary text-[14px]">Get daily reminders</p>
              <p className="text-text-muted text-[13px] leading-relaxed">
                Enable notifications to be reminded when it's time to read.
              </p>
              <button
                onClick={handleRequestPermission}
                disabled={requesting}
                className="w-full bg-purple text-white rounded-pill py-3 text-[14px] font-bold disabled:opacity-60 transition-all active:scale-[0.97]"
                style={{ background: '#5B4FCF' }}
              >
                {requesting ? 'Requesting…' : 'Enable Notifications'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Daily reminder toggle */}
      <div className={`${rowClass} flex-col items-start gap-3`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-light flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-amber" style={{ color: '#E8A838' }} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-[14px]">Daily Bible reminder</p>
              <p className="text-text-muted text-[12px]">Remind me to read each day</p>
            </div>
          </div>
          <Toggle on={settings.dailyReminder} onToggle={handleDailyToggle} disabled={!granted} />
        </div>

        {/* Time picker — only shown when toggled on */}
        {settings.dailyReminder && granted && (
          <TimePicker
            hour={timeUI.hour}
            minute={timeUI.minute}
            ampm={timeUI.ampm}
            onChange={handleTimeChange}
          />
        )}
      </div>

      {/* Streak milestones */}
      <div className={rowClass}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FFF4DC' }}>
            <Flame size={16} style={{ color: '#E8A838' }} />
          </div>
          <div>
            <p className="font-bold text-text-primary text-[14px]">Streak milestones</p>
            <p className="text-text-muted text-[12px]">Celebrated at 3, 7, 14, 30, 100 days</p>
          </div>
        </div>
        <Toggle on={settings.streakAlerts} onToggle={handleStreakToggle} disabled={!granted} />
      </div>

      {/* Challenge nudges */}
      <div className={rowClass}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sage-light flex items-center justify-center flex-shrink-0">
            <Trophy size={16} style={{ color: '#4A7C5F' }} />
          </div>
          <div>
            <p className="font-bold text-text-primary text-[14px]">Challenge reminders</p>
            <p className="text-text-muted text-[12px]">Nudge me about joined challenges</p>
          </div>
        </div>
        <Toggle on={settings.challengeNudges} onToggle={handleChallengeToggle} disabled={!granted} />
      </div>

      {/* Test button — only shown when granted */}
      {granted && (
        <button
          onClick={handleTestNotification}
          className="w-full border border-gray-200 text-text-muted rounded-pill py-2.5 text-[13px] font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Send size={13} />
          Send a test notification
        </button>
      )}
    </div>
  )
}