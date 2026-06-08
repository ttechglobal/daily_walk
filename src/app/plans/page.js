'use client'

// ── src/app/plans/page.js — v8 (offline-first) ──
// FIXES:
//   1. Discover section: checks navigator.onLine BEFORE firing fetch.
//      If offline, sets discoverLoad=false immediately — no 6s spinner.
//   2. Auth/Supabase plans: wraps sb.auth.getUser() in a 3s timeout so it
//      can never hang the page. Offline = authUser stays null, page still renders.
//   3. `discoverLoad` initial value is now false if offline on mount.
//      No spinner flash at all when the user is known to be offline.

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Hash, Loader2, CheckCircle2,
  ChevronRight, X, ArrowRight, Users, ChevronDown, WifiOff,
} from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'
import { ToastContainer, showToast }      from '../../components/Toast'
import {
  readPlans, advanceAllPlans, getPlanProgress,
  isPlanCompletedToday, markDayComplete as localMarkDone,
} from '../../lib/plans'
import { createClient } from '../../lib/supabase/client'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/** Race a promise against a timeout — resolves with null on timeout */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ])
}

function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

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
              Day {plan.currentDay} of {plan.totalDays || '?'}
            </p>
            <p className="font-bold text-[17px] text-white leading-tight mt-0.5 truncate">
              {plan.name}
            </p>
            {passage && (
              <p className="text-[12px] text-white/60 mt-0.5 truncate">{passage}</p>
            )}
          </div>
          {isDone && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
          )}
        </div>
        <Bar pct={pct} />
        <p className="text-[11px] text-white/50 mt-1">{pct}% complete</p>
      </div>

      <div className="px-5 py-3 flex items-center gap-2">
        <button onClick={openReader}
          className="flex-1 py-2.5 rounded-full font-bold text-[13px] text-white text-center"
          style={{ background: '#5B4FCF' }}>
          Read now
        </button>
        {!isDone && (
          <button onClick={handleMark} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-[13px]"
            style={{ background: c.bgMuted, color: c.text }}>
            {marking
              ? <Loader2 size={15} className="animate-spin" />
              : <><CheckCircle2 size={15} /> Mark done</>}
          </button>
        )}
      </div>

      <button onClick={() => router.push(`/plans/${plan.id}`)}
        className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-semibold"
        style={{ borderTop: `1px solid ${c.border}`, color: c.textFaint }}>
        View full plan <ChevronRight size={12} />
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Supabase plan card (for online mode)
// ─────────────────────────────────────────────
function SbPlanCard({ plan, c }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(`/plans/${plan.id}`)}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] text-left active:opacity-80"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        <Users size={18} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: c.text }}>{plan.name}</p>
        <p className="text-[12px]" style={{ color: c.textMuted }}>
          Day {plan.currentDay || 1} · {plan.memberCount || 1} member{plan.memberCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight size={16} style={{ color: c.textFaint, flexShrink: 0 }} />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Discover card
// ─────────────────────────────────────────────
function DiscoverCard({ plan, onJoin, joining, c }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/plans/${plan.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left active:opacity-80"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] truncate" style={{ color: c.text }}>{plan.name}</p>
        <p className="text-[12px]" style={{ color: c.textMuted }}>
          {plan.memberCount || 0} member{plan.memberCount !== 1 ? 's' : ''}
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
//  Join with code sheet
// ─────────────────────────────────────────────
function JoinSheet({ onClose, c }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (!code.trim()) return
    setJoining(true)
    try {
      const { joinPlanByCode } = await import('../../lib/supabase/plans')
      const plan = await joinPlanByCode(code.trim().toUpperCase())
      showToast(`Joined "${plan.name}" 🙌`)
      onClose()
      router.push(`/plans/${plan.id}`)
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to join plans' : 'Invalid code — try again')
    } finally {
      setJoining(false)
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/30 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] rounded-t-[24px] p-6"
        style={{ background: c.bgCard, translateX: '-50%' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-[17px]" style={{ color: c.text }}>Join with code</p>
          <button onClick={onClose}><X size={20} style={{ color: c.textFaint }} /></button>
        </div>
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ROM-4X9K"
          maxLength={10}
          className="w-full px-4 py-3.5 rounded-[14px] font-mono font-bold text-[18px] text-center mb-4 outline-none"
          style={{ background: c.bgMuted, color: c.text, border: `1.5px solid ${c.border}`, letterSpacing: '0.1em' }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
        <button onClick={handleJoin} disabled={joining || !code.trim()}
          className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-50"
          style={{ background: '#5B4FCF' }}>
          {joining ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Join Plan'}
        </button>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function PlansPage() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  // KEY FIX: if we're offline on mount, don't bother loading discover at all
  const startedOffline = typeof navigator !== 'undefined' && !navigator.onLine

  const [mounted,       setMounted]       = useState(false)
  const [authUser,      setAuthUser]      = useState(null)
  const [localPlans,    setLocalPlans]    = useState([])
  const [sbPlans,       setSbPlans]       = useState([])
  const [sbLoading,     setSbLoading]     = useState(false)
  const [discoverPlans, setDiscoverPlans] = useState([])
  const [discoverLoad,  setDiscoverLoad]  = useState(!startedOffline) // false immediately if offline
  const [joiningId,     setJoiningId]     = useState(null)
  const [showJoin,      setShowJoin]      = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isOffline,     setIsOffline]     = useState(startedOffline)

  useEffect(() => {
    setMounted(true)

    // Track online/offline status live
    const goOnline  = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)

    // 1. Local plans — INSTANT, zero network
    advanceAllPlans()
    setLocalPlans(readPlans())

    // 2. Auth + Supabase plans — with hard timeout so offline never hangs
    const sb = createClient()
    if (sb) {
      withTimeout(sb.auth.getUser(), 3000)
        .then(result => {
          // null = timed out (offline), or result has data.user
          const user = result?.data?.user || null
          setAuthUser(user)
          if (user) {
            setSbLoading(true)
            // Only attempt if we think we're online
            if (isOnline()) {
              import('../../lib/supabase/plans')
                .then(({ getMyPlans }) => withTimeout(getMyPlans(), 5000))
                .then(rows => { setSbPlans(rows || []) })
                .catch(() => {})
                .finally(() => setSbLoading(false))
            } else {
              setSbLoading(false)
            }
          }
        })
        .catch(() => {}) // timeout resolved as null above, this shouldn't fire
    }

    // 3. Discover — SKIP ENTIRELY if offline
    if (!isOnline()) {
      setDiscoverLoad(false)
      return () => {
        window.removeEventListener('online',  goOnline)
        window.removeEventListener('offline', goOffline)
      }
    }

    // Online: fetch with hard 5s timeout (was 6s, tightened)
    const _discoverTimer = setTimeout(() => setDiscoverLoad(false), 5000)
    import('../../lib/supabase/plans')
      .then(({ getPublicPlans }) => getPublicPlans({ limit: 5 }))
      .then(rows => { setDiscoverPlans(rows || []) })
      .catch(() => {})
      .finally(() => { clearTimeout(_discoverTimer); setDiscoverLoad(false) })

    return () => {
      clearTimeout(_discoverTimer)
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, []) // eslint-disable-line

  const sbIds       = new Set(sbPlans.map(p => p.id))
  const localActive = localPlans.filter(p => p.status === 'active'    && !sbIds.has(p.id))
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

        {/* ── OFFLINE BANNER ── */}
        {isOffline && (
          <div className="mx-4 mb-4 px-4 py-3 rounded-[14px] flex items-center gap-2"
            style={{ background: '#FFF3DC', border: '1px solid #F5D78A' }}>
            <WifiOff size={15} style={{ color: '#E8A838', flexShrink: 0 }} />
            <p className="text-[13px]" style={{ color: '#7A4A00' }}>
              Offline — showing your saved plans. Community plans will sync when back online.
            </p>
          </div>
        )}

        {/* ── MY PLANS ── */}
        <section className="px-4 mb-6">
          <p className="font-bold text-[17px] mb-3" style={{ color: c.text }}>My Plans</p>

          {/* Show Supabase plans spinner only when online */}
          {sbLoading && !isOffline && localActive.length === 0 && (
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
        {!isOffline && (
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
        )}

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