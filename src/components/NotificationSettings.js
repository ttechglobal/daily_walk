'use client'

// ── NotificationSettings — full notification preferences panel ──
// Embedded in Profile settings tab.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Clock, Flame, Users, MessageCircle, BarChart2, ChevronRight } from 'lucide-react'
import {
  getPermissionStatus, requestNotificationPermission,
  getNotificationSettings, saveNotificationSettings,
  scheduleDailyReminder, clearDailyReminder, initNotifications,
} from '../lib/notifications'

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative flex-shrink-0 transition-all active:scale-95"
      style={{ width:44, height:26 }}>
      <div className="absolute inset-0 rounded-full transition-all"
        style={{ background: value ? '#5B4FCF' : '#D1D5DB' }} />
      <div className="absolute top-0.5 transition-all rounded-full bg-white shadow-sm"
        style={{ width:22, height:22, left: value ? 20 : 2 }} />
    </button>
  )
}

function SettingRow({ icon: Icon, iconColor, iconBg, label, sub, value, onChange }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b last:border-0" style={{ borderColor:'#F5F5F5' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px]" style={{ color:'#1A1A2E' }}>{label}</p>
        {sub && <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>{sub}</p>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

export default function NotificationSettings() {
  const [permission, setPermission] = useState('default')
  const [settings,   setSettings]   = useState(null)
  const [timeEdit,   setTimeEdit]   = useState(false)
  const [hour,       setHour]       = useState(8)
  const [minute,     setMinute]     = useState(0)

  useEffect(() => {
    setPermission(getPermissionStatus())
    const s = getNotificationSettings()
    setSettings(s)
    setHour(s.reminderHour   ?? 8)
    setMinute(s.reminderMinute ?? 0)
  }, [])

  async function handleEnable() {
    const granted = await requestNotificationPermission()
    setPermission(granted ? 'granted' : 'denied')
    if (granted) {
      const s = getNotificationSettings()
      if (s.dailyReminder) scheduleDailyReminder(s.reminderHour, s.reminderMinute)
    }
  }

  function update(key, value) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveNotificationSettings(next)
    // Re-schedule reminder if toggled or time changed
    if (key === 'dailyReminder') {
      if (value) scheduleDailyReminder(next.reminderHour, next.reminderMinute)
      else       clearDailyReminder()
    }
  }

  function saveTime() {
    const next = { ...settings, reminderHour: hour, reminderMinute: minute }
    setSettings(next)
    saveNotificationSettings(next)
    if (next.dailyReminder) scheduleDailyReminder(hour, minute)
    setTimeEdit(false)
  }

  function formatTime(h, m) {
    const period = h >= 12 ? 'PM' : 'AM'
    const hh     = h % 12 || 12
    return `${hh}:${String(m).padStart(2,'0')} ${period}`
  }

  if (!settings) return null

  // Not yet requested
  if (permission === 'default') {
    return (
      <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
        className="bg-white rounded-[20px] p-5 flex flex-col gap-4"
        style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:'#EDE9FF' }}>
            <Bell size={22} style={{ color:'#5B4FCF' }} />
          </div>
          <div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Stay connected</p>
            <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>
              Get reminders and community updates
            </p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>
          Daily Walk can remind you to read, celebrate your streaks, and notify you when your community is active.
        </p>
        <button onClick={handleEnable}
          className="w-full text-white rounded-full py-3.5 font-bold text-[15px] hover:opacity-90 active:scale-[0.97]"
          style={{ background:'#5B4FCF' }}>
          Enable Notifications
        </button>
      </motion.div>
    )
  }

  // Denied
  if (permission === 'denied') {
    return (
      <div className="bg-white rounded-[20px] p-5 flex flex-col gap-3"
        style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'#FFF0F0' }}>
            <BellOff size={18} style={{ color:'#EF4444' }} />
          </div>
          <div>
            <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Notifications blocked</p>
            <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>Enable in your device settings</p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed px-1" style={{ color:'#9CA3AF' }}>
          Go to your browser or phone Settings → Notifications → Daily Walk → Allow
        </p>
      </div>
    )
  }

  // Granted — show full settings
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-[20px] px-5 py-2"
        style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <SettingRow icon={Bell}           iconColor="#5B4FCF" iconBg="#EDE9FF"
          label="Daily reading reminder"  sub="Remind me to read my Bible"
          value={settings.dailyReminder}  onChange={v => update('dailyReminder', v)} />

        {/* Reminder time picker */}
        {settings.dailyReminder && (
          <div className="py-3 pl-12 border-b" style={{ borderColor:'#F5F5F5' }}>
            {!timeEdit ? (
              <button onClick={() => setTimeEdit(true)}
                className="flex items-center gap-2 text-[13px] font-semibold"
                style={{ color:'#5B4FCF' }}>
                <Clock size={13} />
                Reminder at {formatTime(hour, minute)}
                <ChevronRight size={13} />
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] font-bold" style={{ color:'#9CA3AF' }}>Set reminder time</p>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px]" style={{ color:'#9CA3AF' }}>Hour</p>
                    <input type="number" min="0" max="23" value={hour}
                      onChange={e => setHour(parseInt(e.target.value))}
                      className="w-16 text-center border rounded-xl py-2 font-bold text-[16px] focus:outline-none focus:border-purple"
                      style={{ borderColor:'#E5E7EB', color:'#1A1A2E' }} />
                  </div>
                  <p className="font-bold text-[20px] mt-4" style={{ color:'#1A1A2E' }}>:</p>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px]" style={{ color:'#9CA3AF' }}>Minute</p>
                    <input type="number" min="0" max="59" value={minute}
                      onChange={e => setMinute(parseInt(e.target.value))}
                      className="w-16 text-center border rounded-xl py-2 font-bold text-[16px] focus:outline-none focus:border-purple"
                      style={{ borderColor:'#E5E7EB', color:'#1A1A2E' }} />
                  </div>
                  <div className="flex flex-col gap-1.5 ml-2 mt-4">
                    <button onClick={saveTime}
                      className="px-4 py-1.5 rounded-full text-white text-[12px] font-bold"
                      style={{ background:'#5B4FCF' }}>Save</button>
                    <button onClick={() => setTimeEdit(false)}
                      className="px-4 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background:'#F5F5F5', color:'#6B7280' }}>Cancel</button>
                  </div>
                </div>
                <p className="text-[12px]" style={{ color:'#9CA3AF' }}>
                  Currently: {formatTime(hour, minute)}
                </p>
              </div>
            )}
          </div>
        )}

        <SettingRow icon={Flame}           iconColor="#E8A838" iconBg="#FFF4DC"
          label="Streak alerts"            sub="Celebrate reading milestones"
          value={settings.streakAlerts}    onChange={v => update('streakAlerts', v)} />
        <SettingRow icon={Users}           iconColor="#4A7C5F" iconBg="#E8F4ED"
          label="Community activity"       sub="New posts from your communities"
          value={settings.communityActivity} onChange={v => update('communityActivity', v)} />
        <SettingRow icon={MessageCircle}   iconColor="#5B4FCF" iconBg="#EDE9FF"
          label="Comments & likes"         sub="When someone reacts to your posts"
          value={settings.commentsLikes}   onChange={v => update('commentsLikes', v)} />
        <SettingRow icon={BarChart2}       iconColor="#888780" iconBg="#F5F5F5"
          label="Weekly summary"           sub="Sunday reading recap"
          value={settings.weeklySummary}   onChange={v => update('weeklySummary', v)} />
      </div>
    </div>
  )
}