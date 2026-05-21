'use client'

// ── src/app/plans/page.js ──
// YouVersion-quality plans hub.
// Section order: Active plans → Join with code → Create (3 modes) → Templates → Public plans
// Templates: name + icon cards only — no descriptions cluttering the list.
// All templates flow into the same mode selection step.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Layers, Users, Plus, ChevronRight,
  Search, Hash, Loader2, CheckCircle2, X, ArrowRight,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { ToastContainer, showToast } from '../../components/Toast'
import { getMyPlans, getPublicPlans, joinPlan, markDayComplete } from '../../lib/supabase/plans'
import { PLAN_TEMPLATES } from '../../lib/reading-data'
import { createClient } from '../../lib/supabase/client'

function todayStr() { return new Date().toISOString().split('T')[0] }

// ─────────────────────────────────────────────
//  Active plan card — YouVersion style
// ─────────────────────────────────────────────
function ActivePlanCard({ plan, onMarkDone }) {
  const router = useRouter()
  const { t }  = useTheme()
  const pct    = Math.min(100, Math.round(((plan.currentDay - 1) / plan.durationDays) * 100))
  const [todayDone, setTodayDone] = useState(false)
  const [marking,   setMarking]   = useState(false)
  const [readCount, setReadCount] = useState(0)

  useEffect(() => {
    const sb = createClient()
    if (!sb) return
    sb.auth.getUser().then(({ data:{ user } }) => {
      if (!user) return
      sb.from('daily_completions').select('id', { count:'exact', head:true })
        .eq('plan_id', plan.id).eq('user_id', user.id).eq('day_number', plan.currentDay)
        .then(({ count }) => setTodayDone((count||0) > 0))
      if (plan.memberCount > 1) {
        sb.from('daily_completions').select('id', { count:'exact', head:true })
          .eq('plan_id', plan.id).eq('day_number', plan.currentDay)
          .then(({ count }) => setReadCount(count||0))
      }
    })
  }, [plan.id, plan.currentDay])

  async function handleDone(e) {
    e.stopPropagation()
    if (todayDone || marking) return
    setMarking(true)
    try {
      await markDayComplete(plan.id, plan.currentDay)
      setTodayDone(true)
      setReadCount(n => n + 1)
      showToast('Day complete! 🙌')
      onMarkDone?.()
    } catch { showToast('Something went wrong') }
    finally { setMarking(false) }
  }

  return (
    <div className="rounded-[18px] overflow-hidden"
      style={{ background:t.bgCard, boxShadow:t.shadow, border:`1px solid ${t.border}` }}>

      {/* Plan header row */}
      <button onClick={() => router.push(`/plans/${plan.id}`)}
        className="w-full text-left px-4 pt-4 pb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] flex-shrink-0"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          📖
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate" style={{ color:t.text }}>{plan.name}</p>
          <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>
            Day {plan.currentDay} of {plan.durationDays}
            {plan.memberCount > 1 && readCount > 0 && ` · ${readCount} read today`}
          </p>
        </div>
        <span className="text-[12px] font-bold flex-shrink-0" style={{ color:'#5B4FCF' }}>
          {pct}%
        </span>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:t.bgMuted }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:'#5B4FCF' }}/>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button onClick={() => router.push(`/plans/${plan.id}`)}
          className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-[12px] active:opacity-80 transition-opacity"
          style={{ background:todayDone?'#E8F5EE':t.bgMuted }}>
          <BookOpen size={14} style={{ color:todayDone?'#4A7C5F':'#5B4FCF', flexShrink:0 }}/>
          <span className="font-semibold text-[13px] truncate"
            style={{ color:todayDone?'#4A7C5F':t.text }}>
            {todayDone ? '✓ Read today' : "Today's reading"}
          </span>
        </button>
        {!todayDone && (
          <button onClick={handleDone} disabled={marking}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] font-bold text-[12px] flex-shrink-0 active:scale-95 transition-all"
            style={{ background:'#4A7C5F', color:'white' }}>
            {marking ? <Loader2 size={12} className="animate-spin"/> : <><CheckCircle2 size={12}/> Done</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Join with code sheet
// ─────────────────────────────────────────────
function JoinSheet({ onClose, t }) {
  const router   = useRouter()
  const [code,   setCode]    = useState('')
  const [loading,setLoading] = useState(false)

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    try {
      const { getPlanByInviteCode, joinPlan: join } = await import('../../lib/supabase/plans')
      const plan = await getPlanByInviteCode(trimmed)
      if (!plan) { showToast('Plan not found — check the code'); setLoading(false); return }
      await join(plan.id)
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
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70]"
        style={{ background:t.bgCard, paddingBottom:'max(2rem,env(safe-area-inset-bottom))' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:360, damping:38 }}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full" style={{ background:t.border }}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor:t.border }}>
          <p className="font-bold text-[17px]" style={{ color:t.text }}>Join with invite code</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:t.bgMuted }}>
            <X size={14} style={{ color:t.textMuted }}/>
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-[13px]" style={{ color:t.textMuted }}>
            Enter the invite code your friend shared with you.
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. ROM-4X9K"
            autoFocus
            autoCapitalize="characters"
            className="w-full rounded-[14px] px-5 py-4 text-[22px] font-bold text-center tracking-[0.15em] focus:outline-none"
            style={{ background:t.bgMuted, color:t.text, border:`2px solid ${code?'#5B4FCF':t.border}` }}
          />
          <button onClick={handleJoin} disabled={!code.trim() || loading}
            className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {loading ? <><Loader2 size={17} className="animate-spin"/> Finding plan…</> : 'Join Plan →'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Public plan card
// ─────────────────────────────────────────────
function PublicPlanCard({ plan, onJoin, joining, t }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(`/plans/${plan.id}`)}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-[16px] text-left active:opacity-80 transition-opacity"
      style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0"
        style={{ background:'linear-gradient(135deg,#5B4FCF22,#3D319011)' }}>
        📖
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color:t.text }}>{plan.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>
          {plan.durationDays} days · {plan.memberCount} member{plan.memberCount !== 1 ? 's' : ''}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onJoin(plan) }}
        disabled={joining === plan.id}
        className="flex-shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold text-white active:scale-95 transition-all"
        style={{ background:'#5B4FCF' }}>
        {joining === plan.id ? <Loader2 size={12} className="animate-spin"/> : 'Join'}
      </button>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function PlansPage() {
  const router  = useRouter()
  const { t }   = useTheme()

  const [mounted,       setMounted]       = useState(false)
  const [authUser,      setAuthUser]      = useState(null)
  const [myPlans,       setMyPlans]       = useState([])
  const [publicPlans,   setPublicPlans]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [publicLoading, setPublicLoading] = useState(true)
  const [joiningId,     setJoiningId]     = useState(null)
  const [showJoin,      setShowJoin]      = useState(false)

  useEffect(() => {
    setMounted(true)
    const sb = createClient()
    if (!sb) { setLoading(false); return }
    sb.auth.getUser()
      .then(({ data:{ user } }) => {
        setAuthUser(user || null)
        if (user) {
          getMyPlans()
            .then(p => { setMyPlans(p || []); setLoading(false) })
            .catch(() => setLoading(false))
        } else { setLoading(false) }
      })
      .catch(() => setLoading(false))

    getPublicPlans({ limit:6 })
      .then(p => { setPublicPlans(p || []); setPublicLoading(false) })
      .catch(() => setPublicLoading(false))
  }, [])

  async function handleJoinPublic(plan) {
    if (!authUser) { router.push('/auth?next=/plans'); return }
    if (joiningId) return
    setJoiningId(plan.id)
    try {
      await joinPlan(plan.id)
      showToast(`Joined "${plan.name}" 🙌`)
      router.push(`/plans/${plan.id}`)
    } catch { showToast('Something went wrong') }
    finally { setJoiningId(null) }
  }

  const activePlans    = myPlans.filter(p => p.memberStatus === 'active')
  const completedPlans = myPlans.filter(p => p.memberStatus === 'completed')

  if (!mounted) return null

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>

      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-[26px]" style={{ color:t.text }}>Plans</h1>
        <button onClick={() => router.push('/plans/create')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px] active:scale-95 transition-all"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Plus size={14}/> New plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── 1. Active Plans ── */}
        <div className="px-4 mb-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin" style={{ color:'#5B4FCF' }}/>
            </div>
          ) : activePlans.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color:t.textFaint }}>
                Active
              </p>
              {activePlans.map(plan => (
                <ActivePlanCard key={plan.id} plan={plan}
                  onMarkDone={() => setMyPlans(p => [...p])}/>
              ))}
            </div>
          ) : authUser ? (
            <div className="rounded-[18px] p-6 text-center flex flex-col items-center gap-3"
              style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
              <span style={{ fontSize:36 }}>📖</span>
              <p className="font-bold text-[17px]" style={{ color:t.text }}>No active plans</p>
              <p className="text-[13px] leading-relaxed" style={{ color:t.textMuted }}>
                Start a reading plan and build a daily habit in God's Word.
              </p>
              <button onClick={() => router.push('/plans/create')}
                className="mt-1 px-7 py-3 rounded-full text-white font-bold text-[14px]"
                style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                Create a plan
              </button>
            </div>
          ) : (
            <div className="rounded-[18px] p-5 text-center" style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
              <p className="font-bold text-[15px] mb-3" style={{ color:t.text }}>Sign in to track your plans</p>
              <button onClick={() => router.push('/auth?next=/plans')}
                className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
                style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                Sign in
              </button>
            </div>
          )}
        </div>

        {/* ── 2. Join with code — BEFORE create ── */}
        <div className="px-4 mb-6">
          <button onClick={() => setShowJoin(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[18px] active:opacity-80 transition-opacity"
            style={{ background:t.bgCard, border:`1.5px dashed ${t.border}` }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background:'#EDE9FF' }}>
              <Hash size={19} style={{ color:'#5B4FCF' }}/>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[14px]" style={{ color:t.text }}>Join with invite code</p>
              <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>Someone shared a code like ROM-4X9K</p>
            </div>
            <ArrowRight size={16} style={{ color:t.textFaint }}/>
          </button>
        </div>

        {/* ── 3. Create ── */}
        <div className="px-4 mb-6">
          <p className="font-bold text-[17px] mb-3" style={{ color:t.text }}>Start a new plan</p>
          <div className="flex flex-col gap-2.5">
            {[
              { mode:'book',      icon:BookOpen, color:'#5B4FCF', bg:'#EDE9FF',
                title:'Read by Book', desc:'Genesis, Romans, Psalms — any book' },
              { mode:'topic',     icon:Layers,   color:'#4A7C5F', bg:'#E8F5EE',
                title:'Read by Topic', desc:'Faith, Prayer, Forgiveness, Identity…' },
              { mode:'character', icon:Users,    color:'#E8A838', bg:'#FFF3DC',
                title:'Read by Character', desc:'David, Paul, Moses, Esther, Jesus…' },
            ].map(({ mode, icon:Icon, color, bg, title, desc }) => (
              <button key={mode} onClick={() => router.push(`/plans/create?mode=${mode}`)}
                className="flex items-center gap-3 px-4 py-4 rounded-[16px] text-left active:opacity-80 transition-opacity"
                style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ background:bg }}>
                  <Icon size={20} style={{ color }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px]" style={{ color:t.text }}>{title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>{desc}</p>
                </div>
                <ChevronRight size={15} style={{ color:t.textFaint, flexShrink:0 }}/>
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. Templates — names only, flow into creation ── */}
        <div className="px-4 mb-6">
          <p className="font-bold text-[17px] mb-1" style={{ color:t.text }}>Templates</p>
          <p className="text-[13px] mb-3" style={{ color:t.textMuted }}>
            Starting points — you still choose how you want to read
          </p>
          <div className="flex flex-col gap-2">
            {PLAN_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                // Templates route into create with template param — step 0 is skipped,
                // step 1 (name) is pre-filled, step 2 (mode) is NOT skipped so user
                // always picks Book/Topic/Character themselves.
                onClick={() => router.push(`/plans/create?template=${tpl.id}&pickMode=1`)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left active:opacity-80 transition-opacity"
                style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                  style={{ background:`${tpl.color}18` }}>
                  {tpl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] truncate" style={{ color:t.text }}>{tpl.name}</p>
                  <p className="text-[12px]" style={{ color:t.textMuted }}>{tpl.durationDays} days</p>
                </div>
                <ChevronRight size={14} style={{ color:t.textFaint, flexShrink:0 }}/>
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Public plans ── */}
        {(publicPlans.length > 0 || publicLoading) && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[17px]" style={{ color:t.text }}>Active public plans</p>
              <button onClick={() => router.push('/plans/discover')}
                className="text-[12px] font-semibold" style={{ color:'#5B4FCF' }}>
                See all →
              </button>
            </div>
            {publicLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin" style={{ color:'#5B4FCF' }}/>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {publicPlans.slice(0, 4).map(plan => (
                  <PublicPlanCard key={plan.id} plan={plan}
                    onJoin={handleJoinPublic} joining={joiningId} t={t}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {completedPlans.length > 0 && (
          <div className="px-4 mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color:t.textFaint }}>
              Completed
            </p>
            {completedPlans.map(plan => (
              <div key={plan.id} className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] mb-2"
                style={{ background:t.bgCard }}>
                <CheckCircle2 size={18} style={{ color:'#4A7C5F', flexShrink:0 }}/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] truncate" style={{ color:t.text }}>{plan.name}</p>
                  <p className="text-[12px]" style={{ color:t.textMuted }}>{plan.durationDays} days · Finished 🏆</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showJoin && <JoinSheet onClose={() => setShowJoin(false)} t={t}/>}
      </AnimatePresence>
    </div>
  )
}