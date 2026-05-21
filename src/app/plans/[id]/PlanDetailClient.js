'use client'

// ── src/app/plans/[id]/PlanDetailClient.js ──
// FIXES:
// 4. Mark as Done tracks the CURRENT day correctly, then immediately reveals
//    today's thread inline — no extra tap required.
// 5. Thread UX overhaul:
//    - After Done: "Today's Reflections" slides in with input pre-focused
//    - Past days: full browsable section below today's thread
//    - Each day labelled "Day N — Passage" so users always know what they're reading
//    - For group/community plans feels like a shared journal

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, CheckCircle2, Users,
  Share2, Bell, Copy, Loader2, Lock, Globe,
  Play, MessageSquare, Send, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTheme }         from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  getPlanById, getPlanDays, getPlanMembers,
  markDayComplete, getMyCompletions, getDayCompletionCount,
  sendPlanNudge, joinPlan, notifyReadComplete,
  getReflections, postReflection, deleteReflection, toggleAmenReflection,
} from '../../../lib/supabase/plans'
import { getAuthUser } from '../../../lib/supabase/communities'
import { PlanProgress }     from '../../../components/GraceProgress'
import ScriptureText        from '../../../components/ScriptureText'
import ScriptureSheet       from '../../../components/ScriptureSheet'

function todayStr() { return new Date().toISOString().split('T')[0] }

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return new Date(d).toLocaleDateString('en-US', {month:'short',day:'numeric'})
}

function Avatar({ name, avatar, size=34 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF','#E84060']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{width:size,height:size}}
      onError={e=>{e.currentTarget.style.display='none'}}/>
  )
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.38)}}>
      {ini}
    </div>
  )
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
//  Single reflection row
// ─────────────────────────────────────────────
function ReflectionRow({ r, currentUserId, onDelete, t }) {
  const [amened,   setAmened]   = useState(r.amened || false)
  const [scripture,setScripture]= useState(null)

  async function handleAmen() {
    try {
      const now = await toggleAmenReflection(r.id)
      setAmened(now)
    } catch { showToast('Sign in to respond') }
  }

  return (
    <>
      <div className="flex gap-3">
        <Avatar name={r.authorName} avatar={r.authorAvatar} size={32}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-[13px]" style={{color:t.text}}>{r.authorName}</p>
            <p className="text-[11px]" style={{color:t.textFaint}}>{timeAgo(r.createdAt)}</p>
            {r.isOwn && (
              <button onClick={() => onDelete(r.id)}
                className="ml-auto w-5 h-5 flex items-center justify-center"
                style={{color:t.textFaint}}>
                <Trash2 size={11}/>
              </button>
            )}
          </div>
          <p className="text-[14px] leading-[1.7]" style={{color:t.text}}>
            <ScriptureText content={r.content} onRefTap={ref => setScripture(ref)}/>
          </p>
          <button onClick={handleAmen}
            className="flex items-center gap-1 mt-1.5 transition-all active:scale-90"
            style={{color: amened ? '#5B4FCF' : t.textFaint}}>
            <span style={{fontSize:13}}>🙏</span>
            <span className="text-[11px] font-semibold">Amen</span>
          </button>
        </div>
      </div>
      {scripture && <ScriptureSheet reference={scripture} onClose={() => setScripture(null)}/>}
    </>
  )
}

// ─────────────────────────────────────────────
//  Thread panel — shown inline after completing a day
//  or browsing past days
// ─────────────────────────────────────────────
function ThreadPanel({ planId, dayNum, passage, authUser, isToday, t }) {
  const [reflections, setReflections] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [content,     setContent]     = useState('')
  const [sending,     setSending]     = useState(false)
  const inputRef  = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    getReflections(planId, dayNum)
      .then(r => { setReflections(r || []); setLoading(false) })
      .catch(() => setLoading(false))
    // Auto-focus input for today's thread
    if (isToday) setTimeout(() => inputRef.current?.focus(), 300)
  }, [planId, dayNum])

  async function handlePost() {
    if (!content.trim() || sending) return
    if (!authUser) { showToast('Sign in to share a reflection'); return }
    setSending(true)
    try {
      const r = await postReflection(planId, dayNum, content.trim())
      setReflections(prev => [...prev, r])
      setContent('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to share' : 'Something went wrong')
    } finally { setSending(false) }
  }

  function handleDelete(id) {
    if (!confirm('Delete your reflection?')) return
    deleteReflection(id).catch(() => null)
    setReflections(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Passage label */}
      {passage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
          style={{background:'#EDE9FF'}}>
          <BookOpen size={13} style={{color:'#5B4FCF',flexShrink:0}}/>
          <p className="font-bold text-[12px] truncate" style={{color:'#5B4FCF'}}>
            Day {dayNum}{passage ? ` — ${passage}` : ''}
          </p>
        </div>
      )}

      {/* Reflections list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{color:'#5B4FCF'}}/>
        </div>
      ) : reflections.length === 0 ? (
        <p className="text-[13px] text-center py-4" style={{color:t.textMuted}}>
          {isToday
            ? 'Be the first to share a reflection today.'
            : 'No reflections posted for this day yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {reflections.map(r => (
            <ReflectionRow key={r.id} r={r}
              currentUserId={authUser?.id}
              onDelete={handleDelete} t={t}/>
          ))}
        </div>
      )}
      <div ref={bottomRef}/>

      {/* Input */}
      <div className="flex items-end gap-2 pt-2 border-t" style={{borderColor:t.border}}>
        {authUser && <Avatar name={authUser.name||'You'} size={28}/>}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 280))}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && handlePost()}
            placeholder="Share what spoke to you today…"
            rows={content.length > 60 ? 3 : 2}
            className="w-full rounded-[12px] px-3 py-2.5 text-[14px] resize-none focus:outline-none"
            style={{
              background: t.bgMuted,
              color:      t.text,
              border:     `1.5px solid ${content ? '#5B4FCF' : t.border}`,
              lineHeight: 1.5,
            }}
          />
          {content.length > 220 && (
            <p className="absolute right-2 bottom-2 text-[10px]"
              style={{color: content.length > 260 ? '#E84060' : t.textFaint}}>
              {280 - content.length}
            </p>
          )}
        </div>
        <button onClick={handlePost} disabled={!content.trim() || sending}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-35 active:scale-90 transition-all"
          style={{background:'#5B4FCF'}}>
          {sending
            ? <Loader2 size={14} className="animate-spin text-white"/>
            : <Send size={14} className="text-white"/>
          }
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Past day accordion row
// ─────────────────────────────────────────────
function PastDayRow({ day, planId, authUser, isCompleted, t }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-[14px] overflow-hidden"
      style={{background:t.bgCard, border:`1px solid ${t.border}`}}>
      <button onClick={() => isCompleted && setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{opacity: isCompleted ? 1 : 0.5}}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{background: isCompleted ? '#4A7C5F' : t.bgMuted}}>
          {isCompleted
            ? <CheckCircle2 size={13} className="text-white"/>
            : <span className="text-[10px] font-bold" style={{color:t.textFaint}}>{day.day_number}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] truncate" style={{color:t.text}}>
            Day {day.day_number}{day.passage_reference ? ` — ${day.passage_reference}` : ''}
          </p>
        </div>
        {isCompleted && (
          open
            ? <ChevronUp size={15} style={{color:t.textFaint,flexShrink:0}}/>
            : <ChevronDown size={15} style={{color:t.textFaint,flexShrink:0}}/>
        )}
        {!isCompleted && (
          <Lock size={13} style={{color:t.textFaint,flexShrink:0}}/>
        )}
      </button>
      <AnimatePresence>
        {open && isCompleted && (
          <motion.div
            initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.2}}>
            <div className="px-4 pb-4 border-t" style={{borderColor:t.border}}>
              <div className="pt-3">
                <ThreadPanel
                  planId={planId}
                  dayNum={day.day_number}
                  passage={day.passage_reference}
                  authUser={authUser}
                  isToday={false}
                  t={t}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function PlanDetailClient({ planId }) {
  const router = useRouter()
  const { t }  = useTheme()

  const [plan,          setPlan]          = useState(null)
  const [days,          setDays]          = useState([])
  const [members,       setMembers]       = useState([])
  const [completions,   setCompletions]   = useState(new Set())
  const [authUser,      setAuthUser]      = useState(null)
  const [myMembership,  setMyMembership]  = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [marking,       setMarking]       = useState(false)
  const [nudging,       setNudging]       = useState(false)
  const [showThread,    setShowThread]    = useState(false)  // slides in after Done
  const [todayReadCount,setTodayReadCount]= useState(0)
  const [tab,           setTab]           = useState('reading')

  const threadRef = useRef(null)

  const load = useCallback(async () => {
    const [p, d, m, user] = await Promise.all([
      getPlanById(planId), getPlanDays(planId),
      getPlanMembers(planId), getAuthUser(),
    ])
    setPlan(p); setDays(d); setMembers(m); setAuthUser(user)
    if (user && p) {
      const comps = await getMyCompletions(planId)
      setCompletions(comps)
      const mine = m.find(mem => mem.userId === user.id)
      setMyMembership(mine || null)
      if (mine) {
        const count = await getDayCompletionCount(planId, mine.currentDay)
        setTodayReadCount(count)
        // If today is already done, show thread immediately
        if (comps.has(mine.currentDay)) setShowThread(true)
      }
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

  // Past days = all completed days except today
  const pastDays = days.filter(d =>
    d.day_number < currentDay && completions.has(d.day_number)
  ).reverse() // most recent first

  async function handleMarkComplete() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      // FIX: explicitly marks currentDay — not currentDay+1
      await markDayComplete(planId, currentDay)
      const nextCompletions = new Set([...completions, currentDay])
      setCompletions(nextCompletions)
      setTodayReadCount(n => n + 1)
      if (plan && authUser) {
        notifyReadComplete(planId, plan.name, authUser.name||'Someone', currentDay).catch(()=>null)
      }
      showToast('Day complete! 🙌')
      // Advance membership day locally
      setMyMembership(prev => prev
        ? { ...prev, currentDay: Math.min(currentDay + 1, total) }
        : prev
      )
      // Reveal thread immediately — scroll to it
      setShowThread(true)
      setTimeout(() => {
        threadRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
      }, 350)
    } catch (e) {
      if (e.message === 'not_authenticated') router.push('/auth')
      else showToast('Something went wrong')
    } finally { setMarking(false) }
  }

  async function handleJoin(fromDay = 1) {
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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
      style={{background:t.bg}}>
      <p className="font-bold text-[18px]" style={{color:t.text}}>Plan not found</p>
      <button onClick={() => router.push('/plans')}
        className="px-5 py-2.5 rounded-full text-white font-bold"
        style={{background:'#5B4FCF'}}>
        Back to Plans
      </button>
    </div>
  )

  const TABS = [
    {k:'reading', l:'Reading'},
    {k:'group',   l:`Group (${members.length})`},
  ]

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
        <button onClick={shareInvite}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{background:t.bgCard, boxShadow:t.shadow}}>
          <Share2 size={15} style={{color:'#5B4FCF'}}/>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex gap-0.5 p-1 rounded-full" style={{background:t.bgMuted}}>
          {TABS.map(tb => (
            <button key={tb.k} onClick={() => setTab(tb.k)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold min-h-[36px]"
              style={tab===tb.k ? {color:'#5B4FCF'} : {color:t.textMuted}}>
              {tab===tb.k && (
                <motion.div layoutId="plan-tab"
                  className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{type:'spring',stiffness:400,damping:35}}/>
              )}
              <span className="relative z-10">{tb.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {/* ── READING TAB ── */}
          {tab === 'reading' && (
            <motion.div key="reading"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-4">

              {/* Completion banner */}
              {isCompleted && (
                <div className="rounded-[20px] p-5 text-center"
                  style={{background:'linear-gradient(135deg,#4A7C5F,#2D5A40)'}}>
                  <p className="font-display font-bold text-[20px] text-white">
                    🎉 You finished "{plan.name}"
                  </p>
                  <p className="text-[13px] text-white/80 mt-2">
                    Well done, faithful one. — Matthew 25:21
                  </p>
                </div>
              )}

              {/* ── TODAY'S READING CARD ── */}
              {!isCompleted && isMember && todayDayObj && (
                <div className="rounded-[20px] overflow-hidden"
                  style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)',
                          boxShadow:'0 8px 24px rgba(91,79,207,0.35)'}}>

                  {/* Top: passage + read button */}
                  <button
                    onClick={() => router.push(buildReaderUrl(todayDayObj.passage_reference, planId, currentDay))}
                    className="w-full text-left px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={14} className="text-white/70"/>
                      <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                        Day {currentDay} of {total}
                      </span>
                      {members.length > 1 && todayReadCount > 0 && (
                        <span className="ml-auto text-[11px] text-white/60">
                          {todayReadCount} read today
                        </span>
                      )}
                    </div>
                    <p className="font-display font-bold text-[22px] text-white leading-tight">
                      {todayDayObj.passage_reference}
                    </p>
                    {todayDayObj.title && todayDayObj.title !== todayDayObj.passage_reference && (
                      <p className="text-[13px] text-white/65 mt-1">{todayDayObj.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-full"
                      style={{background:'rgba(255,255,255,0.18)'}}>
                      <Play size={12} className="text-white" fill="white"/>
                      <span className="font-bold text-[14px] text-white">
                        {todayDone ? 'Read again →' : 'Read now →'}
                      </span>
                    </div>
                  </button>

                  {/* Bottom: Mark as Done */}
                  <div className="px-5 pb-5">
                    {!todayDone ? (
                      <button
                        onClick={handleMarkComplete}
                        disabled={marking}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] active:scale-[0.97] transition-all"
                        style={{background:'rgba(255,255,255,0.95)', color:'#5B4FCF'}}>
                        {marking
                          ? <><Loader2 size={14} className="animate-spin"/> Marking…</>
                          : <><CheckCircle2 size={15}/> Mark as Done</>
                        }
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-full"
                        style={{background:'rgba(255,255,255,0.15)'}}>
                        <CheckCircle2 size={15} className="text-white"/>
                        <span className="font-bold text-[14px] text-white">Done ✓</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Join prompt */}
              {!isMember && !loading && (
                <div className="rounded-[20px] p-5 text-center flex flex-col items-center gap-3"
                  style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <BookOpen size={28} style={{color:'#5B4FCF'}}/>
                  <p className="font-bold text-[16px]" style={{color:t.text}}>Join this plan</p>
                  <p className="text-[13px] leading-relaxed" style={{color:t.textMuted}}>
                    {plan.description || `Read together with ${plan.memberCount} others.`}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleJoin(1)}
                      className="flex-1 py-3 rounded-full font-bold text-[13px] border-2"
                      style={{borderColor:'#5B4FCF', color:'#5B4FCF'}}>
                      From Day 1
                    </button>
                    <button onClick={() => handleJoin(currentDay)}
                      className="flex-1 py-3 rounded-full font-bold text-[13px] text-white"
                      style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
                      Join from today
                    </button>
                  </div>
                </div>
              )}

              {/* Progress */}
              {isMember && (
                <div className="rounded-[18px] p-4" style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <PlanProgress plan={{
                    totalDays:  total,
                    currentDay,
                    days: days.map(d => ({completedAt: completions.has(d.day_number) ? 'done' : null})),
                  }}/>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  TODAY'S REFLECTIONS — slides in after Done
                  FIX 4+5: Appears immediately after marking complete,
                  no extra tap needed, clearly labelled, input pre-focused
                  ═══════════════════════════════════════════ */}
              <AnimatePresence>
                {showThread && isMember && todayDayObj && (
                  <motion.div
                    ref={threadRef}
                    initial={{opacity:0, y:16}}
                    animate={{opacity:1, y:0}}
                    exit={{opacity:0, y:16}}
                    transition={{duration:0.3, ease:'easeOut'}}
                    className="rounded-[20px] overflow-hidden"
                    style={{background:t.bgCard, boxShadow:t.shadow, border:'1.5px solid #5B4FCF20'}}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b"
                      style={{borderColor:t.border, background:'#F8F7FF'}}>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={15} style={{color:'#5B4FCF'}}/>
                        <p className="font-bold text-[14px]" style={{color:'#5B4FCF'}}>
                          Today's Reflections
                        </p>
                      </div>
                      <p className="text-[12px]" style={{color:t.textFaint}}>
                        Day {currentDay}
                      </p>
                    </div>
                    <div className="p-4">
                      <ThreadPanel
                        planId={planId}
                        dayNum={currentDay}
                        passage={todayDayObj.passage_reference}
                        authUser={authUser}
                        isToday={true}
                        t={t}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ═══════════════════════════════════════════
                  PAST DAYS — shared journal, day by day
                  FIX 5: Users can browse all previous days' reflections
                  Each day labelled "Day N — Passage"
                  Locked days show a lock icon, not an error
                  ═══════════════════════════════════════════ */}
              {isMember && pastDays.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <p className="font-bold text-[14px]" style={{color:t.text}}>
                      Previous Days
                    </p>
                    <p className="text-[12px]" style={{color:t.textFaint}}>
                      · {pastDays.length} completed
                    </p>
                  </div>
                  <p className="text-[12px] px-1" style={{color:t.textMuted}}>
                    Tap any completed day to read what your group shared.
                  </p>
                  {pastDays.map(d => (
                    <PastDayRow
                      key={d.day_number}
                      day={d}
                      planId={planId}
                      authUser={authUser}
                      isCompleted={completions.has(d.day_number)}
                      t={t}
                    />
                  ))}
                </div>
              )}

              {/* All passages list */}
              <div>
                <p className="font-bold text-[14px] mb-2" style={{color:t.text}}>All passages</p>
                <div className="flex flex-col gap-1.5">
                  {days.map(d => {
                    const done   = completions.has(d.day_number)
                    const isCurr = d.day_number === currentDay
                    return (
                      <div key={d.day_number}
                        className="flex items-center gap-3 px-4 py-3 rounded-[13px]"
                        style={{
                          background: isCurr ? '#EDE9FF' : t.bgCard,
                          border: `1.5px solid ${isCurr ? '#5B4FCF30' : t.border}`,
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{background: done?'#4A7C5F':isCurr?'#5B4FCF':t.bgMuted}}>
                          {done
                            ? <CheckCircle2 size={13} className="text-white"/>
                            : <span className="text-[10px] font-bold"
                                style={{color:isCurr?'white':t.textFaint}}>
                                {d.day_number}
                              </span>
                          }
                        </div>
                        <p className="font-semibold text-[13px] flex-1 truncate"
                          style={{color: isCurr?'#5B4FCF':t.text}}>
                          {d.passage_reference}
                        </p>
                        <button
                          onClick={() => router.push(buildReaderUrl(d.passage_reference, planId, d.day_number))}
                          className="text-[11px] font-bold flex-shrink-0 px-2.5 py-1 rounded-full"
                          style={{
                            background: isCurr ? '#5B4FCF' : 'transparent',
                            color: isCurr ? 'white' : '#5B4FCF',
                          }}>
                          {isCurr ? 'Read' : 'Open'}
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
                      style={{borderColor:'#5B4FCF', color:'#5B4FCF'}}>
                      {nudging
                        ? <Loader2 size={13} className="animate-spin"/>
                        : <><Bell size={13}/> Nudge group</>
                      }
                    </button>
                    <button onClick={shareInvite}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[13px]"
                      style={{background:'#EDE9FF', color:'#5B4FCF'}}>
                      <Copy size={13}/> Invite
                    </button>
                  </div>
                  {plan.inviteCode && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-[11px]"
                      style={{background:'#EDE9FF'}}>
                      <span className="text-[12px] font-semibold" style={{color:'#7C6FCD'}}>Code</span>
                      <span className="font-bold text-[17px] tracking-widest" style={{color:'#5B4FCF'}}>
                        {plan.inviteCode}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── GROUP TAB ── */}
          {tab === 'group' && (
            <motion.div key="group"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-4">
              <div className="rounded-[18px] p-4"
                style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
                <p className="font-bold text-[16px] text-white">
                  Day {currentDay} of {total}
                </p>
                <p className="text-[13px] text-white/70 mt-0.5">
                  {currentDay/total >= 0.5 ? 'More than halfway 🙌' : `${total-currentDay} days to go`}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white"
                    style={{width:`${Math.min(100,Math.round(((currentDay-1)/total)*100))}%`,
                            transition:'width 0.6s ease'}}/>
                </div>
              </div>

              {members.map(member => (
                <div key={member.userId}
                  className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                  style={{background:t.bgCard, boxShadow:t.shadow}}>
                  <Avatar name={member.name} avatar={member.avatar} size={36}/>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate" style={{color:t.text}}>
                      {member.name}
                      {member.userId === authUser?.id && (
                        <span className="ml-1.5 text-[11px]" style={{color:'#5B4FCF'}}>You</span>
                      )}
                    </p>
                    <p className="text-[12px]" style={{color:t.textMuted}}>
                      {member.status === 'completed' ? '🎉 Finished!'
                        : member.currentDay === 0 ? 'Waiting to begin'
                        : `Day ${member.currentDay} of ${total}`
                      }
                    </p>
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="text-center py-10">
                  <p className="font-semibold text-[15px]" style={{color:t.text}}>
                    No members yet
                  </p>
                  <button onClick={shareInvite}
                    className="mt-4 px-5 py-2.5 rounded-full text-white font-bold text-[13px]"
                    style={{background:'#5B4FCF'}}>
                    Share invite
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}