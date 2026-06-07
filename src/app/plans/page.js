'use client'

// ── src/app/plans/page.js ── v5 — CLEAN REDESIGN
//
// STRUCTURE (top to bottom):
//   Header (Plans + New plan button)
//   ↓ My Plans — local + Supabase, merged, no duplicates
//   ↓ Join with code — dashed card
//   ↓ Discover — public Supabase plans
//   ↓ Completed — collapsed section
//
// OFFLINE-FIRST: Local plans load instantly, no auth needed.
// Supabase plans merge in quietly when signed in.
// Every card works with both local and Supabase plan shapes.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Hash, Loader2, CheckCircle2,
  BookOpen, ChevronRight, X, ArrowRight,
  Users, Globe, ChevronDown,
} from 'lucide-react'
import { useTheme }                      from '../../lib/theme'
import { ToastContainer, showToast }     from '../../components/Toast'
import { readPlans, advanceAllPlans, getPlanProgress, isPlanCompletedToday, markDayComplete as localMarkDone } from '../../lib/plans'
import { createClient }                  from '../../lib/supabase/client'

// ─────────────────────────────────────────────
//  Progress bar (inline, no component import)
// ─────────────────────────────────────────────
function Bar({ pct, bg = '#5B4FCF' }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EDE9FF' }}>
      <motion.div className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ background: bg }} />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Section heading
// ─────────────────────────────────────────────
function SectionHead({ title, action, onAction, t }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-[17px]" style={{ color: t.text }}>{title}</h2>
      {action && (
        <button onClick={onAction} className="text-[13px] font-semibold" style={{ color: '#5B4FCF' }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  LOCAL plan card
// ─────────────────────────────────────────────
function LocalPlanCard({ plan, onRefresh, t }) {
  const router   = useRouter()
  const pct      = getPlanProgress(plan)
  const isDone   = isPlanCompletedToday(plan)
  const [marking, setMarking] = useState(false)

  const passage = plan.days?.[plan.currentDay - 1]?.passage || null

  function openReader(e) {
    e.stopPropagation()
    if (!passage) { router.push('/read'); return }
    const m = passage.match(/^(.+?)\s+(\d+)/)
    router.push(m ? `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}` : '/read')
  }

  function handleMark(e) {
    e.stopPropagation()
    if (isDone || marking) return
    setMarking(true)
    localMarkDone(plan.id, plan.currentDay, '')
    showToast('Day complete! 🙌')
    onRefresh?.()
    setMarking(false)
  }

  return (
    <motion.div layout
      onClick={() => router.push(`/plans/${plan.id}`)}
      className="rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>

      {/* Gradient header */}
      <div className="px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Day {plan.currentDay} of {plan.totalDays || '?'} · Local
            </p>
            <p className="font-bold text-white leading-snug mt-0.5 truncate" style={{ fontSize: 17 }}>
              {plan.name}
            </p>
            {passage && (
              <p className="text-white/65 text-[12px] mt-0.5">{passage}</p>
            )}
          </div>
          <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 24 }}>{pct}%</p>
        </div>
        <Bar pct={pct} bg="rgba(255,255,255,0.85)" />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={openReader}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[13px] font-semibold active:opacity-70"
          style={{ background: t.bgMuted, color: t.textMuted }}>
          <BookOpen size={13} /> Read now
        </button>
        {isDone ? (
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px]"
            style={{ background: '#E8F5EE' }}>
            <CheckCircle2 size={13} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>Done</span>
          </div>
        ) : (
          <button onClick={handleMark} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] font-bold text-[13px] text-white active:scale-95 transition-all"
            style={{ background: '#4A7C5F' }}>
            {marking
              ? <Loader2 size={12} className="animate-spin" />
              : <><CheckCircle2 size={12} /> Mark done</>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  SUPABASE plan card
// ─────────────────────────────────────────────
function SbPlanCard({ plan, t }) {
  const router   = useRouter()
  const [done,    setDone]    = useState(false)
  const [marking, setMarking] = useState(false)
  const [readCount, setReadCount] = useState(0)

  // personalDays > durationDays (legacy) > total_items > 0
  const total = plan.personalDays || plan.durationDays || plan.totalItems || 0
  const pct   = total > 0
    ? Math.min(100, Math.round(((plan.currentDay - 1) / total) * 100))
    : 0

  // Load today's completion state
  useEffect(() => {
    const sb = createClient(); if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('daily_completions').select('id', { count: 'exact', head: true })
        .eq('plan_id', plan.id).eq('user_id', user.id).eq('day_number', plan.currentDay)
        .then(({ count }) => setDone((count || 0) > 0))
      if (plan.memberCount > 1) {
        sb.from('daily_completions').select('id', { count: 'exact', head: true })
          .eq('plan_id', plan.id).eq('day_number', plan.currentDay)
          .then(({ count }) => setReadCount(count || 0))
      }
    })
  }, [plan.id, plan.currentDay, plan.memberCount])

  async function handleMark(e) {
    e.stopPropagation(); if (done || marking) return
    setMarking(true)
    try {
      const { markDayComplete } = await import('../../lib/supabase/plans')
      await markDayComplete(plan.id, plan.currentDay)
      setDone(true); setReadCount(n => n + 1)
      showToast('Day complete! 🙌')
    } catch { showToast('Something went wrong') }
    finally { setMarking(false) }
  }

  const isGroup  = plan.memberCount > 1
  const isPublic = plan.visibility === 'public'

  // Derive a passage label from content if available
  const passageLabel = (() => {
    if (!plan.content || !plan.currentDay) return null
    try {
      const { getSliceForDay, formatSliceReference } = require('../../lib/plan-schedule')
      const freq = { unit: plan.frequencyUnit || 'chapter', count: plan.frequencyCount || 1 }
      const slice = getSliceForDay(plan.content, freq, plan.currentDay)
      return slice ? formatSliceReference(slice) : null
    } catch { return null }
  })()

  function openReader(e) {
    e.stopPropagation()
    if (!passageLabel) { router.push('/read'); return }
    const m = passageLabel.split('·')[0].trim().match(/^(.+?)\s+(\d+)/)
    router.push(m ? `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}` : '/read')
  }

  return (
    <motion.div layout
      onClick={() => router.push(`/plans/${plan.id}`)}
      className="rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>

      <div className="px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Day {plan.currentDay}{total > 0 ? ` of ${total}` : ''}
              </p>
              {isGroup && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Users size={9} color="rgba(255,255,255,0.75)" />
                  <span className="text-[9px] font-bold text-white/75">{plan.memberCount}</span>
                </div>
              )}
              {isPublic && <Globe size={10} color="rgba(255,255,255,0.4)" />}
            </div>
            <p className="font-bold text-white leading-snug truncate" style={{ fontSize: 17 }}>
              {plan.name}
            </p>
            {passageLabel && (
              <p className="text-white/65 text-[12px] mt-0.5">{passageLabel}</p>
            )}
            {isGroup && readCount > 0 && (
              <p className="text-white/45 text-[11px] mt-0.5">
                {readCount} member{readCount !== 1 ? 's' : ''} read today
              </p>
            )}
          </div>
          {total > 0 && (
            <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 24 }}>{pct}%</p>
          )}
        </div>
        {total > 0 && <Bar pct={pct} bg="rgba(255,255,255,0.85)" />}
      </div>

      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={openReader}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[13px] font-semibold active:opacity-70"
          style={{ background: t.bgMuted, color: t.textMuted }}>
          <BookOpen size={13} /> Read now
        </button>
        {done ? (
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px]"
            style={{ background: '#E8F5EE' }}>
            <CheckCircle2 size={13} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>Done</span>
          </div>
        ) : (
          <button onClick={handleMark} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] font-bold text-[13px] text-white active:scale-95 transition-all"
            style={{ background: '#4A7C5F' }}>
            {marking
              ? <Loader2 size={12} className="animate-spin" />
              : <><CheckCircle2 size={12} /> Mark done</>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Join with code sheet
// ─────────────────────────────────────────────
function JoinSheet({ onClose, t }) {
  const router = useRouter()
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    try {
      const { getPlanByInviteCode, joinPlan } = await import('../../lib/supabase/plans')
      const plan = await getPlanByInviteCode(trimmed)
      if (!plan) { showToast('Plan not found — check the code'); setLoading(false); return }
      await joinPlan(plan.id)
      showToast(`Joined "${plan.name}" 🙌`)
      onClose()
      router.push(`/plans/${plan.id}`)
    } catch (e) {
      if (e.message === 'not_authenticated') router.push('/auth?next=/plans')
      else showToast('Something went wrong — try again')
    } finally { setLoading(false) }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70]"
        style={{ background: t.bgCard, paddingBottom: 'max(2rem,env(safe-area-inset-bottom))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full" style={{ background: t.border }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: t.border }}>
          <p className="font-bold text-[17px]" style={{ color: t.text }}>Join with invite code</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <X size={14} style={{ color: t.textMuted }} />
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            Enter the code a friend shared with you — like{' '}
            <span className="font-mono font-bold" style={{ color: t.text }}>ROM-4X9K</span>
          </p>
          <input
            value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. ROM-4X9K" autoFocus autoCapitalize="characters"
            className="w-full rounded-[14px] px-5 py-4 text-[24px] font-bold text-center tracking-[0.18em] focus:outline-none"
            style={{
              background: t.bgMuted, color: t.text,
              border: `2px solid ${code ? '#5B4FCF' : t.border}`,
            }} />
          <button onClick={handleJoin} disabled={!code.trim() || loading}
            className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.97] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {loading
              ? <><Loader2 size={17} className="animate-spin" /> Finding…</>
              : 'Join Plan →'}
          </button>
          <p className="text-[12px] text-center" style={{ color: t.textFaint }}>
            Joining a shared plan requires a free account
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Discover plan card
// ─────────────────────────────────────────────
function DiscoverCard({ plan, onJoin, joining, t }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(`/plans/${plan.id}`)}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] text-left active:opacity-80 transition-opacity"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#EDE9FF,#D8D0FF)' }}>
        📖
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: t.text }}>{plan.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
          {plan.memberCount || 0} member{(plan.memberCount || 0) !== 1 ? 's' : ''}
          {plan.durationDays ? ` · ${plan.durationDays} days` : ''}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onJoin(plan) }}
        disabled={joining === plan.id}
        className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-bold text-white active:scale-95 transition-all"
        style={{ background: '#5B4FCF' }}>
        {joining === plan.id
          ? <Loader2 size={12} className="animate-spin" />
          : 'Join'}
      </button>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Completed plan row (compact)
// ─────────────────────────────────────────────
function CompletedRow({ plan, t }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-[14px]"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <CheckCircle2 size={17} style={{ color: '#4A7C5F', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: t.text }}>{plan.name}</p>
        <p className="text-[12px]" style={{ color: t.textMuted }}>Completed 🏆</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────
function EmptyPlans({ router, t }) {
  return (
    <div className="rounded-[20px] px-6 py-8 text-center"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
      <p style={{ fontSize: 38 }}>📖</p>
      <p className="font-bold text-[16px] mt-3 mb-1.5" style={{ color: t.text }}>
        No plans yet
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: t.textMuted }}>
        Start a plan to build a consistent Bible reading habit. No account needed.
      </p>
      <button onClick={() => router.push('/plans/create')}
        className="mt-5 px-6 py-3 rounded-full font-bold text-[14px] text-white active:scale-95"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        Start a plan →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function PlansPage() {
  const router = useRouter()
  const { t }  = useTheme()

  const [mounted,       setMounted]       = useState(false)
  const [authUser,      setAuthUser]      = useState(null)

  // Plans
  const [localPlans,    setLocalPlans]    = useState([])
  const [sbPlans,       setSbPlans]       = useState([])
  const [sbLoading,     setSbLoading]     = useState(false)

  // Discover
  const [discoverPlans, setDiscoverPlans] = useState([])
  const [discoverLoad,  setDiscoverLoad]  = useState(true)
  const [joiningId,     setJoiningId]     = useState(null)

  // UI
  const [showJoin,        setShowJoin]        = useState(false)
  const [showCompleted,   setShowCompleted]   = useState(false)

  // ── Load ──
  useEffect(() => {
    setMounted(true)

    // 1. Local plans — instant, offline-safe
    advanceAllPlans()
    setLocalPlans(readPlans())

    // 2. Auth check
    const sb = createClient()
    if (sb) {
      sb.auth.getUser().then(({ data: { user } }) => {
        setAuthUser(user || null)
        if (user) {
          setSbLoading(true)
          import('../../lib/supabase/plans')
            .then(({ getMyPlans }) => getMyPlans())
            .then(rows => { setSbPlans(rows || []); setSbLoading(false) })
            .catch(() => setSbLoading(false))
        }
      }).catch(() => {})
    }

    // 3. Discover — works online only, graceful fail
    import('../../lib/supabase/plans')
      .then(({ getPublicPlans }) => getPublicPlans({ limit: 5 }))
      .then(rows => { setDiscoverPlans(rows || []); setDiscoverLoad(false) })
      .catch(() => setDiscoverLoad(false))
  }, [])

  function refreshLocal() { setLocalPlans(readPlans()) }

  // Deduplicate: if a local plan shares an ID with a Supabase plan, Supabase wins
  const sbIds          = new Set(sbPlans.map(p => p.id))
  const localActive    = localPlans.filter(p => p.status === 'active'    && !sbIds.has(p.id))
  const localCompleted = localPlans.filter(p => p.status === 'completed' && !sbIds.has(p.id))
  const sbActive       = sbPlans.filter(p => p.memberStatus === 'active')
  const sbCompleted    = sbPlans.filter(p => p.memberStatus === 'completed')

  const hasActive    = sbActive.length + localActive.length > 0
  const hasCompleted = sbCompleted.length + localCompleted.length > 0

  async function handleJoinPublic(plan) {
    if (!authUser) { router.push('/auth?next=/plans'); return }
    if (joiningId) return
    setJoiningId(plan.id)
    try {
      const { joinPlan } = await import('../../lib/supabase/plans')
      await joinPlan(plan.id)
      showToast(`Joined "${plan.name}" 🙌`)
      router.push(`/plans/${plan.id}`)
    } catch { showToast('Something went wrong') }
    finally { setJoiningId(null) }
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px]" style={{ color: t.text, lineHeight: 1.1 }}>
            Plans
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: t.textMuted }}>
            {hasActive
              ? `${sbActive.length + localActive.length} active`
              : 'Start reading today'}
          </p>
        </div>
        <button onClick={() => router.push('/plans/create')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px] active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Plus size={14} /> New plan
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ─── 1. MY PLANS ─── */}
        <section className="px-4 mb-6">
          <SectionHead title="My Plans" t={t} />

          {/* Supabase loading */}
          {sbLoading && localActive.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: '#5B4FCF' }} />
            </div>
          )}

          {/* No plans state */}
          {!hasActive && !sbLoading && (
            <EmptyPlans router={router} t={t} />
          )}

          {/* Plan cards */}
          {hasActive && (
            <div className="flex flex-col gap-3">
              {sbActive.map(p    => <SbPlanCard    key={p.id} plan={p} t={t} />)}
              {localActive.map(p => <LocalPlanCard key={p.id} plan={p} onRefresh={refreshLocal} t={t} />)}
            </div>
          )}
        </section>

        {/* ─── 2. JOIN WITH CODE ─── */}
        <section className="px-4 mb-5">
          <button onClick={() => setShowJoin(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] active:opacity-80 transition-opacity"
            style={{ background: t.bgCard, border: `1.5px dashed ${t.border}` }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#EDE9FF' }}>
              <Hash size={19} style={{ color: '#5B4FCF' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[14px]" style={{ color: t.text }}>Join with invite code</p>
              <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
                Someone shared a code — e.g. ROM-4X9K
              </p>
            </div>
            <ArrowRight size={16} style={{ color: t.textFaint }} />
          </button>
        </section>

        {/* ─── 3. DISCOVER ─── */}
        <section className="px-4 mb-6">
          <SectionHead
            title="Discover Plans"
            action="See all →"
            onAction={() => router.push('/plans/discover')}
            t={t} />

          {discoverLoad ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: '#5B4FCF' }} />
            </div>
          ) : discoverPlans.length === 0 ? (
            <p className="text-[13px] text-center py-6" style={{ color: t.textMuted }}>
              No public plans yet — create one and make it public!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {discoverPlans.map(plan => (
                <DiscoverCard key={plan.id} plan={plan}
                  onJoin={handleJoinPublic} joining={joiningId} t={t} />
              ))}
            </div>
          )}
        </section>

        {/* ─── 4. COMPLETED (collapsible) ─── */}
        {hasCompleted && (
          <section className="px-4 mb-6">
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="flex items-center justify-between w-full mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: t.textFaint }}>
                Completed ({sbCompleted.length + localCompleted.length})
              </p>
              <ChevronDown size={14} style={{
                color: t.textFaint,
                transform: showCompleted ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
            </button>

            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="flex flex-col gap-2 pb-2">
                    {sbCompleted.map(p    => <CompletedRow key={p.id}   plan={p} t={t} />)}
                    {localCompleted.map(p => <CompletedRow key={p.id}   plan={p} t={t} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

      </div>

      {/* ── Sheets ── */}
      <AnimatePresence>
        {showJoin && <JoinSheet onClose={() => setShowJoin(false)} t={t} />}
      </AnimatePresence>
    </div>
  )
}