'use client'

// ── src/app/plans/[id]/reflections/ReflectionsClient.js ──
// Standalone reflections page — pulled completely out of PlanDetailClient.
// Features:
//  • Day navigator (horizontal scroll, jump-to for long plans)
//  • Each day shows passage + reflection count
//  • Expandable day threads inline
//  • Like (not Amen) — subtle count
//  • Reply to a reflection
//  • Tappable scripture references
//  • Works for 2 people or 200

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Heart, Send, Loader2,
  MessageSquare, Trash2, Bookmark, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTheme }   from '../../../../lib/theme'
import { ToastContainer, showToast } from '../../../../components/Toast'
import {
  getPlanById, getPlanDays, getReflections,
  postReflection, deleteReflection, toggleAmenReflection,
  getMyCompletions,
} from '../../../../lib/supabase/plans'
import { getAuthUser }  from '../../../../lib/supabase/communities'
import ScriptureText    from '../../../../components/ScriptureText'
import ScriptureSheet   from '../../../../components/ScriptureSheet'
import { createClient } from '../../../../lib/supabase/client'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function Avatar({ name, avatar, size=32 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF','#E84060']
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

// ─────────────────────────────────────────────
//  Single reflection with Like, Reply, Save
// ─────────────────────────────────────────────
function ReflectionCard({ r, currentUserId, onDelete, t }) {
  const [liked,       setLiked]       = useState(r.amened || false)
  const [likeCount,   setLikeCount]   = useState(0)
  const [showReply,   setShowReply]   = useState(false)
  const [replyText,   setReplyText]   = useState('')
  const [sendingReply,setSendingReply]= useState(false)
  const [replies,     setReplies]     = useState([])
  const [showReplies, setShowReplies] = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [scripture,   setScripture]   = useState(null)

  async function handleLike() {
    try {
      const now = await toggleAmenReflection(r.id)
      setLiked(now)
      setLikeCount(c => Math.max(0, c + (now ? 1 : -1)))
    } catch { showToast('Sign in to like') }
  }

  async function handleSave() {
    setSaved(v => !v)
    showToast(saved ? 'Removed from Reflections' : 'Saved to your Reflections 🙏')
    // TODO: persist to saved_posts when Supabase table supports reflection saves
  }

  async function handleReply() {
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const { replyToReflection } = await import('../../../../lib/supabase/plans')
      const rep = await replyToReflection(r.id, replyText.trim())
      setReplies(prev => [...prev, rep])
      setReplyText('')
      setShowReply(false)
      setShowReplies(true)
    } catch { showToast('Something went wrong') }
    finally { setSendingReply(false) }
  }

  return (
    <>
      <div className="flex gap-3">
        <Avatar name={r.authorName} avatar={r.authorAvatar} size={34}/>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-[13px]" style={{ color:t.text }}>{r.authorName}</p>
            <p className="text-[11px]" style={{ color:t.textFaint }}>{timeAgo(r.createdAt)}</p>
            <div className="ml-auto flex items-center gap-1.5">
              {r.isOwn && (
                <button onClick={() => onDelete(r.id)}
                  className="w-5 h-5 flex items-center justify-center"
                  style={{ color:t.textFaint }}>
                  <Trash2 size={11}/>
                </button>
              )}
              <button onClick={handleSave}
                className="w-5 h-5 flex items-center justify-center"
                style={{ color:saved?'#5B4FCF':t.textFaint }}>
                <Bookmark size={11} fill={saved?'#5B4FCF':'none'}/>
              </button>
            </div>
          </div>

          {/* Content with tappable scripture refs */}
          <p className="text-[14px] leading-[1.75]" style={{ color:t.text }}>
            <ScriptureText content={r.content} onRefTap={ref => setScripture(ref)}/>
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {/* Like — not Amen */}
            <button onClick={handleLike}
              className="flex items-center gap-1.5 active:scale-90 transition-all"
              style={{ color:liked?'#E84060':t.textFaint }}>
              <Heart size={14} fill={liked?'#E84060':'none'} strokeWidth={liked?0:2}/>
              <span className="text-[12px] font-semibold">
                {liked ? 'Liked' : 'Like'}
                {likeCount > 0 && <span className="ml-1 opacity-50">{likeCount}</span>}
              </span>
            </button>

            <button onClick={() => setShowReply(v => !v)}
              className="text-[12px] font-semibold"
              style={{ color:t.textFaint }}>
              Reply
            </button>

            {replies.length > 0 && (
              <button onClick={() => setShowReplies(v => !v)}
                className="flex items-center gap-1 text-[12px]"
                style={{ color:'#5B4FCF' }}>
                {showReplies ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                {replies.length}
              </button>
            )}
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {showReply && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                exit={{ opacity:0, height:0 }} className="overflow-hidden mt-2">
                <div className="flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value.slice(0,280))}
                    onKeyDown={e => e.key==='Enter' && handleReply()}
                    placeholder="Write a reply…"
                    className="flex-1 rounded-full px-3.5 py-2 text-[13px] focus:outline-none"
                    style={{ background:t.bgMuted, color:t.text, border:`1.5px solid ${replyText?'#5B4FCF':t.border}` }}/>
                  <button onClick={handleReply} disabled={!replyText.trim()||sendingReply}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                    style={{ background:'#5B4FCF', flexShrink:0 }}>
                    {sendingReply ? <Loader2 size={12} className="animate-spin text-white"/> : <Send size={12} className="text-white"/>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="mt-3 flex flex-col gap-2 pl-3 border-l-2" style={{ borderColor:t.border }}>
                {replies.map((rep, i) => (
                  <div key={i} className="flex gap-2">
                    <Avatar name="U" size={22}/>
                    <div>
                      <p className="text-[13px]" style={{ color:t.text }}>{rep.content}</p>
                      <p className="text-[11px] mt-0.5" style={{ color:t.textFaint }}>{timeAgo(rep.created_at)}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {scripture && <ScriptureSheet reference={scripture} onClose={() => setScripture(null)}/>}
    </>
  )
}

// ─────────────────────────────────────────────
//  Day block — passage header + expandable thread
// ─────────────────────────────────────────────
function DayBlock({ day, planId, authUser, isCompleted, isActive, t }) {
  const [open,        setOpen]        = useState(isActive)
  const [reflections, setReflections] = useState(null) // null = not loaded yet
  const [loading,     setLoading]     = useState(false)
  const [content,     setContent]     = useState('')
  const [sending,     setSending]     = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (isActive && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 200)
    }
  }, [isActive])

  async function loadReflections() {
    if (reflections !== null) return
    setLoading(true)
    try {
      const r = await getReflections(planId, day.day_number)
      setReflections(r || [])
    } catch { setReflections([]) }
    finally { setLoading(false) }
  }

  async function toggle() {
    if (!isCompleted) return
    const next = !open
    setOpen(next)
    if (next) loadReflections()
  }

  async function handlePost() {
    if (!content.trim() || sending) return
    if (!authUser) { showToast('Sign in to share'); return }
    setSending(true)
    try {
      const r = await postReflection(planId, day.day_number, content.trim())
      setReflections(prev => [...(prev||[]), r])
      setContent('')
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to share' : 'Something went wrong')
    } finally { setSending(false) }
  }

  function handleDelete(id) {
    if (!confirm('Delete?')) return
    deleteReflection(id).catch(() => null)
    setReflections(prev => (prev||[]).filter(r => r.id !== id))
  }

  const count = reflections?.length ?? 0

  return (
    <div ref={ref} className="rounded-[16px] overflow-hidden"
      style={{ background:t.bgCard, border:`1px solid ${isActive?'#5B4FCF30':t.border}` }}>

      {/* Day header — always visible */}
      <button onClick={toggle} disabled={!isCompleted}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        style={{ opacity:isCompleted?1:0.55 }}>
        {/* Day number badge */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[12px]"
          style={{
            background: isActive ? '#5B4FCF' : isCompleted ? '#4A7C5F' : t.bgMuted,
            color:      isCompleted ? 'white' : t.textFaint,
          }}>
          {day.day_number}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px] truncate"
            style={{ color:isActive?'#5B4FCF':t.text }}>
            {day.passage_reference || `Day ${day.day_number}`}
          </p>
          {isCompleted && (
            <p className="text-[11px] mt-0.5" style={{ color:t.textFaint }}>
              {reflections === null ? '…' : count > 0 ? `${count} reflection${count!==1?'s':''}` : 'No reflections yet'}
            </p>
          )}
          {!isCompleted && (
            <p className="text-[11px]" style={{ color:t.textFaint }}>Read this day to see reflections</p>
          )}
        </div>

        {isCompleted && (
          open
            ? <ChevronUp size={15} style={{ color:t.textFaint, flexShrink:0 }}/>
            : <ChevronDown size={15} style={{ color:t.textFaint, flexShrink:0 }}/>
        )}
      </button>

      {/* Expanded thread */}
      <AnimatePresence>
        {open && isCompleted && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t flex flex-col gap-4" style={{ borderColor:t.border }}>
              <div className="pt-3">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin" style={{ color:'#5B4FCF' }}/>
                  </div>
                ) : (reflections||[]).length === 0 ? (
                  <p className="text-[13px] text-center py-3" style={{ color:t.textMuted }}>
                    Be the first to share a reflection for this day.
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {(reflections||[]).map(r => (
                      <ReflectionCard key={r.id} r={r}
                        currentUserId={authUser?.id}
                        onDelete={handleDelete} t={t}/>
                    ))}
                  </div>
                )}

                {/* Compose */}
                <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor:t.border }}>
                  {authUser && <Avatar name={authUser.name||'You'} size={28}/>}
                  <div className="flex-1 flex gap-2">
                    <textarea value={content}
                      onChange={e => setContent(e.target.value.slice(0,280))}
                      onKeyDown={e => e.key==='Enter' && e.metaKey && handlePost()}
                      placeholder="Share what spoke to you…"
                      rows={content.length > 60 ? 3 : 2}
                      className="flex-1 rounded-[12px] px-3 py-2 text-[13px] resize-none focus:outline-none"
                      style={{ background:t.bgMuted, color:t.text, border:`1.5px solid ${content?'#5B4FCF':t.border}` }}/>
                    <button onClick={handlePost} disabled={!content.trim()||sending}
                      className="w-9 h-9 rounded-full flex items-center justify-center self-end disabled:opacity-35"
                      style={{ background:'#5B4FCF', flexShrink:0 }}>
                      {sending
                        ? <Loader2 size={14} className="animate-spin text-white"/>
                        : <Send size={14} className="text-white"/>
                      }
                    </button>
                  </div>
                </div>
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
function ReflectionsInner({ planId }) {
  const router  = useRouter()
  const sp      = useSearchParams()
  const { t }   = useTheme()

  const jumpToDay = parseInt(sp.get('day') || '0', 10)

  const [plan,       setPlan]       = useState(null)
  const [days,       setDays]       = useState([])
  const [authUser,   setAuthUser]   = useState(null)
  const [completions,setCompletions]= useState(new Set())
  const [loading,    setLoading]    = useState(true)
  const [activeDay,  setActiveDay]  = useState(jumpToDay || null)

  // For long plans: current page of days shown
  const [dayPage, setDayPage] = useState(0)
  const DAYS_PER_PAGE = 50

  const navRef = useRef(null)

  useEffect(() => {
    Promise.all([getPlanById(planId), getPlanDays(planId), getAuthUser()])
      .then(async ([p, d, user]) => {
        setPlan(p); setDays(d||[]); setAuthUser(user)
        if (user && p) {
          const comps = await getMyCompletions(planId)
          setCompletions(comps)
          // Default active day = most recently completed
          if (!jumpToDay) {
            const lastDone = [...comps].sort((a,b)=>b-a)[0]
            if (lastDone) setActiveDay(lastDone)
          }
        }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [planId, jumpToDay])

  // Scroll day nav chip into view when activeDay changes
  useEffect(() => {
    if (!activeDay || !navRef.current) return
    const chip = navRef.current.querySelector(`[data-day="${activeDay}"]`)
    chip?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' })
  }, [activeDay])

  const totalDays   = plan?.durationDays || days.length
  const isLongPlan  = totalDays > 20
  const visibleDays = isLongPlan
    ? days.slice(dayPage * DAYS_PER_PAGE, (dayPage+1) * DAYS_PER_PAGE)
    : days

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:t.bg }}>
      <Loader2 size={24} className="animate-spin" style={{ color:'#5B4FCF' }}/>
    </div>
  )

  if (!plan) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
      style={{ background:t.bg }}>
      <p className="font-bold text-[17px]" style={{ color:t.text }}>Plan not found</p>
      <button onClick={() => router.push('/plans')}
        className="px-5 py-2.5 rounded-full text-white font-bold"
        style={{ background:'#5B4FCF' }}>Back</button>
    </div>
  )

  const completedCount = completions.size

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0"
        style={{ borderBottom:`1px solid ${t.border}`, background:t.bgCard }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[16px] truncate" style={{ color:t.text }}>Daily Reflections</p>
          <p className="text-[12px]" style={{ color:t.textMuted }}>
            {plan.name} · {completedCount} of {totalDays} days read
          </p>
        </div>
      </div>

      {/* Day navigator — horizontal scroll for any plan size */}
      <div ref={navRef} className="flex gap-2 px-4 py-3 overflow-x-auto scroll-hide flex-shrink-0"
        style={{ borderBottom:`1px solid ${t.border}`, background:t.bgCard }}>
        {days.map(d => {
          const done    = completions.has(d.day_number)
          const isActive= activeDay === d.day_number
          return (
            <button key={d.day_number}
              data-day={d.day_number}
              onClick={() => { if (done) setActiveDay(d.day_number) }}
              disabled={!done}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
              style={{
                background: isActive ? '#5B4FCF' : done ? '#EDE9FF' : t.bgMuted,
                color:      isActive ? 'white'   : done ? '#5B4FCF' : t.textFaint,
                opacity:    done ? 1 : 0.4,
              }}>
              {d.day_number}
            </button>
          )
        })}
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 flex flex-col gap-3">
        {visibleDays.map(d => (
          <DayBlock key={d.day_number}
            day={d}
            planId={planId}
            authUser={authUser}
            isCompleted={completions.has(d.day_number)}
            isActive={activeDay === d.day_number}
            t={t}/>
        ))}

        {/* Pagination for very long plans */}
        {isLongPlan && (
          <div className="flex gap-2 justify-center py-4">
            {Array.from({ length: Math.ceil(totalDays / DAYS_PER_PAGE) }).map((_, i) => (
              <button key={i} onClick={() => setDayPage(i)}
                className="w-8 h-8 rounded-full text-[12px] font-bold"
                style={{
                  background: dayPage===i ? '#5B4FCF' : t.bgMuted,
                  color:      dayPage===i ? 'white' : t.textMuted,
                }}>
                {i+1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReflectionsClient({ planId }) {
  return (
    <Suspense fallback={null}>
      <ReflectionsInner planId={planId}/>
    </Suspense>
  )
}