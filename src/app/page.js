'use client'

// ── src/app/page.js ── v7
// PATCHES APPLIED:
//   1. Header: removed BibleIcon + greeting. Clean wordmark only.
//   2. Body: GreetingBlock (personalised greeting + date + streak) added ABOVE plans.
//   3. StreakPill removed from header (streak now lives in body greeting block).

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { useLocalStorage }   from '../hooks/useLocalStorage'
import { useCheckin }        from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import { NotificationBell, NotificationPanel } from '../components/NotificationPanel'
import { useTheme }          from '../lib/theme'
import { getTodayVerse, initials, todayStr } from '../lib/constants'
import { readPlans, advanceAllPlans, isPlanCompletedToday, markDayComplete, getPlanProgress } from '../lib/plans'
import { createClient } from '../lib/supabase/client'

function calcDaysMissed(last) {
  if (!last) return 7
  return Math.max(0, Math.floor((new Date(todayStr()).getTime() - new Date(last).getTime()) / 86_400_000))
}

function getGreeting(name) {
  const h    = new Date().getHours()
  const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${base}, ${name.split(' ')[0]}` : base
}

// ─────────────────────────────────────────────
//  Today's verse accent
// ─────────────────────────────────────────────
function VerseAccent({ t }) {
  const verse = getTodayVerse()
  return (
    <div className="px-5 py-4 rounded-[18px]"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textFaint }}>
        Verse of the day
      </p>
      <p className="text-[14px] leading-relaxed font-medium italic" style={{ color: t.text }}>
        "{verse.text}"
      </p>
      <p className="text-[12px] mt-2 font-bold" style={{ color: '#5B4FCF' }}>— {verse.ref}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
//  No plan state
// ─────────────────────────────────────────────
function NoPlanHero({ t, dark }) {
  const router = useRouter()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] overflow-hidden"
      style={{ background: dark ? '#1E1A3C' : 'linear-gradient(150deg,#5B4FCF 0%,#3D3190 100%)' }}>
      <div className="relative px-6 pt-8 pb-2 overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -right-2 top-4 w-20 h-20 rounded-full opacity-5"  style={{ background: 'white' }} />
        <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mb-2">Where are you reading?</p>
        <h2 className="font-display text-white font-bold leading-tight" style={{ fontSize: 24 }}>
          Start a reading plan
        </h2>
        <p className="text-white/65 text-[13px] mt-2 leading-relaxed">
          One verse a day. One chapter a day. Whatever pace fits your life — we'll keep you on track.
        </p>
      </div>
      <div className="px-6 py-5 flex flex-col gap-2.5">
        <button onClick={() => router.push('/plans/create')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-[14px] active:scale-[0.97] transition-all"
          style={{ background: 'white', color: '#5B4FCF' }}>
          Start a plan — it's free
        </button>
        <button onClick={() => router.push('/read')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
          Just open the Bible →
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Active plan hero card
// ─────────────────────────────────────────────
function PlanHeroCard({ plan, onMarkDone, t, dark }) {
  const router   = useRouter()
  const pct      = getPlanProgress(plan)
  const isDone   = isPlanCompletedToday(plan)
  const [marking, setMarking] = useState(false)

  const todayDay = plan.days?.[plan.currentDay - 1]
  const passage  = todayDay?.passage || null

  function buildReaderUrl(p) {
    if (!p) return '/read'
    const m = p.match(/^(.+?)\s+(\d+)/)
    return m ? `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}` : '/read'
  }

  async function handleMark() {
    if (isDone || marking) return
    setMarking(true)
    markDayComplete(plan.id, plan.currentDay, '')
    showToast('Day complete! 🙌')
    onMarkDone?.()
    setMarking(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] overflow-hidden"
      style={{ background: dark ? '#1E1A3C' : 'linear-gradient(150deg,#5B4FCF 0%,#3D3190 100%)' }}>
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">
              Day {plan.currentDay} of {plan.totalDays || '?'}
            </p>
            <p className="font-display text-white font-bold leading-tight mt-1 truncate"
              style={{ fontSize: 20 }}>
              {plan.name}
            </p>
            {passage && (
              <p className="text-white/65 text-[13px] mt-0.5 truncate">{passage}</p>
            )}
          </div>
          {plan.totalDays > 0 && (
            <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 26 }}>{pct}%</p>
          )}
        </div>
        {plan.totalDays > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: 'rgba(255,255,255,0.9)' }} />
          </div>
        )}
      </div>
      <div className="px-6 py-4 flex flex-col gap-2">
        <button onClick={() => router.push(`/plans/${plan.id}/day/${plan.currentDay}`)}
          className="w-full flex items-center justify-center py-3 rounded-full text-[14px] font-semibold active:scale-[0.97] transition-all"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
          Open today's reading →
        </button>
        {isDone ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CheckCircle2 size={15} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[14px]" style={{ color: '#4A7C5F' }}>Read today ✓</span>
          </div>
        ) : (
          <button onClick={handleMark} disabled={marking}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-[14px] active:scale-[0.97] disabled:opacity-60 transition-all"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#5B4FCF' }}>
            {marking
              ? <Loader2 size={15} className="animate-spin" />
              : <><CheckCircle2 size={15} /> Mark as read</>}
          </button>
        )}
      </div>
      <button onClick={() => router.push(`/plans/${plan.id}`)}
        className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold"
        style={{ background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.55)' }}>
        View full plan <ChevronRight size={12} />
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Swipable plans (multiple active)
// ─────────────────────────────────────────────
function SwipablePlans({ plans, onMarkDone, t, dark }) {
  const [idx, setIdx] = useState(0)
  const startX = useRef(null)
  function onTouchStart(e) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) < 44) return
    if (diff > 0) setIdx(i => Math.min(plans.length - 1, i + 1))
    else          setIdx(i => Math.max(0, i - 1))
    startX.current = null
  }
  if (plans.length === 1) return <PlanHeroCard plan={plans[0]} onMarkDone={onMarkDone} t={t} dark={dark} />
  return (
    <div>
      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <motion.div className="flex"
          animate={{ x: `-${idx * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
          {plans.map(plan => (
            <div key={plan.id} className="w-full flex-shrink-0">
              <PlanHeroCard plan={plan} onMarkDone={onMarkDone} t={t} dark={dark} />
            </div>
          ))}
        </motion.div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {plans.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className="rounded-full transition-all"
            style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? '#5B4FCF' : '#C4B5FD' }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Sign-in nudge (guests only, dismissable)
// ─────────────────────────────────────────────
function SignInNudge({ t }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('dw_nudge_dismissed') === '1' } catch { return false }
  })
  if (dismissed) return null
  function dismiss() {
    try { localStorage.setItem('dw_nudge_dismissed', '1') } catch {}
    setDismissed(true)
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] p-4 flex items-center gap-3"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>☁️</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px]" style={{ color: t.text }}>Save your progress</p>
        <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>Sync across devices — free account.</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Link href="/auth" className="px-3 py-1.5 rounded-full font-bold text-[11px] text-white"
          style={{ background: '#5B4FCF' }}>
          Sign up
        </Link>
        <button onClick={dismiss} className="text-[10px] font-semibold" style={{ color: t.textFaint }}>
          Not now
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const router    = useRouter()
  const scrollRef = useRef(null)
  const { t, dark } = useTheme()

  const [user, , hydrated] = useLocalStorage('dw_user', null)
  const [notifOpen, setNotifOpen] = useState(false)
  const { streak } = useCheckin()

  const [localPlans,   setLocalPlans]   = useState([])
  const [sbPlans,      setSbPlans]      = useState([])
  const [plansLoading, setPlansLoading] = useState(true)

  const userInitials = user?.name ? initials(user.name) : null
  const hasAccount   = !!user?.id
  const greeting     = getGreeting(user?.name)
  const daysMissed   = useMemo(() => calcDaysMissed(streak?.lastCheckinDate), [streak?.lastCheckinDate])

  useEffect(() => {
    if (!hydrated) return
    advanceAllPlans()
    const locals = readPlans().filter(p => p.status === 'active')
    setLocalPlans(locals)
    setPlansLoading(false)

    if (user?.id) {
      const sb = createClient()
      if (sb) {
        sb.auth.getUser().then(({ data: { user: sbUser } }) => {
          if (!sbUser) return
          import('../lib/supabase/plans')
            .then(({ getActivePlanForHome }) => getActivePlanForHome(sbUser.id))
            .then(rows => {
              if (!rows?.length) return
              const sbIds = new Set(rows.map(r => r.planId))
              setSbPlans(rows)
              setLocalPlans(prev => prev.filter(p => !sbIds.has(p.id)))
            })
            .catch(() => null)
        }).catch(() => null)
      }
    }
  }, [hydrated, user?.id])

  const allPlans = useMemo(() => {
    const sb = sbPlans.map(r => ({
      id:         r.planId,
      name:       r.planName,
      currentDay: r.currentDay || 1,
      totalDays:  r.personalDays || 0,
      status:     'active',
      days:       r.content?.map((item, i) => ({
        day: i + 1, passage: item.reference, completedAt: null,
      })) || [],
      _sb: true,
    }))
    return [...sb, ...localPlans]
  }, [sbPlans, localPlans])

  function refreshPlans() {
    const locals = readPlans().filter(p => p.status === 'active')
    setLocalPlans(locals)
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', background: t.bg }}>

      {/* ── HEADER — clean wordmark only, no greeting, no BibleIcon, no streak ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4"
        style={{ background: t.bg, height: 52 }}>
        <p className="font-display font-bold text-[18px]"
          style={{ color: t.text, letterSpacing: '-0.02em' }}>
          Daily Walk
        </p>
        <div className="flex items-center gap-2">
          {hasAccount && <NotificationBell onClick={() => setNotifOpen(v => !v)} />}
          <Link href="/profile"
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px]"
            style={{
              background: hasAccount ? 'linear-gradient(135deg,#5B4FCF,#3D3190)' : t.bgMuted,
              color:      hasAccount ? 'white' : t.textMuted,
            }}>
            {hasAccount && userInitials ? userInitials : <UserCircle size={16} style={{ color: t.textMuted }} />}
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-hide"
        style={{ background: t.bg, paddingBottom: 96 }}>

        {/* ── GREETING + STREAK — in the body, above plans ── */}
        <div className="px-4 pt-5 pb-2 flex items-start justify-between">
          <div>
            <p className="font-display font-bold" style={{ fontSize: 24, color: t.text, lineHeight: 1.2 }}>
              {greeting}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: t.textMuted }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {streak?.current > 0 && (
            <div className="flex flex-col items-center px-3 py-2 rounded-[14px] flex-shrink-0"
              style={{
                background: streak.current >= 7 ? '#FFF3DC' : t.bgCard,
                border:     `1px solid ${t.border}`,
              }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>🔥</span>
              <span className="font-bold text-[16px] mt-0.5"
                style={{ color: streak.current >= 7 ? '#E8A838' : t.text }}>
                {streak.current}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide"
                style={{ color: streak.current >= 7 ? '#B87010' : t.textFaint }}>
                {streak.current === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
        </div>

        {/* ── PLAN HERO ── */}
        <div className="px-4 pt-2">
          {plansLoading ? (
            <div className="rounded-[24px] overflow-hidden animate-pulse"
              style={{ height: 260, background: t.bgCard }} />
          ) : allPlans.length > 0 ? (
            <SwipablePlans plans={allPlans} onMarkDone={refreshPlans} t={t} dark={dark} />
          ) : (
            <NoPlanHero t={t} dark={dark} />
          )}
        </div>

        {/* Grace message when missed days */}
        {daysMissed >= 2 && (
          <div className="px-4 mt-4">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-[18px] px-5 py-4 flex items-start gap-3"
              style={{ background: '#FFF3DC', border: '1px solid #F5D78A' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>🌅</span>
              <p className="text-[13px] leading-relaxed font-medium" style={{ color: '#7A4A00' }}>
                {daysMissed === 2
                  ? "Yesterday slipped away — that's okay. His mercies are new this morning."
                  : `It's been ${daysMissed} days. Grace is still here. Start again today.`}
              </p>
            </motion.div>
          </div>
        )}

        {/* Verse of the day */}
        <div className="px-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}>
            <VerseAccent t={t} />
          </motion.div>
        </div>

        {/* Quick actions */}
        <div className="px-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2.5">
            <Link href="/read"
              className="flex-1 flex items-center gap-2 px-4 py-3 rounded-[16px] active:scale-[0.97] transition-all"
              style={{ background: '#E8F5EE' }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <div className="min-w-0">
                <p className="font-bold text-[13px]" style={{ color: '#2D5A3D' }}>Bible</p>
                <p className="text-[11px]" style={{ color: '#4A7C5F99' }}>Open & read</p>
              </div>
            </Link>
            <Link href="/plans"
              className="flex-1 flex items-center gap-2 px-4 py-3 rounded-[16px] active:scale-[0.97] transition-all"
              style={{ background: '#EDE9FF' }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div className="min-w-0">
                <p className="font-bold text-[13px]" style={{ color: '#3D3190' }}>Plans</p>
                <p className="text-[11px]" style={{ color: '#5B4FCF99' }}>All plans</p>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Sign-in nudge */}
        {!hasAccount && (
          <div className="px-4 mt-4">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <SignInNudge t={t} />
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}