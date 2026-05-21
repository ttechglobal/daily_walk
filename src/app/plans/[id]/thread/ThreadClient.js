'use client'

// ── src/app/plans/[id]/thread/ThreadClient.js ──
// Group reflection thread for a plan day.
// YouVersion-quality: passage anchor header, locked-until-read gate,
// clean avatar+name+reflection rows, Amen reactions, short reply threads,
// scripture refs tappable inline.

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Lock, Send, Loader2, BookOpen,
  Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTheme } from '../../../../lib/theme'
import { ToastContainer, showToast } from '../../../../components/Toast'
import {
  getReflections, postReflection, deleteReflection,
  toggleAmenReflection, getMyCompletions,
  getPlanById, getPlanDays,
} from '../../../../lib/supabase/plans'
import { getAuthUser } from '../../../../lib/supabase/communities'
import ScriptureText  from '../../../../components/ScriptureText'
import ScriptureSheet from '../../../../components/ScriptureSheet'
import { createClient } from '../../../../lib/supabase/client'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function Avatar({ name, avatar, size=36 }) {
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
//  Single reflection row
// ─────────────────────────────────────────────
function ReflectionRow({ r, currentUserId, onDelete, t }) {
  const [amened,  setAmened]  = useState(r.amened || false)
  const [amenCount,setAmenCount]=useState(0)
  const [showScripture, setShowScripture] = useState(null)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replies, setReplies] = useState([])
  const [showReplies, setShowReplies] = useState(false)

  async function handleAmen() {
    try {
      const now = await toggleAmenReflection(r.id)
      setAmened(now)
      setAmenCount(c => c + (now ? 1 : -1))
    } catch (e) {
      if (e.message === 'not_authenticated') showToast('Sign in to respond')
    }
  }

  async function handleReply() {
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const { replyToReflection } = await import('../../../../lib/supabase/plans')
      const rep = await replyToReflection(r.id, replyText.trim())
      setReplies(prev => [...prev, rep])
      setReplyText('')
      setShowReplies(true)
      showToast('Reply sent')
    } catch (e) {
      showToast('Something went wrong')
    } finally {
      setSendingReply(false)
      setShowReplyInput(false)
    }
  }

  const isOwn = currentUserId === r.authorId

  return (
    <>
      <div className="flex gap-3">
        <Avatar name={r.authorName} avatar={r.authorAvatar} size={36}/>
        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-bold text-[13px]" style={{ color:t.text }}>{r.authorName}</p>
            <p className="text-[11px]" style={{ color:t.textFaint }}>{timeAgo(r.createdAt)}</p>
            {isOwn && (
              <button onClick={() => onDelete(r.id)}
                className="ml-auto w-6 h-6 rounded-full flex items-center justify-center"
                style={{ color:t.textFaint }}>
                <Trash2 size={11}/>
              </button>
            )}
          </div>

          {/* Content with tappable scripture refs */}
          <p className="text-[14px] leading-[1.7]" style={{ color:t.text }}>
            <ScriptureText content={r.content} onRefTap={ref => setShowScripture(ref)}/>
          </p>

          {/* Action row */}
          <div className="flex items-center gap-3 mt-2.5">
            {/* Amen */}
            <button onClick={handleAmen}
              className="flex items-center gap-1.5 transition-all active:scale-90"
              style={{ color: amened ? '#5B4FCF' : t.textFaint }}>
              <span style={{ fontSize:15, lineHeight:1 }}>🙏</span>
              <span className="text-[12px] font-semibold">
                Amen{amenCount > 0 && <span className="ml-1 opacity-60">{amenCount}</span>}
              </span>
            </button>

            {/* Reply toggle */}
            <button onClick={() => setShowReplyInput(v => !v)}
              className="text-[12px] font-semibold"
              style={{ color:t.textFaint }}>
              Reply
            </button>

            {/* Show replies */}
            {replies.length > 0 && (
              <button onClick={() => setShowReplies(v => !v)}
                className="flex items-center gap-1 text-[12px]" style={{ color:'#5B4FCF' }}>
                {showReplies ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="flex items-end gap-2 mt-2.5 overflow-hidden">
                <input value={replyText} onChange={e => setReplyText(e.target.value.slice(0,280))}
                  onKeyDown={e => e.key === 'Enter' && handleReply()}
                  placeholder="Write a reply…"
                  className="flex-1 rounded-full px-3.5 py-2 text-[13px] focus:outline-none"
                  style={{ background:t.bgMuted, color:t.text, border:`1.5px solid ${replyText?'#5B4FCF':t.border}` }}/>
                <button onClick={handleReply} disabled={!replyText.trim() || sendingReply}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background:'#5B4FCF' }}>
                  {sendingReply ? <Loader2 size={12} className="animate-spin text-white"/> : <Send size={12} className="text-white"/>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies list */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="mt-3 flex flex-col gap-2.5 pl-3 border-l-2"
                style={{ borderColor:t.border }}>
                {replies.map(rep => (
                  <div key={rep.id} className="flex gap-2.5">
                    <Avatar name={rep.user_id || 'U'} size={24}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-relaxed" style={{ color:t.text }}>{rep.content}</p>
                      <p className="text-[11px] mt-0.5" style={{ color:t.textFaint }}>
                        {timeAgo(rep.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showScripture && (
        <ScriptureSheet reference={showScripture} onClose={() => setShowScripture(null)}/>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
//  Main thread component
// ─────────────────────────────────────────────
function ThreadContent({ planId }) {
  const router      = useRouter()
  const sp          = useSearchParams()
  const { t }       = useTheme()
  const dayNum      = parseInt(sp.get('day') || '1', 10)

  const [plan,        setPlan]        = useState(null)
  const [dayData,     setDayData]     = useState(null)
  const [reflections, setReflections] = useState([])
  const [authUser,    setAuthUser]    = useState(null)
  const [isUnlocked,  setIsUnlocked]  = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [hasPosted,   setHasPosted]   = useState(false)
  const [content,     setContent]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [showPrompt,  setShowPrompt]  = useState(false)

  const textRef   = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!planId) return
    Promise.all([
      getPlanById(planId),
      getPlanDays(planId),
      getAuthUser(),
    ]).then(async ([p, days, user]) => {
      setPlan(p)
      setDayData((days || []).find(d => d.day_number === dayNum) || null)
      setAuthUser(user)

      if (user && p) {
        // Check if user completed this day
        const comps   = await getMyCompletions(planId)
        const creator = p.creatorId === user.id
        const unlocked = comps.has(dayNum) || creator
        setIsUnlocked(unlocked)

        if (unlocked) {
          const refs = await getReflections(planId, dayNum)
          setReflections(refs || [])
          const alreadyPosted = (refs || []).some(r => r.authorId === user.id)
          setHasPosted(alreadyPosted)
          if (!alreadyPosted) setShowPrompt(true)
        }
      } else if (!user) {
        // Not logged in — still unlock for public plans
        if (p?.visibility === 'public') setIsUnlocked(true)
      }
      setLoading(false)
    }).catch(e => { console.error('[thread]', e.message); setLoading(false) })
  }, [planId, dayNum])

  async function handlePost() {
    if (!content.trim() || sending) return
    if (!authUser) { showToast('Sign in to share a reflection'); return }
    setSending(true)
    try {
      const r = await postReflection(planId, dayNum, content.trim())
      setReflections(prev => [...prev, r])
      setContent('')
      setHasPosted(true)
      setShowPrompt(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    } catch (e) {
      if (e.message === 'not_authenticated') showToast('Sign in to share')
      else showToast('Something went wrong')
    } finally { setSending(false) }
  }

  function handleDelete(id) {
    if (!confirm('Delete your reflection?')) return
    deleteReflection(id).catch(() => null)
    setReflections(prev => prev.filter(r => r.id !== id))
  }

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:t.bg }}>
      <Loader2 size={24} className="animate-spin" style={{ color:'#5B4FCF' }}/>
    </div>
  )

  // ── Locked ──
  if (!isUnlocked) return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:t.bgCard, boxShadow:t.shadow }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>
        <p className="font-bold text-[16px]" style={{ color:t.text }}>Day {dayNum} Thread</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center pb-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background:'#EDE9FF' }}>
          <Lock size={26} style={{ color:'#5B4FCF' }}/>
        </div>
        <div>
          <p className="font-bold text-[20px]" style={{ color:t.text }}>
            Read today's passage first
          </p>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color:t.textMuted }}>
            The group thread unlocks after you've read {dayData?.passage_reference ? `"${dayData.passage_reference}"` : "today's passage"}. This keeps the conversation anchored in what everyone read.
          </p>
        </div>
        <button onClick={() => router.push(`/plans/${planId}?day=${dayNum}`)}
          className="px-8 py-4 rounded-full text-white font-bold text-[15px] active:scale-[0.97] transition-all"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          Read now →
        </button>
      </div>
    </div>
  )

  const memberCount = plan?.memberCount || 1

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
          <p className="font-bold text-[16px]" style={{ color:t.text }}>
            {plan?.name || 'Reading Plan'}
          </p>
          <p className="text-[12px]" style={{ color:t.textMuted }}>
            Day {dayNum} reflections
          </p>
        </div>
      </div>

      {/* Passage anchor */}
      {dayData?.passage_reference && (
        <div className="flex-shrink-0 px-4 py-3"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-white/80 flex-shrink-0"/>
            <p className="font-bold text-[14px] text-white truncate">{dayData.passage_reference}</p>
          </div>
          {dayData.title && dayData.title !== dayData.passage_reference && (
            <p className="text-[12px] text-white/70 mt-0.5">{dayData.title}</p>
          )}
        </div>
      )}

      {/* Reflection prompt banner */}
      <AnimatePresence>
        {showPrompt && !hasPosted && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="flex-shrink-0 mx-4 mt-3 rounded-[16px] p-4"
            style={{ background:'#EDE9FF', border:'1.5px solid #5B4FCF20' }}>
            <p className="font-bold text-[14px]" style={{ color:'#5B4FCF' }}>
              What stood out to you today?
            </p>
            <p className="text-[12px] mt-0.5 mb-3" style={{ color:'#7C6FCD' }}>
              Share a short reflection — max 280 characters. Optional.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowPrompt(false)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold"
                style={{ background:'white', color:'#7C6FCD' }}>
                Skip
              </button>
              <button onClick={() => { setShowPrompt(false); setTimeout(() => textRef.current?.focus(), 100) }}
                className="flex-1 py-2 rounded-full text-[12px] font-bold text-white"
                style={{ background:'#5B4FCF' }}>
                Share a reflection →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5"
        style={{ paddingBottom:120 }}>

        {reflections.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <span style={{ fontSize:36 }}>📖</span>
            <p className="font-bold text-[17px]" style={{ color:t.text }}>
              Be the first to share
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color:t.textMuted }}>
              What did God show you in today's reading? Your reflection might be exactly what someone else needs to hear.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color:t.textFaint }}>
              {reflections.length} reflection{reflections.length !== 1 ? 's' : ''}
              {memberCount > 1 && ` · ${memberCount} members in this plan`}
            </p>
            {reflections.map(r => (
              <ReflectionRow
                key={r.id}
                r={r}
                currentUserId={authUser?.id}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Compose bar — fixed at bottom */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px]"
        style={{
          background:    t.bgCard,
          borderTop:     `1px solid ${t.border}`,
          paddingLeft:   16,
          paddingRight:  16,
          paddingTop:    10,
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          zIndex:        40,
        }}>
        {/* Char count */}
        <div className="flex items-end gap-2">
          {authUser && (
            <Avatar name={authUser.name || authUser.username || 'You'} size={32}/>
          )}
          <div className="flex-1 relative">
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value.slice(0, 280))}
              onKeyDown={e => e.key === 'Enter' && e.metaKey && handlePost()}
              placeholder={hasPosted ? 'Add another reflection…' : 'What stood out to you today?'}
              rows={content.length > 80 ? 3 : 2}
              className="w-full rounded-[14px] px-3.5 py-2.5 text-[14px] resize-none focus:outline-none"
              style={{
                background: t.bgMuted,
                color:      t.text,
                border:     `1.5px solid ${content ? '#5B4FCF' : t.border}`,
                lineHeight: 1.5,
              }}
            />
            {content.length > 200 && (
              <p className="absolute right-2 bottom-2 text-[10px]"
                style={{ color: content.length > 260 ? '#E84060' : t.textFaint }}>
                {280 - content.length}
              </p>
            )}
          </div>
          <button
            onClick={handlePost}
            disabled={!content.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-35 active:scale-90 transition-all"
            style={{ background:'#5B4FCF' }}>
            {sending
              ? <Loader2 size={15} className="animate-spin text-white"/>
              : <Send size={15} className="text-white"/>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ThreadClient({ planId }) {
  return (
    <Suspense fallback={null}>
      <ThreadContent planId={planId}/>
    </Suspense>
  )
}