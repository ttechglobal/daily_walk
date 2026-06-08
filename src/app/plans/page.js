'use client'

// ── src/app/plans/page.js ── v7
// PATCHES APPLIED:
//   1. Discover section: finally() + 6s hard timeout — can never hang forever
//   2. BookOpen icon removed from "Read now" buttons (already correct in v6, preserved)

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Hash, Loader2, CheckCircle2,
  ChevronRight, X, ArrowRight, Users, ChevronDown,
} from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'
import { ToastContainer, showToast }      from '../../components/Toast'
import {
  readPlans, advanceAllPlans, getPlanProgress,
  isPlanCompletedToday, markDayComplete as localMarkDone,
} from '../../lib/plans'
import { createClient } from '../../lib/supabase/client'

// ─────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────
function Bar({ pct }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.85)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Local plan card
// ─────────────────────────────────────────────
function LocalPlanCard({ plan, onRefresh, c }) {
  const router  = useRouter()
  const pct     = getPlanProgress(plan)
  const isDone  = isPlanCompletedToday(plan)
  const [marking, setMarking] = useState(false)

  const passage = plan.days?.[plan.currentDay - 1]?.passage || null

  function openReader(e) {
    e.stopPropagation()
    router.push(`/plans/${plan.id}/day/${plan.currentDay}`)
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
      className="rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98]"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>

      <div className="px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Day {plan.currentDay} of {plan.totalDays || '?'} · Local
            </p>
            <p className="font-bold text-white leading-snug mt-0.5 truncate" style={{ fontSize: 17 }}>
              {plan.name}
            </p>
            {passage && <p className="text-white/65 text-[12px] mt-0.5">{passage}</p>}
          </div>
          <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 22 }}>{pct}%</p>
        </div>
        <Bar pct={pct} />
      </div>

      <div className="px-4 py-3 flex items-center gap-2">
        {/* NO BookOpen icon */}
        <button onClick={openReader}
          className="flex-1 flex items-center justify-center py-2.5 rounded-[12px] text-[13px] font-semibold active:opacity-70"
          style={{ background: c.bgMuted, color: c.textMuted }}>
          Read now
        </button>
        {isDone ? (
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px]"
            style={{ background: '#E8F5EE' }}>
            <CheckCircle2 size={13} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>Done</span>
          </div>
        ) : (
          <button onClick={handleMark} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] font-bold text-[13px] text-white active:scale-95"
            style={{ background: '#4A7C5F' }}>
            {marking ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle2 size={12} /> Mark done</>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Supabase plan card
// ─────────────────────────────────────────────
function SbPlanCard({ plan, c }) {
  const router = useRouter()
  const [done,    setDone]    = useState(false)
  const [marking, setMarking] = useState(false)

  const total = plan.personalDays || plan.durationDays || 0
  const pct   = total > 0 ? Math.min(100, Math.round(((plan.currentDay - 1) / total) * 100)) : 0

  useEffect(() => {
    const sb = createClient(); if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('daily_completions').select('id', { count: 'exact', head: true })
        .eq('plan_id', plan.id).eq('user_id', user.id).eq('day_number', plan.currentDay)
        .then(({ count }) => setDone((count || 0) > 0))
    })
  }, [plan.id, plan.currentDay])

  async function handleMark(e) {
    e.stopPropagation(); if (done || marking) return
    setMarking(true)
    try {
      const { markDayComplete } = await import('../../lib/supabase/plans')
      await markDayComplete(plan.id, plan.currentDay)
      setDone(true)
      showToast('Day complete! 🙌')
    } catch { showToast('Something went wrong') }
    finally { setMarking(false) }
  }

  return (
    <motion.div layout
      onClick={() => router.push(`/plans/${plan.id}`)}
      className="rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98]"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>

      <div className="px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Day {plan.currentDay}{total > 0 ? ` of ${total}` : ''}
              </p>
              {plan.memberCount > 1 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Users size={9} color="rgba(255,255,255,0.7)" />
                  <span className="text-[9px] font-bold text-white/70">{plan.memberCount}</span>
                </div>
              )}
            </div>
            <p className="font-bold text-white leading-snug truncate" style={{ fontSize: 17 }}>
              {plan.name}
            </p>
          </div>
          {total > 0 && (
            <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 22 }}>{pct}%</p>
          )}
        </div>
        {total > 0 && <Bar pct={pct} />}
      </div>

      <div className="px-4 py-3 flex items-center gap-2">
        {/* NO BookOpen icon */}
        <button onClick={e => { e.stopPropagation(); router.push(`/plans/${plan.id}`) }}
          className="flex-1 flex items-center justify-center py-2.5 rounded-[12px] text-[13px] font-semibold active:opacity-70"
          style={{ background: c.bgMuted, color: c.textMuted }}>
          Read now
        </button>
        {done ? (
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px]"
            style={{ background: '#E8F5EE' }}>
            <CheckCircle2 size={13} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>Done</span>
          </div>
        ) : (
          <button onClick={handleMark} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] font-bold text-[13px] text-white active:scale-95"
            style={{ background: '#4A7C5F' }}>
            {marking ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle2 size={12} /> Mark done</>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Join with code sheet
// ─────────────────────────────────────────────
function JoinSheet({ onClose, c }) {
  const router  = useRouter()
  const [code,  setCode]  = useState('')
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
      onClose(); router.push(`/plans/${plan.id}`)
    } catch (e) {
      if (e.message === 'not_authenticated') router.push('/auth?next=/plans')
      else showToast('Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70]"
        style={{ background: c.bgCard, paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full" style={{ background: c.border }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: c.border }}>
          <p className="font-bold text-[17px]" style={{ color: c.text }}>Join with invite code</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: c.bgMuted }}>
            <X size={14} style={{ color: c.textMuted }} />
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-[13px]" style={{ color: c.textMuted }}>
            Enter the code a friend shared — like{' '}
            <span className="font-mono font-bold" style={{ color: c.text }}>ROM-4X9K</span>
          </p>
          <input
            value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ROM-4X9K" autoFocus autoCapitalize="characters"
            className="w-full rounded-[14px] px-5 py-4 text-[24px] font-bold text-center tracking-[0.18em] focus:outline-none"
            style={{ background: c.bgMuted, color: c.text, border: `2px solid ${code ? '#5B4FCF' : c.border}` }} />
          <button onClick={handleJoin} disabled={!code.trim() || loading}
            className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {loading ? <><Loader2 size={17} className="animate-spin" /> Finding…</> : 'Join Plan →'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Discover plan card (mini)
// ─────────────────────────────────────────────
function DiscoverCard({ plan, onJoin, joining, c }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(`/plans/${plan.id}`)}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] text-left active:opacity-80"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0"
        style={{ background: '#EDE9FF' }}>📖</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: c.text }}>{plan.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>
          {plan.memberCount || 0} member{(plan.memberCount || 0) !== 1 ? 's' : ''}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onJoin(plan) }}
        disabled={joining === plan.id}
        className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-bold text-white"
        style={{ background: '#5B4FCF' }}>
        {joining === plan.id ? <Loader2 size={12} className="animate-spin" /> : 'Join'}
      </button>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function PlansPage() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [mounted,       setMounted]       = useState(false)
  const [authUser,      setAuthUser]      = useState(null)
  const [localPlans,    setLocalPlans]    = useState([])
  const [sbPlans,       setSbPlans]       = useState([])
  const [sbLoading,     setSbLoading]     = useState(false)
  const [discoverPlans, setDiscoverPlans] = useState([])
  const [discoverLoad,  setDiscoverLoad]  = useState(true)
  const [joiningId,     setJoiningId]     = useState(null)
  const [showJoin,      setShowJoin]      = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // 1. Local plans — instant
    advanceAllPlans()
    setLocalPlans(readPlans())

    // 2. Auth + Supabase plans
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

    // 3. Discover — hard 6s timeout + finally() so it can NEVER hang forever
    const _discoverTimer = setTimeout(() => setDiscoverLoad(false), 6000)
    import('../../lib/supabase/plans')
      .then(({ getPublicPlans }) => getPublicPlans({ limit: 5 }))
      .then(rows => { setDiscoverPlans(rows || []) })
      .catch(() => {})
      .finally(() => { clearTimeout(_discoverTimer); setDiscoverLoad(false) })
  }, [])

  const sbIds       = new Set(sbPlans.map(p => p.id))
  const localActive = localPlans.filter(p => p.status === 'active' && !sbIds.has(p.id))
  const localDone   = localPlans.filter(p => p.status === 'completed' && !sbIds.has(p.id))
  const sbActive    = sbPlans.filter(p => p.memberStatus === 'active')
  const sbDone      = sbPlans.filter(p => p.memberStatus === 'completed')
  const hasActive   = sbActive.length + localActive.length > 0
  const hasDone     = sbDone.length + localDone.length > 0

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
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px]" style={{ color: c.text, lineHeight: 1.1 }}>
            Plans
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: c.textMuted }}>
            {hasActive
              ? `${sbActive.length + localActive.length} active`
              : 'Start reading today'}
          </p>
        </div>
        <button onClick={() => router.push('/plans/create')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px] active:scale-95"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Plus size={14} /> New plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── MY PLANS ── */}
        <section className="px-4 mb-6">
          <p className="font-bold text-[17px] mb-3" style={{ color: c.text }}>My Plans</p>

          {sbLoading && localActive.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: '#5B4FCF' }} />
            </div>
          )}

          {!hasActive && !sbLoading && (
            <div className="rounded-[20px] px-6 py-8 text-center"
              style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
              <p style={{ fontSize: 36 }}>📖</p>
              <p className="font-bold text-[15px] mt-3 mb-1" style={{ color: c.text }}>No active plans</p>
              <p className="text-[13px]" style={{ color: c.textMuted }}>No account needed to start.</p>
              <button onClick={() => router.push('/plans/create')}
                className="mt-4 px-5 py-2.5 rounded-full font-bold text-[13px] text-white"
                style={{ background: '#5B4FCF' }}>
                Start a plan →
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {sbActive.map(p    => <SbPlanCard    key={p.id} plan={p} c={c} />)}
            {localActive.map(p => <LocalPlanCard key={p.id} plan={p} onRefresh={() => setLocalPlans(readPlans())} c={c} />)}
          </div>
        </section>

        {/* ── JOIN WITH CODE ── */}
        <section className="px-4 mb-5">
          <button onClick={() => setShowJoin(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] active:opacity-80"
            style={{ background: c.bgCard, border: `1.5px dashed ${c.border}` }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#EDE9FF' }}>
              <Hash size={19} style={{ color: '#5B4FCF' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[14px]" style={{ color: c.text }}>Join with invite code</p>
              <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>e.g. ROM-4X9K</p>
            </div>
            <ArrowRight size={16} style={{ color: c.textFaint }} />
          </button>
        </section>

        {/* ── DISCOVER ── */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[17px]" style={{ color: c.text }}>Discover Plans</p>
            <button onClick={() => router.push('/plans/discover')}
              className="text-[13px] font-semibold" style={{ color: '#5B4FCF' }}>
              See all →
            </button>
          </div>
          {discoverLoad ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: '#5B4FCF' }} />
            </div>
          ) : discoverPlans.length === 0 ? (
            <p className="text-[13px] text-center py-6" style={{ color: c.textMuted }}>
              No public plans yet — create one!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {discoverPlans.map(plan => (
                <DiscoverCard key={plan.id} plan={plan}
                  onJoin={handleJoinPublic} joining={joiningId} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* ── COMPLETED (collapsible) ── */}
        {hasDone && (
          <section className="px-4 mb-6">
            <button onClick={() => setShowCompleted(v => !v)}
              className="flex items-center justify-between w-full mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: c.textFaint }}>
                Completed ({sbDone.length + localDone.length})
              </p>
              <ChevronDown size={14} style={{
                color: c.textFaint,
                transform: showCompleted ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden flex flex-col gap-3">
                  {sbDone.map(p    => <SbPlanCard    key={p.id} plan={p} c={c} />)}
                  {localDone.map(p => <LocalPlanCard key={p.id} plan={p} onRefresh={() => setLocalPlans(readPlans())} c={c} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* Join sheet */}
      <AnimatePresence>
        {showJoin && <JoinSheet onClose={() => setShowJoin(false)} c={c} />}
      </AnimatePresence>
    </div>
  )
}