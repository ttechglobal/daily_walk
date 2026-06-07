'use client'

// ── src/app/profile/page.js ── v5 — OFFLINE-FIRST, NEVER BLOCKS
//
// ARCHITECTURE:
//   • Renders instantly from localStorage — no auth check on mount
//   • Supabase auth check fires in background AFTER first render
//   • No loading spinner gating the page — user sees content immediately
//   • Username editable locally, syncs to Supabase when online + signed in
//   • Translation downloads visible and actionable
//   • Dark mode toggle works immediately (no flash)

import { useState, useEffect, useRef } from 'react'
import { useRouter }                   from 'next/navigation'
import { motion, AnimatePresence }     from 'framer-motion'
import {
  ChevronRight, LogOut, Bell, Shield, Info,
  Moon, Sun, CheckCircle2, Plus, Edit2,
  Download, Check, X, Loader2, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'

// ── Only safe, confirmed imports ──
import { useLocalStorage }             from '../../hooks/useLocalStorage'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'
import { createClient }                from '../../lib/supabase/client'
import Onboarding                      from '../../components/Onboarding'
import { ToastContainer, showToast }   from '../../components/Toast'
import { initials, avatarColor, todayStr } from '../../lib/constants'
import { readPlans, getPlanProgress }  from '../../lib/plans'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function lastNDays(n) {
  const days = []
  const now  = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

// ─────────────────────────────────────────────
//  Avatar
// ─────────────────────────────────────────────
function Avatar({ name, url, size = 72 }) {
  const [failed, setFailed] = useState(false)
  const bg  = avatarColor(name || 'U')
  const ini = initials(name || 'You')
  if (url && !failed) {
    return (
      <img src={url} alt={name} onError={() => setFailed(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size, border: '3px solid rgba(255,255,255,0.3)' }} />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size, background: bg,
        fontSize: Math.round(size * 0.32),
        border: '3px solid rgba(255,255,255,0.3)',
        flexShrink: 0,
      }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Username editor (inline, saves locally + Supabase)
// ─────────────────────────────────────────────
function UsernameEditor({ current, onSave, c }) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(current || '')
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 80)
  }, [editing])

  async function handleSave() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === current) { setEditing(false); return }
    setSaving(true)
    // 1. Save locally immediately
    onSave(trimmed)
    // 2. Try Supabase sync in background
    try {
      const sb = createClient()
      if (sb) {
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          await sb.from('profiles')
            .upsert({ id: user.id, username: trimmed, full_name: trimmed }, { onConflict: 'id' })
        }
      }
    } catch {}
    setSaving(false)
    setEditing(false)
    showToast('Username saved ✓')
  }

  if (!editing) {
    return (
      <button onClick={() => { setValue(current || ''); setEditing(true) }}
        className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.12)' }}>
        <span className="text-[13px] font-semibold"
          style={{ color: 'rgba(255,255,255,0.85)' }}>
          {current || 'Set username'}
        </span>
        <Edit2 size={12} color="rgba(255,255,255,0.6)" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input ref={inputRef}
        value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        maxLength={24}
        className="px-3 py-1.5 rounded-full text-[13px] font-semibold focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.15)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          minWidth: 0, width: 140,
        }} />
      <button onClick={handleSave} disabled={saving}
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: saving ? 'rgba(255,255,255,0.2)' : '#4A7C5F' }}>
        {saving ? <Loader2 size={12} color="white" className="animate-spin" /> : <Check size={12} color="white" />}
      </button>
      <button onClick={() => setEditing(false)}
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.1)' }}>
        <X size={12} color="rgba(255,255,255,0.7)" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Reading heatmap
// ─────────────────────────────────────────────
function Heatmap({ checkins, c }) {
  const days    = lastNDays(35)
  const checked = new Set((checkins || []).map(ci => (ci.date || '').split('T')[0]))
  const today   = todayStr()
  const weeks   = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
        style={{ color: c.textFaint }}>Last 35 days</p>
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5">
            {week.map(day => {
              const read   = checked.has(day)
              const isToday = day === today
              const future  = day > today
              return (
                <div key={day} className="rounded-[4px]"
                  style={{
                    flex: 1, aspectRatio: '1',
                    background: future ? c.bgMuted
                      : read     ? '#5B4FCF'
                      : isToday  ? '#EDE9FF'
                      : c.bgMuted,
                    border: isToday ? '2px solid #5B4FCF' : '2px solid transparent',
                    opacity: future ? 0.3 : 1,
                  }} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px]" style={{ color: c.textFaint }}>Less</p>
        <div className="flex gap-1">
          {['#E8E4FF','#BDB4FF','#7C6FE8','#5B4FCF','#3D3190'].map(col => (
            <div key={col} className="w-3 h-3 rounded-[3px]" style={{ background: col }} />
          ))}
        </div>
        <p className="text-[10px]" style={{ color: c.textFaint }}>More</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Plan card with progress ring
// ─────────────────────────────────────────────
function PlanCard({ plan, c, router }) {
  const pct = getPlanProgress(plan)
  const r   = 20, circ = 2 * Math.PI * r
  return (
    <button onClick={() => router.push(`/plans/${plan.id}`)}
      className="flex items-center gap-3 px-4 py-4 rounded-[16px] w-full text-left active:opacity-80"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke={c.bgMuted} strokeWidth="4" />
          <circle cx="24" cy="24" r={r} fill="none" stroke="#5B4FCF" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" transform="rotate(-90 24 24)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-[10px]" style={{ color: '#5B4FCF' }}>{pct}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: c.text }}>{plan.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
          Day {plan.currentDay} of {plan.totalDays || '?'}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: c.textFaint, flexShrink: 0 }} />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Translation downloads card
// ─────────────────────────────────────────────
function TranslationDownloads({ c, router }) {
  const [downloaded, setDownloaded] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dw_downloaded_translations')
      if (raw) setDownloaded(JSON.parse(raw))
    } catch {}
  }, [])

  return (
    <button onClick={() => router.push('/translations')}
      className="flex items-center gap-3 px-4 py-4 rounded-[16px] w-full text-left active:opacity-80"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: '#EDE9FF' }}>
        <Download size={17} style={{ color: '#5B4FCF' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px]" style={{ color: c.text }}>Bible Translations</p>
        <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
          {downloaded.length > 0
            ? `${downloaded.length} downloaded for offline`
            : 'Download for offline reading'}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: c.textFaint, flexShrink: 0 }} />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Settings row
// ─────────────────────────────────────────────
function Row({ icon: Icon, iconBg, iconColor, label, sub, onClick, danger, last, c }) {
  return (
    <>
      <button onClick={onClick}
        className="flex items-center gap-3 w-full px-4 py-4 text-left active:opacity-70">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}>
          <Icon size={16} style={{ color: danger ? '#EF4444' : iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px]"
            style={{ color: danger ? '#EF4444' : c.text }}>{label}</p>
          {sub && <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>{sub}</p>}
        </div>
        {!danger && <ChevronRight size={14} style={{ color: c.textFaint, flexShrink: 0 }} />}
      </button>
      {!last && <div style={{ height: 1, background: c.border, margin: '0 16px' }} />}
    </>
  )
}

// ─────────────────────────────────────────────
//  OFFLINE/ONLINE clarity note (shown once)
// ─────────────────────────────────────────────
function OfflineNote({ c }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem('dw_offline_note_seen')) setVisible(true)
    } catch {}
  }, [])
  if (!visible) return null
  return (
    <div className="rounded-[16px] p-4"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-[13px]" style={{ color: c.text }}>
          Works offline — always
        </p>
        <button onClick={() => {
          setVisible(false)
          try { localStorage.setItem('dw_offline_note_seen', '1') } catch {}
        }}>
          <X size={14} style={{ color: c.textFaint }} />
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {[
          ['✅', 'Bible reading — always available'],
          ['✅', 'Personal plans — saved on device'],
          ['✅', 'Streak & history — saved on device'],
          ['✅', 'Download translations for offline'],
          ['🔐', 'Join shared plans — free account needed'],
          ['🔐', 'Sync progress across devices — free account'],
        ].map(([icon, text]) => (
          <p key={text} className="text-[12px] flex gap-2" style={{ color: c.textMuted }}>
            <span>{icon}</span>{text}
          </p>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main profile view
// ─────────────────────────────────────────────
function ProfileView({ lsUser, setLsUser, authUser, streak, checkins, onSignOut }) {
  const router        = useRouter()
  const { dark, toggle: toggleDark } = useDarkMode()
  const c             = getDarkModeColors(dark)
  const [tab, setTab] = useState('overview')
  const [plans, setPlans] = useState([])

  useEffect(() => {
    setPlans(readPlans().filter(p => p.status === 'active'))
  }, [])

  const name = (
    lsUser?.name || lsUser?.username ||
    authUser?.user_metadata?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split('@')[0] || 'You'
  )
  const avatarUrl     = authUser?.user_metadata?.avatar_url || null
  const totalReads    = (checkins || []).length
  const curStreak     = streak?.current  || 0
  const bestStreak    = streak?.longest  || 0
  const isSignedIn    = !!authUser
  const joinedAt      = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : (lsUser?.joinedAt || null)

  function handleNameSave(newName) {
    setLsUser(prev => ({ ...(prev || {}), name: newName, username: newName }))
  }

  const TABS = [
    { k: 'overview', l: 'Overview' },
    { k: 'plans',    l: 'Plans'    },
    { k: 'history',  l: 'History'  },
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg,#2A1F6E 0%,#1A1240 55%,#0D0A24 100%)',
      }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-2">
          <div style={{ width: 36 }} />
          <p className="font-bold text-white" style={{ fontSize: 16 }}>Profile</p>
          <div style={{ width: 36 }} />
        </div>

        {/* Avatar + name + username editor */}
        <div className="flex flex-col items-center px-5 pt-4 pb-5 gap-2">
          <Avatar name={name} url={avatarUrl} size={76} />
          <div className="text-center">
            <h1 className="font-bold text-white" style={{ fontSize: 22 }}>
              {name}
            </h1>
            {/* Username editor — works offline */}
            <UsernameEditor
              current={lsUser?.name || lsUser?.username || ''}
              onSave={handleNameSave}
              c={c} />
            {joinedAt && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                {isSignedIn ? `Synced · Joined ${joinedAt}` : 'Local account · not synced'}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="w-full rounded-[18px] overflow-hidden mt-2"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="flex">
              {[
                { label: 'Streak',  value: curStreak,  icon: '🔥', warm: curStreak >= 7 },
                { label: 'Days',    value: totalReads,  icon: '📖', warm: false },
                { label: 'Best',    value: bestStreak,  icon: '🏆', warm: false },
              ].map((s, i) => (
                <div key={s.label} className="flex-1 flex flex-col items-center py-4"
                  style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span className="font-extrabold"
                    style={{ fontSize: 24, lineHeight: 1.1, color: s.warm ? '#FBB040' : 'white' }}>
                    {s.value}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync / sign in status */}
          {!isSignedIn && (
            <Link href="/auth"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
              ☁️ Sign up to sync across devices →
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-1 py-3 text-[13px] font-bold transition-all"
              style={{
                color:        tab === k ? 'white' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === k ? '2px solid white' : '2px solid transparent',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait" initial={false}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <motion.div key="ov"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.13 }}
              className="px-4 pt-5 flex flex-col gap-4">

              {/* Offline/online note — shown once */}
              <OfflineNote c={c} />

              {/* Heatmap */}
              <div className="rounded-[18px] p-5"
                style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
                <Heatmap checkins={checkins} c={c} />
              </div>

              {/* Plans preview */}
              {plans.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-[15px]" style={{ color: c.text }}>Active plans</p>
                    <Link href="/plans" className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
                      All plans →
                    </Link>
                  </div>
                  <div className="flex flex-col gap-2">
                    {plans.slice(0, 2).map(p => (
                      <PlanCard key={p.id} plan={p} c={c} router={router} />
                    ))}
                  </div>
                </div>
              ) : (
                <Link href="/plans/create"
                  className="flex items-center gap-3 px-4 py-4 rounded-[16px] active:opacity-80"
                  style={{ background: c.bgCard, border: `1.5px dashed ${c.border}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: '#EDE9FF' }}>
                    <Plus size={18} style={{ color: '#5B4FCF' }} />
                  </div>
                  <div>
                    <p className="font-bold text-[14px]" style={{ color: c.text }}>
                      Start a reading plan
                    </p>
                    <p className="text-[12px]" style={{ color: c.textMuted }}>No account needed</p>
                  </div>
                </Link>
              )}

              {/* Translation downloads */}
              <TranslationDownloads c={c} router={router} />

              {/* Settings */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1"
                  style={{ color: c.textFaint }}>Settings</p>
                <div className="rounded-[18px] overflow-hidden"
                  style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
                  <Row icon={dark ? Sun : Moon}
                    iconBg={dark ? '#FFF3DC' : '#EDE9FF'}
                    iconColor={dark ? '#E8A838' : '#5B4FCF'}
                    label={dark ? 'Light mode' : 'Dark mode'}
                    sub="Change appearance" onClick={toggleDark} c={c} />
                  <Row icon={Bell} iconBg="#EDE9FF" iconColor="#5B4FCF"
                    label="Notifications" sub="Daily reminders"
                    onClick={() => showToast('Coming soon')} c={c} />
                  <Row icon={Shield} iconBg="#E8F5EE" iconColor="#4A7C5F"
                    label="Privacy" sub="Your data, your control"
                    onClick={() => showToast('Coming soon')} c={c} />
                  <Row icon={Info} iconBg={c.bgMuted} iconColor={c.textMuted}
                    label="About Daily Walk"
                    onClick={() => showToast('Daily Walk — Built with faith ♥')} c={c} />
                  {isSignedIn && (
                    <Row icon={LogOut} iconBg="#FEE2E2" iconColor="#EF4444"
                      label="Sign out" onClick={onSignOut} danger last c={c} />
                  )}
                </div>
              </div>

              {/* Guest sign-in CTA */}
              {!isSignedIn && (
                <div className="rounded-[18px] p-5 text-center"
                  style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                  <p className="font-bold text-[16px] text-white">Sync across devices</p>
                  <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Free account — keep your streak and plans on every device.
                  </p>
                  <Link href="/auth"
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full font-bold text-[14px]"
                    style={{ background: 'white', color: '#5B4FCF' }}>
                    Create free account →
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* PLANS */}
          {tab === 'plans' && (
            <motion.div key="pl"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.13 }}
              className="px-4 pt-5 flex flex-col gap-3">
              {plans.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <span style={{ fontSize: 40 }}>📖</span>
                  <p className="font-bold text-[16px]" style={{ color: c.text }}>No active plans</p>
                  <p className="text-[13px]" style={{ color: c.textMuted }}>
                    Start a plan to guide your daily Bible reading.
                  </p>
                  <Link href="/plans/create"
                    className="px-6 py-3 rounded-full font-bold text-[14px] text-white"
                    style={{ background: '#5B4FCF' }}>
                    Start a plan →
                  </Link>
                </div>
              ) : (
                <>
                  {plans.map(p => <PlanCard key={p.id} plan={p} c={c} router={router} />)}
                  <Link href="/plans"
                    className="flex items-center justify-center py-3.5 rounded-full font-semibold text-[13px]"
                    style={{ background: c.bgCard, border: `1px solid ${c.border}`, color: c.textMuted }}>
                    View all plans →
                  </Link>
                </>
              )}
            </motion.div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <motion.div key="hi"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.13 }}
              className="px-4 pt-5 flex flex-col gap-4">

              <div className="rounded-[18px] p-5"
                style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
                <Heatmap checkins={checkins} c={c} />
              </div>

              <p className="font-bold text-[15px]" style={{ color: c.text }}>Reading log</p>

              {!checkins?.length ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center rounded-[18px]"
                  style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
                  <span style={{ fontSize: 32 }}>📅</span>
                  <p className="font-bold text-[14px]" style={{ color: c.text }}>No logs yet</p>
                  <p className="text-[13px]" style={{ color: c.textMuted }}>
                    Mark days complete on your plans to build history.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...(checkins || [])].reverse().slice(0, 50).map((ci, i) => (
                    <div key={ci.id || i}
                      className="flex items-start gap-3 px-4 py-3.5 rounded-[14px]"
                      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
                      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                        style={{ background: '#EDE9FF' }}>
                        <CheckCircle2 size={16} style={{ color: '#5B4FCF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px]" style={{ color: '#5B4FCF' }}>
                          {(ci.date || '').split('T')[0]}
                        </p>
                        {ci.passage && (
                          <p className="text-[13px] mt-0.5 font-semibold truncate"
                            style={{ color: c.text }}>{ci.passage}</p>
                        )}
                        {ci.reflection && (
                          <p className="text-[12px] mt-1 italic leading-relaxed"
                            style={{ color: c.textMuted }}>"{ci.reflection}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <ToastContainer />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Export — renders immediately, no auth gate
// ─────────────────────────────────────────────
export default function ProfileScreen() {
  // All local state — renders on first paint, no waiting
  const [lsUser,    setLsUser]    = useLocalStorage('dw_user',                null)
  const [streak]                  = useLocalStorage('dw_streak',              null)
  const [checkins]                = useLocalStorage('dw_checkins',            [])
  const [onboarded, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)

  // Auth check fires in background — doesn't block render
  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    const sb = createClient()
    if (!sb) return
    sb.auth.getUser()
      .then(({ data: { user } }) => setAuthUser(user || null))
      .catch(() => null) // network offline — that's fine
  }, [])

  async function handleSignOut() {
    if (!confirm('Sign out?')) return
    const sb = createClient()
    try { await sb?.auth.signOut() } catch {}
    try {
      ['dw_user','dw_onboarding_complete','dw_streak','dw_checkins','dw_plans']
        .forEach(k => localStorage.removeItem(k))
    } catch {}
    window.location.href = '/'
  }

  // Guest with no name → show onboarding (just the name step)
  if (!onboarded && !lsUser?.name) {
    return <Onboarding onComplete={d => { setLsUser(d); setOnboarded(true) }} />
  }

  // Render immediately — authUser may still be null (fires in bg)
  return (
    <ProfileView
      lsUser={lsUser}
      setLsUser={setLsUser}
      authUser={authUser}
      streak={streak}
      checkins={checkins}
      onSignOut={handleSignOut}
    />
  )
}