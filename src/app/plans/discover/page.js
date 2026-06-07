'use client'

// ── src/app/plans/discover/page.js ── v2
// FIX: replaced useTheme() with getDarkModeColors(dark) to avoid hydration flash.
// Shows public plans. Works offline-first — empty state if no network.
// Guest users can VIEW plans. Joining requires account (soft prompt, not wall).

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, BookOpen, Loader2, ArrowLeft, X, WifiOff } from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../../contexts/DarkModeContext'
import { ToastContainer, showToast } from '../../../components/Toast'
import { getPublicPlans } from '../../../lib/supabase/plans'
import { createClient } from '../../../lib/supabase/client'

const FILTERS = [
  { k: 'recent',       l: 'Latest'        },
  { k: 'most_members', l: 'Most popular'  },
  { k: 'shortest',     l: 'Shortest'      },
  { k: 'longest',      l: 'Longest'       },
]

const SUBTYPE_ICON = {
  topic:     '💡',
  book:      '📖',
  character: '👤',
  custom:    '✨',
}

// ─────────────────────────────────────────────
//  Plan card
// ─────────────────────────────────────────────
function PlanCard({ plan, onJoin, joining, c, router }) {
  const icon = SUBTYPE_ICON[plan.planSubtype] || '📖'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] overflow-hidden"
      style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>

      <button onClick={() => router.push(`/plans/${plan.id}`)}
        className="w-full text-left px-4 pt-4 pb-3 block">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[20px] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] truncate" style={{ color: c.text }}>
              {plan.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {plan.totalItems > 0 && (
                <span className="text-[12px]" style={{ color: c.textMuted }}>
                  {plan.totalItems} passages
                </span>
              )}
              <span style={{ color: c.textFaint }}>·</span>
              <div className="flex items-center gap-1">
                <Users size={11} style={{ color: c.textFaint }} />
                <span className="text-[12px]" style={{ color: c.textFaint }}>
                  {plan.memberCount || 0}
                </span>
              </div>
              {plan.creatorName && (
                <>
                  <span style={{ color: c.textFaint }}>·</span>
                  <span className="text-[12px]" style={{ color: c.textFaint }}>
                    by {plan.creatorName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {plan.description && (
          <p className="text-[13px] leading-relaxed mt-2 line-clamp-2"
            style={{ color: c.textMuted }}>
            {plan.description}
          </p>
        )}
      </button>

      <div className="flex items-center justify-between px-4 pb-4 gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {plan.planSubtype && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: c.bgMuted, color: c.textMuted }}>
              {plan.planSubtype}
            </span>
          )}
        </div>
        <button onClick={() => onJoin(plan)} disabled={joining === plan.id}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-[13px] text-white flex-shrink-0 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {joining === plan.id
            ? <Loader2 size={13} className="animate-spin" />
            : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-[18px] h-[120px] animate-pulse"
          style={{ background: c.bgCard }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────
export default function DiscoverPage() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [plans,    setPlans]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [offline,  setOffline]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('recent')
  const [joining,  setJoining]  = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [page,     setPage]     = useState(0)
  const [hasMore,  setHasMore]  = useState(true)
  const PER_PAGE = 20

  // Auth check in background
  useEffect(() => {
    const sb = createClient()
    if (!sb) return
    sb.auth.getUser()
      .then(({ data: { user } }) => setAuthUser(user || null))
      .catch(() => null)
  }, [])

  // load is NOT in useCallback to avoid stale closure / re-render loops
  async function load(resetPage = false, currentSearch = search, currentFilter = filter, currentPage = 0) {
    setLoading(true)
    setOffline(false)
    const offset = resetPage ? 0 : currentPage * PER_PAGE
    try {
      const data = await getPublicPlans({
        search: currentSearch || undefined,
        filter: currentFilter,
        limit:  PER_PAGE,
        offset,
      })
      if (resetPage) setPlans(data)
      else setPlans(prev => [...prev, ...data])
      setHasMore(data.length === PER_PAGE)
      if (!resetPage) setPage(p => p + 1)
    } catch (e) {
      console.error('[discover] load error:', e.message)
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  // Reload when search or filter changes — debounced
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0)
      setHasMore(true)
      load(true, search, filter, 0)
    }, search ? 400 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter])

  async function handleJoin(plan) {
    if (!authUser) {
      router.push('/auth?next=/plans/discover')
      return
    }
    if (joining) return
    setJoining(plan.id)
    try {
      const { joinPlan } = await import('../../../lib/supabase/plans')
      await joinPlan(plan.id)
      showToast(`Joined "${plan.name}" 🙌`)
      router.push(`/plans/${plan.id}`)
    } catch (e) {
      showToast(e.message || 'Something went wrong')
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10"
        style={{ background: c.bg }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: c.bgCard }}>
          <ArrowLeft size={18} style={{ color: c.text }} />
        </button>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: c.textFaint }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search plans…"
            className="w-full pl-9 pr-4 py-2.5 rounded-full text-[14px] focus:outline-none"
            style={{
              background: c.bgCard,
              color: c.text,
              border: `1px solid ${c.border}`,
            }} />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} style={{ color: c.textFaint }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scroll-hide flex-shrink-0">
        {FILTERS.map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap flex-shrink-0"
            style={{
              background:  filter === k ? '#5B4FCF' : c.bgCard,
              color:       filter === k ? 'white'   : c.textMuted,
              border:      `1px solid ${filter === k ? '#5B4FCF' : c.border}`,
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Guest nudge */}
      {!authUser && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-[14px] flex items-center gap-2"
          style={{ background: '#EDE9FF' }}>
          <span style={{ fontSize: 16 }}>👀</span>
          <p className="text-[12px] flex-1" style={{ color: '#5B4FCF' }}>
            You can browse freely. <span className="font-bold">Join a plan</span> to track progress.
          </p>
        </div>
      )}

      {/* Offline */}
      {offline && !loading && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-[14px] flex items-center gap-2"
          style={{ background: '#FFF3DC', border: '1px solid #F5D78A' }}>
          <WifiOff size={16} style={{ color: '#E8A838', flexShrink: 0 }} />
          <p className="text-[13px]" style={{ color: '#7A4A00' }}>
            Can't reach the server. Check your connection.
          </p>
          <button onClick={() => load(true)}
            className="ml-auto text-[12px] font-bold" style={{ color: '#E8A838' }}>
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 flex flex-col gap-3">

        {loading && plans.length === 0 && <Skeleton c={c} />}

        {!loading && plans.length === 0 && !offline && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span style={{ fontSize: 40 }}>🔍</span>
            <p className="font-bold text-[16px]" style={{ color: c.text }}>No plans found</p>
            <p className="text-[13px]" style={{ color: c.textMuted }}>
              {search
                ? `No results for "${search}" — try different keywords`
                : 'No public plans yet. Create one and make it public!'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold"
                style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
                Clear search
              </button>
            )}
          </div>
        )}

        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan}
            onJoin={handleJoin} joining={joining} c={c} router={router} />
        ))}

        {/* Load more */}
        {hasMore && plans.length > 0 && (
          <button onClick={() => load(false, search, filter, page)} disabled={loading}
            className="w-full py-3.5 rounded-full font-semibold text-[13px] flex items-center justify-center gap-2"
            style={{ background: c.bgCard, border: `1px solid ${c.border}`, color: c.textMuted }}>
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Loading…</>
              : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}