'use client'

// ── src/app/plans/[id]/PlanDetailClient.js ──
// v3 — Offline cache integration.
// Changes from v2:
//   • Imports advancePlanCache from plan-cache
//   • handleMarkComplete calls advancePlanCache after successful mark (fire-and-forget)
//   • JoinPlanSheet wired for frequency-based joining (new plans)
//   • Progress board link added to group plan header

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, CheckCircle2, Users,
  Share2, Bell, Copy, Loader2, Play,
  MessageSquare, MoreVertical, Trash2, LogOut, Send,
  BarChart2,
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
import { getAuthUser }        from '../../../lib/supabase/communities'
import { PlanProgress }       from '../../../components/GraceProgress'
import { createClient }       from '../../../lib/supabase/client'
import { advancePlanCache }   from '../../../lib/plan-cache'           // ← NEW
import { getPreferredVersionId } from '../../../lib/bible'              // ← NEW
import { JoinPlanSheet }      from '../../../components/FrequencyPicker' // ← NEW

function todayStr() { return new Date().toISOString().split('T')[0] }

function Avatar({ name, avatar, size=32 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{ width:size, height:size }}
      onError={e => { e.currentTarget.style.display='none' }}/>
  )
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width:size, height:size, background:bg, fontSize:Math.round(size*0.38) }}>
      {ini}
    </div>
  )
}

function buildReaderUrl(passage, planId, dayNum) {
  if (!passage) return '/read'
  const m    = passage.match(/^(.+?)\s+(\d+)/)
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
    document.addEventListener('mousedown',  fn)
    document.addEventListener('touchstart', fn)
    return () => {
      document.removeEventListener('mousedown',  fn)
      document.removeEventListener('touchstart', fn)
    }
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

    const unsub = subscribeToDayCheckins(planId, dayNumber, ({ userId, name, avatar }) => {
      setCheckins(prev => prev.map(m =>
        m.userId === userId ? { ...m, hasCheckedIn: true } : m
      ))
    })
    return unsub
  }, [planId, dayNumber])

  const done = checkins.filter(c => c.hasCheckedIn).length
  const total = checkins.length

  if (loading || !checkins.length) return null

  return (
    <div className="rounded-[18px] px-4 py-3.5"
      style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-[13px]" style={{ color:t.text }}>Today's reading</p>
        <span className="text-[12px] font-semibold" style={{ color:t.textFaint }}>
          {done}/{total} read
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {checkins.map(m => (
          <div key={m.userId} className="relative">
            <div style={{ opacity: m.hasCheckedIn ? 1 : 0.35 }}>
              <Avatar name={m.name} avatar={m.avatar} size={36}/>
            </div>
            {m.hasCheckedIn && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                <CheckCircle2 size={12} style={{ color:'#4A7C5F' }}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Reflection prompt
// ─────────────────────────────────────────────
function ReflectionPrompt({ planId, dayNumber, onSkip, onPosted, t }) {
  const [text,    setText]   = useState('')
  const [posting, setPosting]= useState(false)

  async function handlePost() {
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      await postReflection(planId, dayNumber, text.trim())
      onPosted()
    } catch { showToast('Could not post — try again') }
    finally { setPosting(false) }
  }

  return (
    <motion.div
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="rounded-[20px] p-4 flex flex-col gap-3"
      style={{ background:t.bgCard, border:`1px solid ${t.border}` }}
    >
      <p className="font-bold text-[14px]" style={{ color:t.text }}>
        Share a reflection? (optional)
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What stood out from today's reading?"
        rows={3}
        className="w-full resize-none rounded-[12px] px-3 py-2.5 text-[14px] focus:outline-none"
        style={{ background:t.bgInput, border:`1.5px solid ${t.borderInput}`, color:t.text }}
      />
      <div className="flex gap-2">
        <button onClick={onSkip}
          className="flex-1 py-2.5 rounded-full font-bold text-[13px] border-2"
          style={{ borderColor:t.border, color:t.textMuted }}>
          Skip
        </button>
        <button onClick={handlePost} disabled={!text.trim() || posting}
          className="flex-1 py-2.5 rounded-full font-bold text-[13px] text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
          style={{ background:'#5B4FCF' }}>
          {posting ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
          Post
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Catch-up / behind banner
// ─────────────────────────────────────────────
function BehindBanner({ daysBehind, onCatchUp, onContinue, t }) {
  return (
    <div className="rounded-[18px] px-4 py-4"
      style={{ background:t.amberBg||'#FFF4DC', border:'1px solid #E8A83840' }}>
      <p className="font-bold text-[14px] mb-1" style={{ color:'#92681A' }}>
        {daysBehind === 1 ? "You missed yesterday — that's okay." : `You're ${daysBehind} days behind — grace is still here.`}
      </p>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color:t.textMuted }}>
        "His mercies are new every morning." — Lamentations 3:23
      </p>
      <div className="flex gap-2">
        <button onClick={onCatchUp}
          className="flex-1 py-3 rounded-full font-bold text-[13px] border-2"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
          Catch up
        </button>
        <button onClick={onContinue}
          className="flex-1 py-3 rounded-full font-bold text-[13px] text-white"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          Continue from today
        </button>
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
  const [showPrompt,     setShowPrompt]     = useState(false)
  const [justCompleted,  setJustCompleted]  = useState(false)
  const [completedDayNum,setCompletedDayNum]= useState(null)
  const [showJoinSheet,  setShowJoinSheet]  = useState(false)  // ← NEW: frequency join sheet

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
  const total       = myMembership?.personalDays || plan?.durationDays || 1
  const isCompleted = myMembership?.status === 'completed'
  const today       = todayStr()
  const daysBehind  = (() => {
    const sd = todayDayObj?.scheduled_date
    if (!sd || sd >= today) return 0
    return Math.round((new Date(today) - new Date(sd)) / 86400000)
  })()

  // ─────────────────────────────────────────────
  //  Mark as complete — with cache advance
  // ─────────────────────────────────────────────
  async function handleMarkComplete() {
    if (todayDone || marking) return
    setMarking(true)
    try {
      await markDayComplete(planId, currentDay)

      const next = new Set([...completions, currentDay])
      setCompletions(next)

      if (plan && authUser) {
        notifyReadComplete(
          planId, plan.name,
          authUser.name || 'Someone',
          currentDay
        ).catch(() => null)
      }

      showToast('Day complete! 🙌')

      const newCurrentDay = Math.min(currentDay + 1, total)
      setMyMembership(prev => prev
        ? { ...prev, currentDay: newCurrentDay }
        : prev
      )
      setJustCompleted(true)
      setCompletedDayNum(currentDay)

      // ← NEW: Advance the cache window — fetch the new trailing day silently
      // This keeps the next 7 days always available offline
      if (plan?.content && myMembership?.frequencyUnit) {
        advancePlanCache({
          planContent:     plan.content,
          frequency:       { unit: myMembership.frequencyUnit, count: myMembership.frequencyCount },
          newCurrentDay,
          personalDays:    myMembership.personalDays,
          planId,
          versionIdOrAbbr: getPreferredVersionId(),
        })
      }

      if (currentDay >= total) {
        setTimeout(() => router.push(`/plans/complete?planId=${planId}`), 1000)
        return
      }

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

  async function handleJoin(fromDay = 1) {
    if (!authUser) { router.push('/auth?next=/plans/' + planId); return }
    // If plan has content[], show the frequency sheet
    if (plan?.content?.length) {
      setShowJoinSheet(true)
      return
    }
    // Legacy plan — direct join
    await joinPlan(planId, { fromDay })
    load(); showToast('Joined! 🙌')
  }

  async function handleNudge() {
    if (!isCreator || nudging) return
    setNudging(true)
    try {
      await sendPlanNudge(planId, authUser.name || 'The creator', plan.name)
      showToast('Nudge sent 🙏')
    } catch { showToast('Send failed') }
    finally { setNudging(false) }
  }

  async function shareInvite() {
    if (!plan?.inviteCode) return
    const url = `${window.location.origin}/plan/join/${plan.inviteCode}`
    if (navigator.share) navigator.share({ title: plan.name, url }).catch(() => null)
    else { await navigator.clipboard.writeText(url); showToast('Invite link copied!') }
  }

  const isGroupPlan = plan?.memberCount > 1 || plan?.visibility !== 'private'

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:t.bg }}>
      <Loader2 size={24} className="animate-spin" style={{ color:'#5B4FCF' }}/>
    </div>
  )

  if (!plan) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
      style={{ background:t.bg }}>
      <p className="font-bold text-[18px]" style={{ color:t.text }}>Plan not found</p>
      <button onClick={() => router.push('/plans')}
        className="px-5 py-2.5 rounded-full text-white font-bold"
        style={{ background:'#5B4FCF' }}>Back</button>
    </div>
  )

  const TABS = [
    { k:'reading', l:'Reading' },
    { k:'group',   l:`Group (${members.length})` },
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgCard, boxShadow:t.shadow }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] truncate" style={{ color:t.text }}>{plan.name}</h1>
          <p className="text-[12px]" style={{ color:t.textFaint }}>
            {plan.memberCount} member{plan.memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* ← NEW: Progress board link for group plans */}
          {isGroupPlan && isMember && (
            <button onClick={() => router.push(`/plans/${planId}/progress`)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background:t.bgCard, boxShadow:t.shadow }}>
              <BarChart2 size={16} style={{ color:'#5B4FCF' }}/>
            </button>
          )}
          {isCreator && (
            <button onClick={handleNudge} disabled={nudging}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background:t.bgCard, boxShadow:t.shadow }}>
              {nudging
                ? <Loader2 size={15} className="animate-spin" style={{ color:t.textMuted }}/>
                : <Bell size={16} style={{ color:t.text }}/>
              }
            </button>
          )}
          <button onClick={shareInvite}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background:t.bgCard, boxShadow:t.shadow }}>
            <Share2 size={16} style={{ color:t.text }}/>
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background:t.bgCard, boxShadow:t.shadow }}>
              <MoreVertical size={16} style={{ color:t.text }}/>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <PlanMenu
                  isCreator={isCreator}
                  onLeave={handleLeave}
                  onDelete={handleDelete}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0 px-4" style={{ borderColor:t.border }}>
        {TABS.map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)}
            className="flex-1 py-3 text-[14px] font-bold transition-all"
            style={{
              color:        tab===k ? '#5B4FCF' : t.textMuted,
              borderBottom: tab===k ? '2px solid #5B4FCF' : '2px solid transparent',
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 flex flex-col gap-4">

        {tab === 'reading' && (
          <>
            {/* Progress */}
            {isMember && (
              <PlanProgress plan={{ totalDays:total, currentDay, days:[] }} />
            )}

            {/* Behind banner */}
            {isMember && daysBehind > 0 && !isCompleted && (
              <BehindBanner
                daysBehind={daysBehind}
                onCatchUp={() => { /* no-op: mark old days complete */ }}
                onContinue={() => { /* no-op: already on current day */ }}
                t={t}
              />
            )}

            {/* Today's reading card */}
            {isMember && !isCompleted && todayDayObj && (
              <div className="rounded-[20px] overflow-hidden"
                style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                <div className="px-5 pt-5 pb-3">
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
                    Day {currentDay} of {total}
                  </p>
                  <p className="font-bold text-[20px] text-white mt-1 leading-snug">
                    {todayDayObj.title || todayDayObj.passage_reference}
                  </p>
                  {todayDayObj.passage_reference && (
                    <p className="text-white/70 text-[13px] mt-0.5">
                      {todayDayObj.passage_reference}
                    </p>
                  )}
                </div>
                <div className="px-5 pb-4 flex flex-col gap-2">
                  <button
                    onClick={() => router.push(buildReaderUrl(todayDayObj.passage_reference, planId, currentDay))}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] active:scale-[0.97]"
                    style={{ background:'rgba(255,255,255,0.15)', color:'white' }}>
                    <BookOpen size={15}/>
                    {todayDone ? 'Read again →' : 'Read now →'}
                  </button>
                  {!todayDone ? (
                    <button onClick={handleMarkComplete} disabled={marking}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] active:scale-[0.97]"
                      style={{ background:'rgba(255,255,255,0.95)', color:'#5B4FCF' }}>
                      {marking
                        ? <><Loader2 size={14} className="animate-spin"/>Marking…</>
                        : <><CheckCircle2 size={15}/>Mark as Done</>
                      }
                    </button>
                  ) : (
                    <button onClick={() => router.push(`/plans/${planId}/reflections?day=${currentDay}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px]"
                      style={{ background:'rgba(255,255,255,0.15)' }}>
                      <MessageSquare size={14} className="text-white"/>
                      <span className="text-white">View today's reflections →</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Reflection prompt */}
            <AnimatePresence>
              {showPrompt && completedDayNum && (
                <ReflectionPrompt
                  planId={planId}
                  dayNumber={completedDayNum}
                  onSkip={() => setShowPrompt(false)}
                  onPosted={() => { setShowPrompt(false); showToast('Reflection shared 🙏') }}
                  t={t}
                />
              )}
            </AnimatePresence>

            {/* Daily check-in panel */}
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
                style={{ background:'linear-gradient(135deg,#4A7C5F,#2D5A40)' }}>
                <p className="font-display font-bold text-[20px] text-white">
                  🎉 You finished "{plan.name}"
                </p>
                <p className="text-[13px] text-white/80 mt-2">Well done, faithful one.</p>
              </div>
            )}

            {/* Join CTA for non-members */}
            {!isMember && (
              <button onClick={() => handleJoin(1)}
                className="w-full py-4 rounded-full text-white font-bold text-[16px]"
                style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                Join this plan →
              </button>
            )}
          </>
        )}

        {tab === 'group' && (
          <div className="flex flex-col gap-3">
            {members.length === 0 ? (
              <p className="text-center py-8 text-[14px]" style={{ color:t.textMuted }}>
                No members yet
              </p>
            ) : (
              members.map(m => (
                <div key={m.userId}
                  className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                  style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
                  <Avatar name={m.name} avatar={m.avatar} size={38}/>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate" style={{ color:t.text }}>{m.name}</p>
                    <p className="text-[12px]" style={{ color:t.textFaint }}>
                      Day {m.currentDay}{m.personalDays ? `/${m.personalDays}` : ''}
                    </p>
                  </div>
                  {m.status === 'completed' && (
                    <CheckCircle2 size={16} style={{ color:'#4A7C5F' }}/>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* ← NEW: JoinPlanSheet for frequency-based joining */}
      <JoinPlanSheet
        open={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        plan={{
          planId,
          planName:    plan?.name,
          content:     plan?.content,
          itemUnit:    plan?.itemUnit,
          totalItems:  plan?.totalItems,
          memberCount: plan?.memberCount,
        }}
        onJoined={async (frequency) => {
          await load()
          showToast('Joined! 🙌')
        }}
      />
    </div>
  )
}