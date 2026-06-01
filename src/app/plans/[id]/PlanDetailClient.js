'use client'

// ── src/app/plans/[id]/PlanDetailClient.js ──
// KEY CHANGES:
// 1. Daily check-in panel — real-time, who has read today
// 2. Reflection prompt after Done — Skip is as prominent as Post
// 3. No reflection counts anywhere on this page
// 4. Leave / Delete menu

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, CheckCircle2, Users,
  Share2, Bell, Copy, Loader2, Play,
  MessageSquare, MoreVertical, Trash2, LogOut, Send,
} from 'lucide-react'
import { useTheme }   from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  getPlanById, getPlanDays, getPlanMembers,
  markDayComplete, getMyCompletions, getDayCompletionCount,
  getDayCheckinStatus, subscribeToDayCheckins,
  sendPlanNudge, joinPlan, leavePlan, notifyReadComplete,
  postReflection,
} from '../../../lib/supabase/plans'
import { getAuthUser }  from '../../../lib/supabase/communities'
import { PlanProgress } from '../../../components/GraceProgress'
import { createClient } from '../../../lib/supabase/client'

function todayStr() { return new Date().toISOString().split('T')[0] }

function Avatar({ name, avatar, size=32 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
  return <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.38)}}>{ini}</div>
}

function buildReaderUrl(passage, planId, dayNum) {
  if (!passage) return '/read'
  const m = passage.match(/^(.+?)\s+(\d+)/)
  const base = m
    ? `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
    : `/read?book=${encodeURIComponent(passage)}`
  return `${base}&planId=${planId}&day=${dayNum}`
}

// ─────────────────────────────────────────────
//  Three-dot menu
// ─────────────────────────────────────────────
function PlanMenu({ isCreator, onLeave, onDelete, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', fn)
    document.addEventListener('touchstart', fn)
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('touchstart', fn) }
  }, [onClose])
  return (
    <div ref={ref}
      className="absolute right-0 top-10 z-50 bg-white rounded-[16px] overflow-hidden min-w-[180px]"
      style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.14)', border:'1px solid rgba(0,0,0,0.08)' }}>
      {!isCreator && (
        <button onClick={onLeave}
          className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left text-[14px] font-semibold active:bg-gray-50"
          style={{ color:'#374151' }}>
          <LogOut size={15} className="text-gray-400"/> Leave plan
        </button>
      )}
      {isCreator && (
        <button onClick={onDelete}
          className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left text-[14px] font-semibold active:bg-red-50"
          style={{ color:'#EF4444' }}>
          <Trash2 size={15}/> Delete plan
        </button>
      )}
      <button onClick={onClose}
        className="flex items-center w-full px-4 py-3 text-left text-[13px] border-t active:bg-gray-50"
        style={{ color:'#9CA3AF', borderColor:'#F3F4F6' }}>
        Cancel
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Daily check-in panel — who has read today
//  Real-time: updates as members check in
// ─────────────────────────────────────────────
function DailyCheckinPanel({ planId, dayNumber, planName, authUserId, memberCount, t }) {
  const [checkins, setCheckins] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!planId || !dayNumber) return
    setLoading(true)
    getDayCheckinStatus(planId, dayNumber)
      .then(data => { setCheckins(data); setLoading(false) })
      .catch(() => setLoading(false))

    // Real-time subscription
    const unsub = subscribeToDayCheckins(planId, dayNumber, ({ userId, name, avatar }) => {
      setCheckins(prev => prev.map(m =>
        m.userId === userId ? { ...m, hasCheckedIn: true } : m
      ))
    })
    return unsub
  }, [planId, dayNumber])

  if (loading || checkins.length === 0) return null

  const checkedIn   = checkins.filter(m => m.hasCheckedIn)
  const notYet      = checkins.filter(m => !m.hasCheckedIn)
  const allDone     = notYet.length === 0

  return (
    <div className="rounded-[18px] overflow-hidden"
      style={{ background:t.bgCard, boxShadow:t.shadow, border:`1px solid ${t.border}` }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom:`1px solid ${t.border}`, background:allDone?'#E8F5EE':'#F8F7FF' }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color:allDone?'#4A7C5F':'#5B4FCF' }}/>
          <p className="font-bold text-[13px]" style={{ color:allDone?'#4A7C5F':'#5B4FCF' }}>
            Day {dayNumber} · {checkedIn.length} of {checkins.length} checked in
          </p>
        </div>
        {allDone && <span className="text-[12px] font-bold" style={{ color:'#4A7C5F' }}>Everyone read today 🙌</span>}
      </div>

      {/* Member rows */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {checkins.map(member => (
          <div key={member.userId} className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <Avatar name={member.name} avatar={member.avatar} size={30}/>
              {/* Check indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                style={{ background: member.hasCheckedIn ? '#4A7C5F' : '#E5E7EB' }}>
                {member.hasCheckedIn && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <p className="text-[13px] font-semibold flex-1 truncate"
              style={{ color: member.hasCheckedIn ? t.text : t.textMuted }}>
              {member.name}
              {member.userId === authUserId && (
                <span className="ml-1 text-[11px] font-bold" style={{ color:'#5B4FCF' }}>You</span>
              )}
            </p>
            {member.hasCheckedIn ? (
              <span className="text-[11px] font-bold" style={{ color:'#4A7C5F' }}>✓ Read</span>
            ) : (
              <span className="text-[11px]" style={{ color:t.textFaint }}>—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Reflection prompt — optional, Skip equally prominent
// ─────────────────────────────────────────────
function ReflectionPrompt({ planId, dayNumber, onSkip, onPosted, t }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  async function handlePost() {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      await postReflection(planId, dayNumber, content.trim())
      onPosted()
    } catch { showToast('Something went wrong') }
    finally { setSending(false) }
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="rounded-[18px] p-4 flex flex-col gap-3"
      style={{ background:t.bgCard, boxShadow:t.shadow, border:'1.5px solid #5B4FCF15' }}>
      <div>
        <p className="font-bold text-[15px]" style={{ color:t.text }}>
          What stood out to you today?
        </p>
        <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>
          Optional — share only if you'd like to.
        </p>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, 280))}
        onKeyDown={e => e.key === 'Enter' && e.metaKey && handlePost()}
        placeholder="Share what God spoke to you through this passage…"
        rows={3}
        autoFocus
        className="w-full rounded-[12px] px-3.5 py-3 text-[14px] resize-none focus:outline-none"
        style={{ background:t.bgMuted, color:t.text, border:`1.5px solid ${content?'#5B4FCF':t.border}` }}/>

      {content.length > 200 && (
        <p className="text-right text-[11px]" style={{ color: content.length>260?'#E84060':t.textFaint }}>
          {280 - content.length}
        </p>
      )}

      {/* Skip and Post given equal weight */}
      <div className="flex gap-2">
        <button onClick={onSkip}
          className="flex-1 py-3 rounded-full font-bold text-[14px] border-2 active:scale-[0.97] transition-all"
          style={{ borderColor:t.border, color:t.textMuted, background:t.bgMuted }}>
          Skip for now
        </button>
        <button onClick={handlePost} disabled={!content.trim() || sending}
          className="flex-1 py-3 rounded-full font-bold text-[14px] text-white disabled:opacity-35 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {sending ? <><Loader2 size={14} className="animate-spin"/> Posting…</> : <>Post <Send size={13}/></>}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Grace card when behind
// ─────────────────────────────────────────────
function BehindCard({ daysBehind, onCatchUp, onContinue, t }) {
  return (
    <div className="rounded-[18px] p-5" style={{ background:t.bgCard, boxShadow:t.shadow, border:'1.5px solid #5B4FCF20' }}>
      <p className="font-display font-bold text-[17px] mb-2" style={{ color:t.text }}>
        {daysBehind===1 ? "You missed yesterday — that's okay." : `You're ${daysBehind} days behind — grace is still here.`}
      </p>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color:t.textMuted }}>
        "His mercies are new every morning." — Lamentations 3:23
      </p>
      <div className="flex gap-2">
        <button onClick={onCatchUp} className="flex-1 py-3 rounded-full font-bold text-[13px] border-2"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>Catch up</button>
        <button onClick={onContinue} className="flex-1 py-3 rounded-full font-bold text-[13px] text-white"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>Continue from today</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function PlanDetailClient({ planId }) {
  const router = useRouter()
  const { t }  = useTheme()

  const [plan,           setPlan]           = useState(null)
  const [days,           setDays]           = useState([])
  const [members,        setMembers]        = useState([])
  const [completions,    setCompletions]    = useState(new Set())
  const [authUser,       setAuthUser]       = useState(null)
  const [myMembership,   setMyMembership]   = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [marking,        setMarking]        = useState(false)
  const [nudging,        setNudging]        = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [tab,            setTab]            = useState('reading')
  const [showPrompt,     setShowPrompt]     = useState(false)  // reflection prompt
  const [justCompleted,  setJustCompleted]  = useState(false)
  const [completedDayNum,setCompletedDayNum]= useState(null)

  const load = useCallback(async () => {
    const [p, d, m, user] = await Promise.all([
      getPlanById(planId), getPlanDays(planId), getPlanMembers(planId), getAuthUser(),
    ])
    setPlan(p); setDays(d); setMembers(m); setAuthUser(user)
    if (user && p) {
      const comps = await getMyCompletions(planId)
      setCompletions(comps)
      const mine = m.find(mem => mem.userId === user.id)
      setMyMembership(mine || null)
    }
    setLoading(false)
  }, [planId])

  useEffect(() => { load() }, [load])

  const isCreator   = authUser?.id === plan?.creatorId
  const isMember    = !!myMembership
  const currentDay  = myMembership?.currentDay || 1
  const todayDone   = completions.has(currentDay)
  const todayDayObj = days.find(d => d.day_number === currentDay)
  const total       = plan?.durationDays || 1
  const isCompleted = myMembership?.status === 'completed'
  const today       = todayStr()
  const daysBehind  = (() => {
    const sd = todayDayObj?.scheduled_date
    if (!sd || sd >= today) return 0
    return Math.round((new Date(today) - new Date(sd)) / 86400000)
  })()

  async function handleMarkComplete() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      await markDayComplete(planId, currentDay)
      const next = new Set([...completions, currentDay])
      setCompletions(next)
      if (plan && authUser) {
        notifyReadComplete(planId, plan.name, authUser.name||'Someone', currentDay).catch(()=>null)
      }
      showToast('Day complete! 🙌')
      setMyMembership(prev => prev
        ? { ...prev, currentDay: Math.min(currentDay+1, total) }
        : prev
      )
      setJustCompleted(true)
      setCompletedDayNum(currentDay)

      // If final day — route to completion screen after brief delay
      if (currentDay >= total) {
        setTimeout(() => router.push(`/plans/complete?planId=${planId}`), 1000)
        return
      }

      // Show reflection prompt (optional)
      setShowPrompt(true)
    } catch (e) {
      if (e.message === 'not_authenticated') router.push('/auth')
      else showToast('Something went wrong')
    } finally { setMarking(false) }
  }

  async function handleLeave() {
    setMenuOpen(false)
    if (!confirm('Leave this plan? You can rejoin at any time.')) return
    try { await leavePlan(planId); showToast('You have left the plan'); router.push('/plans') }
    catch { showToast('Something went wrong') }
  }

  async function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`Delete "${plan?.name}"? This removes the plan for all members and cannot be undone.`)) return
    try {
      const sb = createClient()
      if (sb) await sb.from('shared_plans').delete().eq('id', planId)
      showToast('Plan deleted'); router.push('/plans')
    } catch { showToast('Something went wrong') }
  }

  async function handleJoin(fromDay=1) {
    if (!authUser) { router.push('/auth?next=/plans/'+planId); return }
    await joinPlan(planId, { fromDay })
    load(); showToast('Joined! 🙌')
  }

  async function handleNudge() {
    if (!isCreator || nudging) return
    setNudging(true)
    try { await sendPlanNudge(planId, authUser.name||'The creator', plan.name); showToast('Nudge sent 🙏') }
    catch { showToast('Send failed') }
    finally { setNudging(false) }
  }

  async function shareInvite() {
    if (!plan?.inviteCode) return
    const url = `${window.location.origin}/plan/join/${plan.inviteCode}`
    if (navigator.share) navigator.share({ title:plan.name, url }).catch(()=>null)
    else { await navigator.clipboard.writeText(url); showToast('Invite link copied!') }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:t.bg}}>
      <Loader2 size={24} className="animate-spin" style={{color:'#5B4FCF'}}/>
    </div>
  )

  if (!plan) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{background:t.bg}}>
      <p className="font-bold text-[18px]" style={{color:t.text}}>Plan not found</p>
      <button onClick={() => router.push('/plans')} className="px-5 py-2.5 rounded-full text-white font-bold" style={{background:'#5B4FCF'}}>Back</button>
    </div>
  )

  const TABS = [{k:'reading',l:'Reading'},{k:'group',l:`Group (${members.length})`}]
  const isGroupPlan = plan.memberCount > 1 || plan.visibility !== 'private'

  return (
    <div className="flex flex-col min-h-screen" style={{background:t.bg}}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{background:t.bgCard, boxShadow:t.shadow}}>
          <ArrowLeft size={18} style={{color:t.text}}/>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] truncate" style={{color:t.text}}>{plan.name}</h1>
          <p className="text-[12px]" style={{color:t.textFaint}}>
            {plan.memberCount} member{plan.memberCount!==1?'s':''} · Day {currentDay} of {total}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={shareInvite}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{background:t.bgCard, boxShadow:t.shadow}}>
            <Share2 size={15} style={{color:'#5B4FCF'}}/>
          </button>
          {isMember && (
            <div className="relative">
              <button onClick={() => setMenuOpen(v=>!v)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{background:t.bgCard, boxShadow:t.shadow}}>
                <MoreVertical size={16} style={{color:t.textMuted}}/>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                    exit={{opacity:0,scale:0.95}} transition={{duration:0.12}}>
                    <PlanMenu isCreator={isCreator} onLeave={handleLeave} onDelete={handleDelete}
                      onClose={() => setMenuOpen(false)}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex gap-0.5 p-1 rounded-full" style={{background:t.bgMuted}}>
          {TABS.map(tb => (
            <button key={tb.k} onClick={() => setTab(tb.k)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold min-h-[36px]"
              style={tab===tb.k?{color:'#5B4FCF'}:{color:t.textMuted}}>
              {tab===tb.k && (
                <motion.div layoutId="plan-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{type:'spring',stiffness:400,damping:35}}/>
              )}
              <span className="relative z-10">{tb.l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {/* ── READING TAB ── */}
          {tab === 'reading' && (
            <motion.div key="reading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-4">

              {/* Grace card if behind */}
              {!isCompleted && isMember && daysBehind > 0 && (
                <BehindCard daysBehind={daysBehind}
                  onCatchUp={() => router.push(`/plans/${planId}`)}
                  onContinue={() => setMyMembership(prev => prev?{...prev,currentDay}:prev)}
                  t={t}/>
              )}

              {/* Today's reading */}
              {!isCompleted && isMember && todayDayObj && (
                <div className="rounded-[20px] overflow-hidden"
                  style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)',
                          boxShadow:'0 8px 24px rgba(91,79,207,0.35)'}}>
                  <button onClick={() => router.push(buildReaderUrl(todayDayObj.passage_reference, planId, currentDay))}
                    className="w-full text-left px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={14} className="text-white/70"/>
                      <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                        Day {currentDay} of {total}
                      </span>
                    </div>
                    <p className="font-display font-bold text-[22px] text-white leading-tight">
                      {todayDayObj.passage_reference}
                    </p>
                    {todayDayObj.title && todayDayObj.title!==todayDayObj.passage_reference && (
                      <p className="text-[13px] text-white/65 mt-1">{todayDayObj.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-full"
                      style={{background:'rgba(255,255,255,0.18)'}}>
                      <Play size={13} className="text-white" fill="white"/>
                      <span className="font-bold text-[14px] text-white">
                        {todayDone?'Read again →':'Read now →'}
                      </span>
                    </div>
                  </button>
                  <div className="px-5 pb-5">
                    {!todayDone ? (
                      <button onClick={handleMarkComplete} disabled={marking}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] active:scale-[0.97]"
                        style={{background:'rgba(255,255,255,0.95)',color:'#5B4FCF'}}>
                        {marking?<><Loader2 size={14} className="animate-spin"/>Marking…</>:<><CheckCircle2 size={15}/>Mark as Done</>}
                      </button>
                    ) : (
                      <button onClick={() => router.push(`/plans/${planId}/reflections?day=${currentDay}`)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px]"
                        style={{background:'rgba(255,255,255,0.15)'}}>
                        <MessageSquare size={14} className="text-white"/>
                        <span className="text-white">View today's reflections →</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Reflection prompt — appears after Done, equally weighted Skip/Post */}
              <AnimatePresence>
                {showPrompt && completedDayNum && (
                  <ReflectionPrompt
                    planId={planId}
                    dayNumber={completedDayNum}
                    onSkip={() => setShowPrompt(false)}
                    onPosted={() => {
                      setShowPrompt(false)
                      showToast('Reflection shared 🙏')
                    }}
                    t={t}
                  />
                )}
              </AnimatePresence>

              {/* Daily check-in panel — only for group/shared plans */}
              {isGroupPlan && isMember && (
                <DailyCheckinPanel
                  planId={planId}
                  dayNumber={currentDay}
                  planName={plan.name}
                  authUserId={authUser?.id}
                  memberCount={plan.memberCount}
                  t={t}
                />
              )}

              {/* Completion banner */}
              {isCompleted && (
                <div className="rounded-[20px] p-5 text-center"
                  style={{background:'linear-gradient(135deg,#4A7C5F,#2D5A40)'}}>
                  <p className="font-display font-bold text-[20px] text-white">🎉 You finished "{plan.name}"</p>
                  <p className="text-[13px] text-white/80 mt-2">Well done, faithful one. — Matthew 25:21</p>
                  <button onClick={() => router.push(`/plans/complete?planId=${planId}`)}
                    className="mt-4 px-5 py-2.5 rounded-full text-white font-bold text-[13px]"
                    style={{background:'rgba(255,255,255,0.2)'}}>
                    See completion →
                  </button>
                </div>
              )}

              {/* Join prompt */}
              {!isMember && (
                <div className="rounded-[20px] p-5 text-center flex flex-col items-center gap-3"
                  style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <BookOpen size={28} style={{color:'#5B4FCF'}}/>
                  <p className="font-bold text-[16px]" style={{color:t.text}}>Join this plan</p>
                  <p className="text-[13px] leading-relaxed" style={{color:t.textMuted}}>
                    {plan.description || `Read with ${plan.memberCount} others.`}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleJoin(1)}
                      className="flex-1 py-3 rounded-full font-bold text-[13px] border-2"
                      style={{borderColor:'#5B4FCF',color:'#5B4FCF'}}>From Day 1</button>
                    <button onClick={() => handleJoin(currentDay)}
                      className="flex-1 py-3 rounded-full font-bold text-[13px] text-white"
                      style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>Join from today</button>
                  </div>
                </div>
              )}

              {/* Progress */}
              {isMember && (
                <div className="rounded-[18px] p-4" style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <PlanProgress plan={{totalDays:total,currentDay,days:days.map(d=>({completedAt:completions.has(d.day_number)?'done':null}))}}/>
                </div>
              )}

              {/* Reflections access — always optional, never prompted */}
              {isMember && completions.size > 0 && (
                <button onClick={() => router.push(`/plans/${planId}/reflections`)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-[16px] text-left active:opacity-80"
                  style={{background:t.bgCard, border:'1.5px solid #5B4FCF20', boxShadow:t.shadow}}>
                  <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                    style={{background:'#EDE9FF'}}>
                    <MessageSquare size={19} style={{color:'#5B4FCF'}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px]" style={{color:'#5B4FCF'}}>Daily Reflections</p>
                    <p className="text-[12px] mt-0.5" style={{color:t.textMuted}}>
                      Read what your group has shared
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold flex-shrink-0" style={{color:'#5B4FCF'}}>→</span>
                </button>
              )}

              {/* Passage list */}
              <div>
                <p className="font-bold text-[14px] mb-2" style={{color:t.text}}>All passages</p>
                <div className="flex flex-col gap-1.5">
                  {days.map(d => {
                    const done   = completions.has(d.day_number)
                    const isCurr = d.day_number === currentDay
                    return (
                      <div key={d.day_number}
                        className="flex items-center gap-3 px-4 py-3 rounded-[13px]"
                        style={{background:isCurr?'#EDE9FF':t.bgCard, border:`1.5px solid ${isCurr?'#5B4FCF30':t.border}`}}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{background:done?'#4A7C5F':isCurr?'#5B4FCF':t.bgMuted}}>
                          {done
                            ? <CheckCircle2 size={13} className="text-white"/>
                            : <span className="text-[10px] font-bold" style={{color:isCurr?'white':t.textFaint}}>{d.day_number}</span>
                          }
                        </div>
                        <p className="font-semibold text-[13px] flex-1 truncate"
                          style={{color:isCurr?'#5B4FCF':t.text}}>
                          {d.passage_reference}
                        </p>
                        <button onClick={() => router.push(buildReaderUrl(d.passage_reference, planId, d.day_number))}
                          className="text-[11px] font-bold flex-shrink-0 px-2.5 py-1 rounded-full"
                          style={{background:isCurr?'#5B4FCF':'transparent', color:isCurr?'white':'#5B4FCF'}}>
                          {isCurr?'Read':'Open'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Creator controls */}
              {isCreator && (
                <div className="rounded-[18px] p-4 flex flex-col gap-3"
                  style={{background:t.bgCard, boxShadow:t.shadow, border:'1.5px solid #5B4FCF20'}}>
                  <div className="flex gap-2">
                    <button onClick={handleNudge} disabled={nudging}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[13px] border-2"
                      style={{borderColor:'#5B4FCF',color:'#5B4FCF'}}>
                      {nudging?<Loader2 size={13} className="animate-spin"/>:<><Bell size={13}/>Nudge</>}
                    </button>
                    <button onClick={shareInvite}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[13px]"
                      style={{background:'#EDE9FF',color:'#5B4FCF'}}>
                      <Copy size={13}/>Invite
                    </button>
                  </div>
                  {plan.inviteCode && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-[11px]"
                      style={{background:'#EDE9FF'}}>
                      <span className="text-[12px] font-semibold" style={{color:'#7C6FCD'}}>Code</span>
                      <span className="font-bold text-[17px] tracking-widest" style={{color:'#5B4FCF'}}>{plan.inviteCode}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── GROUP TAB ── */}
          {tab === 'group' && (
            <motion.div key="group" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-4">
              <div className="rounded-[18px] p-4" style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
                <p className="font-bold text-[16px] text-white">Day {currentDay} of {total}</p>
                <p className="text-[13px] text-white/70 mt-0.5">
                  {currentDay/total>=0.5?'More than halfway 🙌':`${total-currentDay} days to go`}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white"
                    style={{width:`${Math.min(100,Math.round(((currentDay-1)/total)*100))}%`,transition:'width 0.6s ease'}}/>
                </div>
              </div>

              {/* Full check-in panel in group tab */}
              <DailyCheckinPanel
                planId={planId}
                dayNumber={currentDay}
                planName={plan.name}
                authUserId={authUser?.id}
                memberCount={plan.memberCount}
                t={t}
              />

              {members.map(member => (
                <div key={member.userId} className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                  style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <Avatar name={member.name} avatar={member.avatar} size={36}/>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate" style={{color:t.text}}>
                      {member.name}
                      {member.userId===authUser?.id&&<span className="ml-1.5 text-[11px]" style={{color:'#5B4FCF'}}>You</span>}
                    </p>
                    <p className="text-[12px]" style={{color:t.textMuted}}>
                      {member.status==='completed'?'🎉 Finished!':member.currentDay===0?'Waiting to begin':`Day ${member.currentDay} of ${total}`}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}