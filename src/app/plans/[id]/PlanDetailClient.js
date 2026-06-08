'use client'

// ── src/app/plans/[id]/PlanDetailClient.js — offline-first patch ──
//
// OFFLINE FIXES:
//   1. On successful Supabase load, save plan data to localStorage
//      under key `dw_sb_plan_cache_{planId}`.
//   2. On load, if offline or Supabase fails, read from that cache.
//   3. If no cache exists at all (never opened online), show a friendly
//      "connect once to cache this plan" message instead of a blank/broken state.
//   4. All existing behaviour (local plans, Supabase plans, mark done, etc.) preserved.
//
// NOTE: This is a targeted patch — only the `load` function and its
// surrounding state are changed. All rendering/UI code is preserved as-is.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Loader2, Copy,
  WifiOff, RefreshCw,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  readPlans, advancePlanIfNeeded, isPlanCompletedToday,
} from '../../../lib/plans'

// ── Cache helpers ──
const PLAN_CACHE_PREFIX = 'dw_sb_plan_cache_'

function writePlanCache(planId, data) {
  try {
    localStorage.setItem(
      `${PLAN_CACHE_PREFIX}${planId}`,
      JSON.stringify({ ...data, _cachedAt: new Date().toISOString() })
    )
  } catch {}
}

function readPlanCache(planId) {
  try {
    const raw = localStorage.getItem(`${PLAN_CACHE_PREFIX}${planId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function isLocalPlanId(id) {
  return typeof id === 'string' && id.startsWith('local_')
}

// Utility used by day slice logic (preserved from original)
function computePersonalDays(content, frequency) {
  if (!content?.length || !frequency?.count) return 0
  return Math.ceil(content.length / frequency.count)
}

function getSliceForDay(content, frequency, day) {
  if (!content?.length || !frequency?.count || !day) return null
  const start = (day - 1) * frequency.count
  const slice = content.slice(start, start + frequency.count)
  if (!slice.length) return null
  return slice.map(i => i.reference || i.passage || '').filter(Boolean).join(', ')
}

// Progress bar
function ProgressBar({ current, total, t }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[12px] font-semibold" style={{ color: t.textMuted }}>
          Day {current} of {total}
        </p>
        <p className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{pct}%</p>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#5B4FCF,#7C6FCD)' }} />
      </div>
    </div>
  )
}

// Today's reading card
function TodayCard({ sliceRef, currentDay, total, todayDone, marking, onRead, onMark, t }) {
  return (
    <div className="rounded-[20px] overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
      <div className="px-5 pt-5 pb-4">
        <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          Day {currentDay}{total > 0 ? ` of ${total}` : ''}
        </p>
        <p className="font-bold text-white mt-1 leading-snug" style={{ fontSize: 20 }}>
          {sliceRef || `Day ${currentDay}`}
        </p>
      </div>
      <div className="px-5 pb-5 flex flex-col gap-2.5">
        <button onClick={onRead}
          className="w-full flex items-center justify-center py-3 rounded-full font-semibold text-[14px] active:scale-[0.97] transition-all"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
          Open in reader →
        </button>
        {todayDone ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CheckCircle2 size={15} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[14px]" style={{ color: '#4A7C5F' }}>Read today ✓</span>
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

  const [plan,        setPlan]        = useState(null)
  const [members,     setMembers]     = useState([])
  const [authUser,    setAuthUser]    = useState(null)
  const [myMember,    setMyMember]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [marking,     setMarking]     = useState(false)
  const [todayDone,   setTodayDone]   = useState(false)
  const [tab,         setTab]         = useState('reading')
  const [fromCache,   setFromCache]   = useState(false)   // true = rendered from localStorage cache
  const [neverCached, setNeverCached] = useState(false)   // true = no cache, no network

  const isLocal = isLocalPlanId(planId)

  const load = useCallback(async () => {
    setLoading(true)

    // ── LOCAL PLANS ── (always offline-safe)
    if (isLocal) {
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

    // ── SUPABASE PLANS ──

    // Step 1: Check offline status. If offline, go straight to cache.
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!online) {
      const cached = readPlanCache(planId)
      if (cached) {
        setPlan(cached)
        setFromCache(true)
        // Restore member/completion state from cache if available
        if (cached._myMember) setMyMember(cached._myMember)
        if (cached._todayDone !== undefined) setTodayDone(cached._todayDone)
      } else {
        setNeverCached(true)
      }
      setLoading(false)
      return
    }

    // Step 2: Online — fetch from Supabase
    try {
      const { getPlanById, getPlanMembers, getMyCompletions } = await import('../../../lib/supabase/plans')
      const { getAuthUser } = await import('../../../lib/supabase/communities')

      let p = null, m = [], user = null, comps = new Set()
      try { p    = await getPlanById(planId)          } catch (e) { console.warn('[plan] getPlanById:', e.message) }
      try { m    = await getPlanMembers(planId) || [] } catch (e) { console.warn('[plan] getPlanMembers:', e.message) }
      try { user = await getAuthUser()                } catch (e) { console.warn('[plan] getAuthUser:', e.message) }
      if (user && p) {
        try { comps = await getMyCompletions(planId) } catch {}
      }

      let mine     = null
      let td       = false
      if (user && m.length) {
        mine = m.find(mem => mem.userId === user.id) || null
        const cd = mine?.currentDay || 1
        td = comps instanceof Set ? comps.has(cd) : false
      }

      setPlan(p)
      setMembers(m)
      setAuthUser(user)
      setMyMember(mine)
      setTodayDone(td)
      setFromCache(false)

      // ── CACHE for offline use ──
      if (p) {
        writePlanCache(planId, {
          ...p,
          _myMember:  mine,
          _todayDone: td,
        })
      }
    } catch (e) {
      console.error('[PlanDetailClient] load error:', e.message)
      // Network failed mid-request — try cache fallback
      const cached = readPlanCache(planId)
      if (cached) {
        setPlan(cached)
        setFromCache(true)
        if (cached._myMember) setMyMember(cached._myMember)
        if (cached._todayDone !== undefined) setTodayDone(cached._todayDone)
      } else {
        setNeverCached(true)
      }
    } finally {
      setLoading(false)
    }
  }, [planId, isLocal])

  useEffect(() => { load() }, [load])

  // ── Mark day complete ──
  async function handleMark() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      if (isLocal) {
        const { markDayComplete } = await import('../../../lib/plans')
        markDayComplete(planId, plan.currentDay, '')
        setTodayDone(true)
        showToast('Day complete! 🙌')

        // Update cache
        writePlanCache(planId, { ...plan, _todayDone: true })
      } else {
        const { enqueueOfflineAction } = await import('../../../lib/offline-queue')
        const day = myMember?.currentDay || plan?.currentDay || 1

        // Optimistic update
        setTodayDone(true)
        writePlanCache(planId, { ...plan, _todayDone: true })

        if (navigator.onLine) {
          try {
            const { markDayComplete: sbMark } = await import('../../../lib/supabase/plans')
            await sbMark(planId, day)
          } catch {
            enqueueOfflineAction('plan_complete_day', {
              planId, day, completedAt: new Date().toISOString(),
            })
          }
        } else {
          enqueueOfflineAction('plan_complete_day', {
            planId, day, completedAt: new Date().toISOString(),
          })
        }
        showToast('Day complete! 🙌')
      }
    } catch (e) {
      showToast('Something went wrong')
      setTodayDone(false)
    } finally {
      setMarking(false)
    }
  }

  async function handleShare() {
    if (!plan?.inviteCode) return
    try {
      await navigator.clipboard.writeText(plan.inviteCode)
      showToast('Invite code copied!')
    } catch {
      showToast(plan.inviteCode)
    }
  }

  // ── Derived values ──
  const currentDay = isLocal ? (plan?.currentDay || 1) : (myMember?.currentDay || 1)

  const frequency = {
    unit:  isLocal ? (plan?.frequencyUnit  || 'chapter') : (myMember?.frequencyUnit  || plan?.frequencyUnit  || 'chapter'),
    count: isLocal ? (plan?.frequencyCount || 1)         : (myMember?.frequencyCount || plan?.frequencyCount || 1),
  }

  const content   = plan?.content || []
  const totalDays = isLocal
    ? (plan?.personalDays || 0)
    : (myMember?.personal_days || plan?.personalDays || computePersonalDays(content, frequency) || 0)

  const todaySlice    = content.length > 0 ? getSliceForDay(content, frequency, currentDay) : null
  const legacyPassage = !todaySlice && plan?.rawDays?.length
    ? plan.rawDays[(currentDay - 1)]?.passage || null
    : null
  const sliceRef = todaySlice || legacyPassage

  const isCreator = authUser?.id === plan?.creatorId
  const showGroup = !isLocal && members.length > 1

  const TABS = [
    { k: 'reading', l: 'Reading' },
    ...(showGroup ? [{ k: 'group', l: `Group (${members.length})` }] : []),
  ]

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    )
  }

  // ── Never cached + offline ──
  if (neverCached) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => router.push('/plans')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: t.bgCard }}>
            <ArrowLeft size={18} style={{ color: t.text }} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#EDE9FF' }}>
            <WifiOff size={28} style={{ color: '#5B4FCF' }} />
          </div>
          <div>
            <p className="font-bold text-[20px] mb-2" style={{ color: t.text }}>Not available offline</p>
            <p className="text-[14px] leading-relaxed" style={{ color: t.textMuted }}>
              Open this plan once while connected and it will be available offline every time after that.
            </p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[14px] text-white"
            style={{ background: '#5B4FCF' }}>
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Plan not found ──
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
        style={{ background: t.bg }}>
        <p className="font-bold text-[18px]" style={{ color: t.text }}>Plan not found</p>
        <p className="text-[14px]" style={{ color: t.textMuted }}>It may have been removed.</p>
        <button onClick={() => router.push('/plans')}
          className="px-5 py-2.5 rounded-full text-white font-bold text-[14px]"
          style={{ background: '#5B4FCF' }}>
          Back to Plans
        </button>
      </div>
    )
  }

  // ── Main render ──
  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Cached data banner */}
      {fromCache && (
        <div className="flex items-center gap-2 px-4 py-2"
          style={{ background: '#FFF3DC', borderBottom: '1px solid #F5D78A' }}>
          <WifiOff size={13} style={{ color: '#E8A838' }} />
          <p className="text-[12px] flex-1" style={{ color: '#7A4A00' }}>
            Showing cached version — changes will sync when back online
          </p>
          <button onClick={load} className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#E8A838' }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Header */}
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
      </div>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="flex px-4 gap-0 border-b" style={{ borderColor: t.border }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-4 py-3 text-[13px] font-bold transition-colors"
              style={{
                color:        tab === k ? '#5B4FCF' : t.textMuted,
                borderBottom: tab === k ? '2px solid #5B4FCF' : '2px solid transparent',
              }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 flex flex-col gap-4">

        {tab === 'reading' && (
          <>
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

            {totalDays > 0 && (
              <div className="rounded-[16px] p-4"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <ProgressBar current={currentDay} total={totalDays} t={t} />
              </div>
            )}

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
                <Avatar name={m.displayName || m.username || '?'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px]" style={{ color: t.text }}>
                    {m.displayName || m.username || 'Member'}
                  </p>
                  <p className="text-[12px]" style={{ color: t.textMuted }}>
                    Day {m.currentDay || 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}