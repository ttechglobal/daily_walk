'use client'

// ── src/app/plans/[id]/PlanDetailClient.js ── v5
//
// HANDLES:
//   • Local plans: id starts with 'local_' OR 'plan_' OR is not a UUID
//   • Supabase plans: standard UUID format
//   • v2 content model: plan.content[] + frequency → getSliceForDay()
//   • Legacy plans: plan_days table → still reads correctly
//
// FIXES:
//   • isLocal detection covers 'plan_XXXX' IDs from old create page
//   • Promise.all replaced with sequential try/catch so one failure doesn't kill the whole load
//   • Mark as read works for both local and Supabase
//   • Reader link built from today's slice reference

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, CheckCircle2,
  Share2, Copy, Loader2, MoreVertical, LogOut,
  Users, ChevronRight,
} from 'lucide-react'
import { useTheme }                  from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import { getSliceForDay, formatSliceReference, computePersonalDays } from '../../../lib/plan-schedule'
import {
  readPlans, markDayComplete as localMarkDone,
  isPlanCompletedToday, advancePlanIfNeeded,
} from '../../../lib/plans'

// ─────────────────────────────────────────────
//  Is this a local (localStorage) plan?
//  Covers: 'local_XXX', 'plan_XXX', or anything that isn't a UUID
// ─────────────────────────────────────────────
function isLocalPlanId(id) {
  if (!id) return false
  if (id.startsWith('local_')) return true
  if (id.startsWith('plan_'))  return true
  // UUIDs are 36 chars with dashes e.g. 550e8400-e29b-41d4-a716-446655440000
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return !uuidRe.test(id)
}

// ─────────────────────────────────────────────
//  Build the /read URL from a passage reference string
//  e.g. "John 3" → /read?book=John&chapter=3
//       "Romans 1–2" → /read?book=Romans&chapter=1
// ─────────────────────────────────────────────
function buildReaderUrl(ref) {
  if (!ref) return '/read'
  const first = ref.split(/[·–—]/)[0].trim()
  const m = first.match(/^(.+?)\s+(\d+)/)
  if (m) return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
  return '/read'
}

// ─────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────
function ProgressBar({ current, total, t }) {
  const pct = total > 0 ? Math.min(100, Math.round(((current - 1) / total) * 100)) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
          Day {current} of {total}
        </span>
        <span className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDE9FF' }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: '#5B4FCF' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Today reading card
// ─────────────────────────────────────────────
function TodayCard({ sliceRef, currentDay, total, todayDone, marking, onRead, onMark, t }) {
  return (
    <div className="rounded-[20px] overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
      <div className="px-5 pt-5 pb-3">
        <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
          Day {currentDay} of {total || '?'}
        </p>
        <p className="font-bold text-white mt-1 leading-snug" style={{ fontSize: 20 }}>
          {sliceRef || `Day ${currentDay}`}
        </p>
      </div>
      <div className="px-5 pb-5 flex flex-col gap-2.5">
        <button onClick={onRead}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-[14px] active:scale-[0.97] transition-all"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
          <BookOpen size={15} /> Open in reader →
        </button>
        {todayDone ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CheckCircle2 size={15} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[14px]" style={{ color: '#4A7C5F' }}>
              Read today ✓
            </span>
          </div>
        ) : (
          <button onClick={onMark} disabled={marking}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-[14px] active:scale-[0.97] disabled:opacity-60 transition-all"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#5B4FCF' }}>
            {marking
              ? <Loader2 size={15} className="animate-spin" />
              : <><CheckCircle2 size={15} /> Mark as read</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Avatar
// ─────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const ini    = (name || '?').slice(0, 2).toUpperCase()
  const colors = ['#5B4FCF', '#4A7C5F', '#E8A838', '#E84060']
  const bg     = colors[(ini.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.36) }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function PlanDetailClient({ planId }) {
  const router = useRouter()
  const { t }  = useTheme()

  const [plan,      setPlan]      = useState(null)
  const [members,   setMembers]   = useState([])
  const [authUser,  setAuthUser]  = useState(null)
  const [myMember,  setMyMember]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [marking,   setMarking]   = useState(false)
  const [todayDone, setTodayDone] = useState(false)
  const [tab,       setTab]       = useState('reading')
  const [menuOpen,  setMenuOpen]  = useState(false)

  const isLocal = isLocalPlanId(planId)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isLocal) {
        // ── LOCAL PLAN ──
        advancePlanIfNeeded(planId)
        const all   = readPlans()
        const local = all.find(p => p.id === planId)
        if (!local) { setLoading(false); return }

        setPlan({
          id:             local.id,
          name:           local.name,
          visibility:     'private',
          memberCount:    1,
          inviteCode:     null,
          content:        local.content || [],
          frequencyUnit:  local.frequencyUnit  || 'chapter',
          frequencyCount: local.frequencyCount || 1,
          personalDays:   local.totalDays      || 0,
          currentDay:     local.currentDay     || 1,
          isLocal:        true,
          rawDays:        local.days           || [],
        })
        setTodayDone(isPlanCompletedToday(local))
        setLoading(false)
        return
      }

      // ── SUPABASE PLAN ──
      const { getPlanById, getPlanMembers, getMyCompletions } = await import('../../../lib/supabase/plans')
      const { getAuthUser } = await import('../../../lib/supabase/communities')

      // Load sequentially so one failure doesn't block everything
      let p = null, m = [], user = null, comps = new Set()

      try { p    = await getPlanById(planId)          } catch (e) { console.warn('[plan] getPlanById:', e.message) }
      try { m    = await getPlanMembers(planId) || [] } catch (e) { console.warn('[plan] getPlanMembers:', e.message) }
      try { user = await getAuthUser()                } catch (e) { console.warn('[plan] getAuthUser:', e.message) }

      if (user && p) {
        try { comps = await getMyCompletions(planId) } catch {}
      }

      setPlan(p)
      setMembers(m)
      setAuthUser(user)

      if (user) {
        const mine = m.find(mem => mem.userId === user.id)
        setMyMember(mine || null)
        const currentDay = mine?.currentDay || 1
        setTodayDone(comps instanceof Set ? comps.has(currentDay) : false)
      }
    } catch (e) {
      console.error('[PlanDetailClient] load error:', e.message)
    } finally {
      setLoading(false)
    }
  }, [planId, isLocal])

  useEffect(() => { load() }, [load])

  // ── Derived values ──
  const currentDay = isLocal
    ? (plan?.currentDay || 1)
    : (myMember?.currentDay || 1)

  const frequency = {
    unit:  isLocal ? (plan?.frequencyUnit  || 'chapter') : (myMember?.frequencyUnit  || plan?.frequencyUnit  || 'chapter'),
    count: isLocal ? (plan?.frequencyCount || 1)         : (myMember?.frequencyCount || plan?.frequencyCount || 1),
  }

  const content   = plan?.content || []
  const totalDays = isLocal
    ? (plan?.personalDays || 0)
    : (myMember?.personal_days || plan?.personalDays || computePersonalDays(content, frequency) || 0)

  // Get today's slice — instant, no network
  const todaySlice = content.length > 0
    ? getSliceForDay(content, frequency, currentDay)
    : null

  // Fallback to legacy days array for old local plans
  const legacyPassage = !todaySlice && plan?.rawDays?.length
    ? plan.rawDays.find(d => d.day === currentDay)?.passage || null
    : null

  const sliceRef = todaySlice
    ? formatSliceReference(todaySlice)
    : legacyPassage

  // ── Mark as read ──
  async function handleMark() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      if (isLocal) {
        localMarkDone(planId, currentDay, '')
        setTodayDone(true)
        showToast('Day complete! 🙌')
        // Update local plan currentDay in state
        setPlan(prev => ({
          ...prev,
          currentDay: Math.min((prev.currentDay || 1) + 1, prev.personalDays || 9999),
        }))
      } else {
        const { markDayComplete, notifyReadComplete } = await import('../../../lib/supabase/plans')
        await markDayComplete(planId, currentDay)
        setTodayDone(true)
        showToast('Day complete! 🙌')
        notifyReadComplete(planId, currentDay).catch(() => null)
        setMyMember(prev => prev
          ? { ...prev, currentDay: Math.min(currentDay + 1, totalDays) }
          : prev
        )
      }
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to track progress' : 'Something went wrong')
    } finally { setMarking(false) }
  }

  // ── Share ──
  function handleShare() {
    const code = plan?.inviteCode
    if (!code) return
    const text = `Join my Bible reading plan "${plan.name}" — code: ${code}`
    if (navigator.share) navigator.share({ title: plan.name, text }).catch(() => null)
    else navigator.clipboard?.writeText(text).then(() => showToast('Invite copied!'))
  }

  // ── Leave ──
  async function handleLeave() {
    if (!confirm('Leave this plan?')) return
    try {
      const { leavePlan } = await import('../../../lib/supabase/plans')
      await leavePlan(planId)
      showToast('Left plan')
      router.push('/plans')
    } catch { showToast('Something went wrong') }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg }}>
        <Loader2 size={26} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    )
  }

  // ── Not found ──
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
        style={{ background: t.bg }}>
        <span style={{ fontSize: 40 }}>🔍</span>
        <p className="font-bold text-[18px]" style={{ color: t.text }}>Plan not found</p>
        <p className="text-[13px]" style={{ color: t.textMuted }}>
          This plan may have been deleted or doesn't exist on this device.
        </p>
        <button onClick={() => router.push('/plans')}
          className="px-5 py-2.5 rounded-full text-white font-bold text-[14px]"
          style={{ background: '#5B4FCF' }}>
          Back to Plans
        </button>
      </div>
    )
  }

  const isCreator = authUser?.id === plan?.creatorId
  const isMember  = isLocal || !!myMember
  const showGroup = !isLocal && members.length > 1

  const TABS = [
    { k: 'reading', l: 'Reading' },
    ...(showGroup ? [{ k: 'group', l: `Group (${members.length})` }] : []),
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.bgCard }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] truncate" style={{ color: t.text }}>{plan.name}</h1>
          <p className="text-[12px]" style={{ color: t.textFaint }}>
            {plan.isLocal
              ? `Local plan · ${totalDays > 0 ? `${totalDays} days` : ''}`
              : `${plan.memberCount || 1} member${plan.memberCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 relative">
          {plan.inviteCode && (
            <button onClick={handleShare}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: t.bgMuted }}>
              <Share2 size={16} style={{ color: t.textMuted }} />
            </button>
          )}
          {!isLocal && (
            <button onClick={() => setMenuOpen(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: t.bgMuted }}>
              <MoreVertical size={16} style={{ color: t.textMuted }} />
            </button>
          )}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-11 z-50 rounded-[16px] overflow-hidden min-w-[160px]"
                style={{ background: t.bgCard, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: `1px solid ${t.border}` }}>
                {!isCreator && (
                  <button onClick={() => { setMenuOpen(false); handleLeave() }}
                    className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left text-[14px] font-semibold"
                    style={{ color: '#EF4444' }}>
                    <LogOut size={14} /> Leave plan
                  </button>
                )}
                <button onClick={() => setMenuOpen(false)}
                  className="flex items-center w-full px-4 py-3 text-left text-[13px] border-t"
                  style={{ color: t.textMuted, borderColor: t.border }}>
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tab bar ── */}
      {TABS.length > 1 && (
        <div className="flex px-4 border-b flex-shrink-0" style={{ borderColor: t.border }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-1 py-3 text-[13px] font-bold transition-all"
              style={{
                color:        tab === k ? '#5B4FCF' : t.textMuted,
                borderBottom: tab === k ? '2px solid #5B4FCF' : '2px solid transparent',
              }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 flex flex-col gap-4">

        {tab === 'reading' && (
          <>
            {/* Invite code pill */}
            {plan.inviteCode && (
              <button onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full self-start border"
                style={{ borderColor: t.border, background: t.bgCard }}>
                <Copy size={13} style={{ color: '#5B4FCF' }} />
                <span className="font-mono font-bold text-[14px]" style={{ color: '#5B4FCF' }}>
                  {plan.inviteCode}
                </span>
                <span className="text-[12px]" style={{ color: t.textMuted }}>· tap to share</span>
              </button>
            )}

            {/* Progress bar */}
            {totalDays > 0 && (
              <div className="rounded-[16px] p-4"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <ProgressBar current={currentDay} total={totalDays} />
              </div>
            )}

            {/* Today's reading card */}
            <TodayCard
              sliceRef={sliceRef}
              currentDay={currentDay}
              total={totalDays}
              todayDone={todayDone}
              marking={marking}
              onRead={() => router.push(`/plans/${planId}/day/${currentDay}`)}
              onMark={handleMark}
              t={t}
            />

            {/* Plan info */}
            <div className="rounded-[16px] p-4"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <p className="font-bold text-[14px] mb-1" style={{ color: t.text }}>About this plan</p>
              <p className="text-[12px]" style={{ color: t.textFaint }}>
                {plan.isLocal ? 'Saved on this device' : plan.visibility === 'public' ? 'Public plan' : 'Private plan'}
                {totalDays > 0 ? ` · ${totalDays} days total` : ''}
              </p>
            </div>
          </>
        )}

        {tab === 'group' && (
          <div className="flex flex-col gap-3">
            <p className="font-bold text-[15px]" style={{ color: t.text }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
            {members.map(m => (
              <div key={m.userId}
                className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <Avatar name={m.displayName || m.username || '?'} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate" style={{ color: t.text }}>
                    {m.displayName || m.username || 'Member'}
                  </p>
                  <p className="text-[12px]" style={{ color: t.textMuted }}>Day {m.currentDay || 1}</p>
                </div>
                {m.userId === authUser?.id && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                    style={{ background: '#EDE9FF', color: '#5B4FCF' }}>You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
//  NOTE: To enable the Reflections tab in PlanDetailClient,
//  add this to the TABS array and render condition:
//
//  In the TABS const (after 'reading'):
//    ...(isMember ? [{ k: 'reflections', l: 'Reflections' }] : []),
//
//  In the tab body:
//    {tab === 'reflections' && (
//      <PlanReflectionsTab
//        planId={planId}
//        currentDay={currentDay}
//        isMember={isMember} />
//    )}
//
//  Import at top:
//    import PlanReflectionsTab from '../../../components/plans/PlanReflectionsTab'
//
//  The PlanReflectionsTab component (already built in a previous output) handles:
//    - Viewing reflections (visible to plan members only — RLS enforced)
//    - Adding new reflections or questions
//    - Real-time updates via Supabase subscription
//    - Delete own reflections
//    - Auto-picks up verses added from Bible reader (sessionStorage)