'use client'

// ── src/app/plans/discover/page.js ──
// Discover public reading plans. Search, filter, preview, join.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, X, Users, BookOpen, Loader2, ArrowLeft } from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import { getPublicPlans, joinPlan } from '../../../lib/supabase/plans'
import { getAuthUser } from '../../../lib/supabase/communities'

const FILTERS = [
  { k:'recent',       l:'Latest'       },
  { k:'most_members', l:'Most popular' },
  { k:'shortest',     l:'Shortest'     },
  { k:'longest',      l:'Longest'      },
]

function PlanCard({ plan, onJoin, joining }) {
  const { t }   = useTheme()
  const router  = useRouter()
  const pct     = Math.min(100, Math.round(((plan.currentDay || 1) / plan.durationDays) * 100))

  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className="rounded-[18px] overflow-hidden" style={{ background:t.bgCard, boxShadow:t.shadow }}>
      {/* Mini hero */}
      <button onClick={() => router.push(`/plans/${plan.id}`)} className="w-full text-left">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
              📖
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] truncate" style={{ color:t.text }}>{plan.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[12px]" style={{ color:t.textMuted }}>{plan.durationDays} days</span>
                <span style={{ color:t.textFaint }}>·</span>
                <div className="flex items-center gap-1">
                  <Users size={11} style={{ color:t.textFaint }}/>
                  <span className="text-[12px]" style={{ color:t.textFaint }}>{plan.memberCount}</span>
                </div>
                <span style={{ color:t.textFaint }}>·</span>
                <span className="text-[12px]" style={{ color:t.textFaint }}>by {plan.creatorName}</span>
              </div>
            </div>
          </div>
          {plan.description && (
            <p className="text-[13px] leading-relaxed mt-2 line-clamp-2" style={{ color:t.textMuted }}>
              {plan.description}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between px-4 pb-4 gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:t.bgMuted }}>
          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:'#5B4FCF' }}/>
        </div>
        <button onClick={() => onJoin(plan)} disabled={joining === plan.id}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-[13px] text-white flex-shrink-0 active:scale-95 transition-all"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {joining === plan.id ? <Loader2 size={13} className="animate-spin"/> : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

export default function DiscoverPage() {
  const router  = useRouter()
  const { t }   = useTheme()

  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('recent')
  const [joining, setJoining] = useState(null)
  const [authUser, setAuthUser] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const p = await getPublicPlans({ search: search || undefined, filter, limit: 40 })
    setPlans(p)
    setLoading(false)
  }, [search, filter])

  useEffect(() => { getAuthUser().then(setAuthUser) }, [])
  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [load])

  async function handleJoin(plan) {
    if (!authUser) { router.push('/auth?next=/plans/discover'); return }
    if (joining) return
    setJoining(plan.id)
    try {
      await joinPlan(plan.id)
      showToast(`Joined "${plan.name}" 🙌`)
      router.push(`/plans/${plan.id}`)
    } catch (e) {
      showToast('Something went wrong')
    } finally { setJoining(null) }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>

      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/plans')}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background:t.bgCard, boxShadow:t.shadow }}>
            <ArrowLeft size={18} style={{ color:t.text }}/>
          </button>
          <div>
            <h1 className="font-display font-bold text-[24px]" style={{ color:t.text }}>Discover Plans</h1>
            <p className="text-[13px]" style={{ color:t.textMuted }}>Find a group reading plan to join</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color:t.textMuted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or book…"
            className="w-full rounded-full pl-9 pr-9 text-[14px] focus:outline-none"
            style={{ background:t.bgCard, color:t.text, border:`1.5px solid ${t.border}`, height:44, boxShadow:t.shadow }}/>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background:t.bgMuted }}>
              <X size={11} style={{ color:t.textMuted }}/>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-hide">
          {FILTERS.map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
              style={filter===f.k
                ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                : { background:t.bgCard, borderColor:t.border, color:t.textMuted }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-purple"/>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <span style={{ fontSize:36 }}>🔍</span>
            <p className="font-bold text-[16px]" style={{ color:t.text }}>
              {search ? 'No plans found' : 'No public plans yet'}
            </p>
            <p className="text-[13px]" style={{ color:t.textMuted }}>
              {search ? 'Try a different search term.' : 'Be the first to create a public reading plan!'}
            </p>
            <button onClick={() => router.push('/plans/create')}
              className="mt-2 px-5 py-2.5 rounded-full text-white font-bold text-[13px]"
              style={{ background:'#5B4FCF' }}>
              Create a plan
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onJoin={handleJoin} joining={joining}/>
          ))
        )}
      </div>
    </div>
  )
}