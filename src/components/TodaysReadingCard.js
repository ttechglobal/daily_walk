'use client'

// ── src/components/TodaysReadingCard.js ── v4
// OFFLINE-FIRST, GUEST-FRIENDLY:
//   • No account needed — reads from localStorage (dw_plans) first
//   • If user is signed in AND has Supabase plans, merges them in
//   • Multiple active plans → horizontally swipable cards with dot indicators
//   • Mark-as-read works for both local plans and Supabase plans
//   • Notes tab is local-first (no auth required)

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, CheckCircle2, ChevronRight,
  Loader2, PenLine, Users,
} from 'lucide-react'
import { useTheme }       from '../lib/theme'
import { useAuthContext } from '../contexts/AuthContext'
import { showToast }      from './Toast'

// Local plan helpers (offline, no auth)
import {
  readPlans, getTodaysPlan, isPlanCompletedToday,
  markDayComplete as localMarkDone, getPlanProgress,
} from '../lib/plans'

// Supabase plan helpers (auth only — lazy imported)
// getActivePlanForHome, markDayComplete as supabaseMarkDone

// ─────────────────────────────────────────────
//  Note storage — local-first, no auth required
// ─────────────────────────────────────────────
const NOTE_PREFIX = 'dw_plannote_'
function readNote(planId, day) {
  try { return localStorage.getItem(`${NOTE_PREFIX}${planId}_${day}`) || '' } catch { return '' }
}
function writeNote(planId, day, text) {
  try { localStorage.setItem(`${NOTE_PREFIX}${planId}_${day}`, text) } catch {}
}

// ─────────────────────────────────────────────
//  Debounce
// ─────────────────────────────────────────────
function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay]) // eslint-disable-line
}

// ─────────────────────────────────────────────
//  Normalise a local plan into the card shape
// ─────────────────────────────────────────────
function normaliseLocalPlan(p) {
  return {
    planId:      p.id,
    planName:    p.name,
    source:      'local',
    currentDay:  p.currentDay || 1,
    totalDays:   p.totalDays  || p.days?.length || 0,
    passage:     p.days?.[p.currentDay - 1]?.passage || null,
    memberCount: 1,
    isLocalPlan: true,
    rawPlan:     p,
  }
}

// ─────────────────────────────────────────────
//  Normalise a Supabase plan row into the card shape
// ─────────────────────────────────────────────
function normaliseSupabasePlan(r) {
  // getActivePlanForHome already shaped these
  return {
    planId:        r.planId,
    planName:      r.planName,
    source:        'supabase',
    currentDay:    r.currentDay || 1,
    totalDays:     r.personalDays || r.totalItems || 0,
    content:       r.content,
    frequencyUnit: r.frequencyUnit,
    frequencyCount:r.frequencyCount,
    memberCount:   r.memberCount || 1,
    isLocalPlan:   false,
  }
}

// ─────────────────────────────────────────────
//  Empty state — no plans
// ─────────────────────────────────────────────
function NoPlanCard({ t, router }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mx-4 rounded-[22px] p-5 flex flex-col gap-3"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-2">
        <BookOpen size={16} style={{ color: '#5B4FCF' }} />
        <span className="font-bold text-[14px]" style={{ color: t.text }}>Today's Reading</span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: t.textMuted }}>
        Pick a reading plan to guide your daily time in the Word. No account needed to get started.
      </p>
      <button onClick={() => router.push('/plans')}
        className="self-start px-5 py-2.5 rounded-full font-bold text-[13px] text-white active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
        Browse Plans →
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Single plan card
// ─────────────────────────────────────────────
function PlanCard({ plan, t, router }) {
  const [todayDone, setTodayDone] = useState(false)
  const [marking,   setMarking]   = useState(false)
  const [activeTab, setActiveTab] = useState('reading')
  const [noteText,  setNoteText]  = useState('')
  const [noteSaved, setNoteSaved] = useState(true)

  // Derive passage / progress
  const pct = plan.totalDays > 0
    ? Math.min(100, Math.round(((plan.currentDay - 1) / plan.totalDays) * 100))
    : 0

  // For local plans: get passage from rawPlan
  // For Supabase plans: compute from content + frequency
  const [sliceRef, setSliceRef] = useState(null)

  useEffect(() => {
    if (plan.isLocalPlan) {
      setSliceRef(plan.passage || null)
      // Check if today is already done
      if (plan.rawPlan) setTodayDone(isPlanCompletedToday(plan.rawPlan))
    } else {
      // Supabase plan — compute slice
      if (plan.content && plan.currentDay) {
        import('../lib/plan-schedule').then(({ getSliceForDay, formatSliceReference }) => {
          const freq = {
            unit:  plan.frequencyUnit  || 'chapter',
            count: plan.frequencyCount || 1,
          }
          const slice = getSliceForDay(plan.content, plan.currentDay, freq)
          if (slice) setSliceRef(formatSliceReference(slice))
        })
      }
      // Check Supabase done state
      import('../lib/supabase/client').then(({ createClient }) => {
        const sb = createClient()
        if (!sb) return
        sb.auth.getUser().then(({ data: { user } }) => {
          if (!user) return
          sb.from('daily_completions')
            .select('id', { count: 'exact', head: true })
            .eq('plan_id', plan.planId)
            .eq('user_id', user.id)
            .eq('day_number', plan.currentDay)
            .then(({ count }) => setTodayDone((count || 0) > 0))
        })
      })
    }
    // Load note
    setNoteText(readNote(plan.planId, plan.currentDay))
  }, [plan.planId, plan.currentDay]) // eslint-disable-line

  const saveNoteDebounced = useDebounce((text) => {
    writeNote(plan.planId, plan.currentDay, text)
    setNoteSaved(true)
  }, 800)

  function handleNoteChange(e) {
    setNoteText(e.target.value)
    setNoteSaved(false)
    saveNoteDebounced(e.target.value)
  }

  async function handleMarkDone() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      if (plan.isLocalPlan) {
        // Local plan — no auth needed
        localMarkDone(plan.planId, plan.currentDay, noteText)
        setTodayDone(true)
        showToast('Day complete! 🙌')
      } else {
        // Supabase plan — requires auth
        const { markDayComplete } = await import('../lib/supabase/plans')
        await markDayComplete(plan.planId, plan.currentDay)
        setTodayDone(true)
        showToast('Day complete! 🙌')
        // Notify group silently
        try {
          const { notifyReadComplete } = await import('../lib/supabase/plans')
          await notifyReadComplete(plan.planId, plan.currentDay)
        } catch {}
      }
    } catch (e) {
      showToast(e.message === 'not_authenticated'
        ? 'Sign in to sync your progress'
        : 'Something went wrong')
    } finally { setMarking(false) }
  }

  function handleOpenReader() {
    const ref = sliceRef || plan.passage
    if (!ref) { router.push('/read'); return }
    const m = ref.match(/^(.+?)\s+(\d+)/)
    if (m) router.push(`/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`)
    else   router.push('/read')
  }

  const TABS = [
    { key: 'reading', label: 'Reading', Icon: BookOpen },
    { key: 'notes',   label: 'Notes',   Icon: PenLine  },
  ]

  return (
    <div className="rounded-[22px] overflow-hidden flex flex-col"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>

      {/* Header gradient band */}
      <div className="px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
              Day {plan.currentDay} {plan.totalDays > 0 ? `of ${plan.totalDays}` : ''}
            </p>
            <p className="font-bold text-[17px] text-white mt-0.5 leading-snug truncate">
              {plan.planName}
            </p>
            {sliceRef && (
              <p className="text-white/70 text-[13px] mt-0.5">{sliceRef}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {plan.memberCount > 1 && (
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-1">
                <Users size={11} color="rgba(255,255,255,0.85)" />
                <span className="text-[11px] font-bold text-white/85">{plan.memberCount}</span>
              </div>
            )}
            {plan.isLocalPlan && (
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Local</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {plan.totalDays > 0 && (
          <>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <p className="mt-1 text-white/50 text-[10px]">{pct}% complete</p>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: t.border }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold border-b-2 transition-all"
            style={{
              color:       activeTab === key ? '#5B4FCF' : t.textMuted,
              borderColor: activeTab === key ? '#5B4FCF' : 'transparent',
            }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'reading' ? (
          <motion.div key="reading"
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.13 }}
            className="px-5 py-4 flex flex-col gap-3">

            {/* Open reader */}
            <button onClick={handleOpenReader}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold active:opacity-70 transition-opacity"
              style={{ background: t.bgMuted, color: t.textMuted }}>
              <BookOpen size={14} />
              Open in Bible reader
            </button>

            {/* Mark done */}
            {todayDone ? (
              <div className="flex items-center justify-center gap-2 py-2.5 rounded-[12px]"
                style={{ background: '#E8F5EE' }}>
                <CheckCircle2 size={16} style={{ color: '#4A7C5F' }} />
                <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>
                  Read today ✓
                </span>
              </div>
            ) : (
              <button onClick={handleMarkDone} disabled={marking}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] font-bold text-[14px] text-white active:scale-[0.97] disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #4A7C5F, #2D6043)' }}>
                {marking
                  ? <Loader2 size={15} className="animate-spin" />
                  : <><CheckCircle2 size={15} /> Mark as read</>}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="notes"
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.13 }}
            className="px-5 py-4 flex flex-col gap-2">
            <textarea
              value={noteText}
              onChange={handleNoteChange}
              placeholder="Your thoughts, questions, or reflections for today's passage…"
              rows={5}
              className="w-full resize-none text-[14px] leading-relaxed focus:outline-none rounded-[12px] p-3 border"
              style={{ background: t.bgMuted, color: t.text, borderColor: t.border }} />
            <p className="text-[11px] text-right" style={{ color: t.textFaint }}>
              {noteSaved ? 'Saved locally' : 'Saving…'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Go to plan link */}
      <button onClick={() => router.push(`/plans/${plan.planId}`)}
        className="flex items-center justify-center gap-1 py-3 text-[12px] font-semibold border-t"
        style={{ color: t.textMuted, borderColor: t.border }}>
        View full plan <ChevronRight size={13} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Swipable cards wrapper
// ─────────────────────────────────────────────
function SwipableCards({ plans, t, router }) {
  const [idx,    setIdx]    = useState(0)
  const startX             = useRef(null)
  const total              = plans.length

  function onTouchStart(e) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) < 44) return
    if (diff > 0) setIdx(i => Math.min(total - 1, i + 1))
    else          setIdx(i => Math.max(0, i - 1))
    startX.current = null
  }

  return (
    <div>
      <div className="overflow-hidden mx-4"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <motion.div
          className="flex"
          animate={{ x: `-${idx * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}>
          {plans.map((plan, i) => (
            <div key={plan.planId || i} className="w-full flex-shrink-0">
              <PlanCard plan={plan} t={t} router={router} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {plans.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width:      i === idx ? 20 : 6,
                height:     6,
                background: i === idx ? '#5B4FCF' : '#C4B5FD',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────
export default function TodaysReadingCard() {
  const { t }    = useTheme()
  const { user } = useAuthContext()
  const router   = useRouter()

  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      // 1. Always start with local plans (instant, offline-safe)
      const localRaw    = readPlans()
      const localActive = localRaw
        .filter(p => p.status === 'active')
        .map(normaliseLocalPlan)

      if (!cancelled) {
        setPlans(localActive)
        setLoading(false)
      }

      // 2. If signed in, also pull Supabase plans and merge
      if (user?.id) {
        try {
          const { getActivePlanForHome } = await import('../lib/supabase/plans')
          const rows = await getActivePlanForHome(user.id)
          if (cancelled) return
          const sbPlans = (rows || []).map(normaliseSupabasePlan)

          // Merge: deduplicate by planId (Supabase wins over local if same id)
          const localIds   = new Set(sbPlans.map(p => p.planId))
          const localOnly  = localActive.filter(p => !localIds.has(p.planId))
          setPlans([...sbPlans, ...localOnly])
        } catch {
          // Supabase unavailable — local plans still shown, that's fine
        }
      }
    }

    loadPlans()
    return () => { cancelled = true }
  }, [user?.id]) // eslint-disable-line

  if (loading) return (
    <div className="mx-4 rounded-[22px] overflow-hidden"
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, minHeight: 200 }}>
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 size={22} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    </div>
  )

  if (!plans.length) return <NoPlanCard t={t} router={router} />

  return <SwipableCards plans={plans} t={t} router={router} />
}