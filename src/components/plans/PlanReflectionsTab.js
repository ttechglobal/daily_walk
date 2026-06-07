'use client'

// ── src/components/plans/PlanReflectionsTab.js ──
// Shared reflections tab — shown on the plan detail page.
//
// PRIVACY:
//   Only plan members can see this tab. RLS on plan_reflections
//   enforces this at DB level. The component also checks membership
//   before rendering the compose UI.
//
// UX:
//   • Toggle between "Reflections" and "Questions"
//   • Optional: attach a verse (pulled from sessionStorage if user tapped
//     "Add to Reflection" in the Bible reader)
//   • Real-time updates via Supabase subscription
//   • Author can delete their own post

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquarePlus, HelpCircle, Trash2, Send,
  BookOpen, Loader2, X, ChevronDown,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { showToast } from '../Toast'
import {
  getPlanReflections,
  addPlanReflection,
  deletePlanReflection,
  subscribeToPlanReflections,
} from '../../lib/supabase/plan-reflections'
import { getAuthUser } from '../../lib/supabase/communities'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, url, size = 36 }) {
  const [failed, setFailed] = useState(false)
  const ini = (name || 'M').slice(0, 2).toUpperCase()
  if (url && !failed) {
    return (
      <img src={url} alt={name} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #5B4FCF, #3D3190)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'white',
    }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Single reflection card
// ─────────────────────────────────────────────
function ReflectionCard({ item, authUserId, onDelete, t }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const isOwn = item.userId === authUserId

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] p-4"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
      }}>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={item.authorName} url={item.avatarUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px]" style={{ color: t.text }}>{item.authorName}</p>
          <div className="flex items-center gap-2">
            <p className="text-[11px]" style={{ color: t.textFaint }}>{timeAgo(item.createdAt)}</p>
            {item.isQuestion && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#FFF3DC', color: '#E8A838' }}>
                Question
              </span>
            )}
            {item.dayNumber != null && (
              <span className="text-[10px] font-semibold" style={{ color: t.textFaint }}>
                Day {item.dayNumber}
              </span>
            )}
          </div>
        </div>

        {isOwn && (
          <button
            onClick={() => setConfirmDel(v => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: t.bgMuted }}>
            <Trash2 size={13} style={{ color: confirmDel ? '#E84060' : t.textMuted }} />
          </button>
        )}
      </div>

      {/* Quoted verse */}
      {item.verseText && (
        <div className="mb-2 px-3 py-2 rounded-[10px] border-l-4"
          style={{ borderColor: '#5B4FCF', background: '#EDE9FF40' }}>
          <p className="text-[12px] italic leading-relaxed" style={{ color: '#5B4FCF' }}>
            "{item.verseText}"
          </p>
          {item.passageRef && (
            <p className="text-[10px] font-bold mt-1" style={{ color: '#5B4FCF80' }}>
              — {item.passageRef}
            </p>
          )}
        </div>
      )}

      {/* Reflection content */}
      <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>
        {item.content}
      </p>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => { onDelete(item.id); setConfirmDel(false) }}
                className="flex-1 py-2 rounded-full text-[12px] font-bold text-white"
                style={{ background: '#E84060' }}>
                Delete
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 py-2 rounded-full text-[12px] font-bold border"
                style={{ borderColor: t.border, color: t.textMuted }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Compose sheet — bottom sheet
// ─────────────────────────────────────────────
function ComposeSheet({ planId, currentDay, onClose, onPosted, t }) {
  const [content,     setContent]     = useState('')
  const [isQuestion,  setIsQuestion]  = useState(false)
  const [pendingVerse,setPendingVerse]= useState(null)
  const [submitting,  setSubmitting]  = useState(false)
  const textRef = useRef(null)

  // Pick up verse added from Bible reader
  useEffect(() => {
    try {
      const key = isQuestion ? 'dw_pending_question' : 'dw_pending_reflection'
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const data = JSON.parse(raw)
        // Only use if fresh (< 10 min)
        if (Date.now() - data.timestamp < 600_000) {
          setPendingVerse(data)
        }
      }
    } catch {}
    setTimeout(() => textRef.current?.focus(), 300)
  }, [isQuestion])

  function clearVerse() {
    setPendingVerse(null)
    try {
      sessionStorage.removeItem('dw_pending_reflection')
      sessionStorage.removeItem('dw_pending_question')
    } catch {}
  }

  async function handleSubmit() {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const item = await addPlanReflection({
        planId,
        dayNumber:   currentDay || null,
        passageRef:  pendingVerse?.reference || null,
        content:     content.trim(),
        verseText:   pendingVerse?.text || null,
        isQuestion,
      })
      clearVerse()
      onPosted(item)
      onClose()
      showToast(isQuestion ? 'Question shared 🤔' : 'Reflection shared ✍️')
    } catch (e) {
      showToast(e.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{
          background: t.bgCard,
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: t.border }}>
          <div className="flex gap-2">
            <button
              onClick={() => setIsQuestion(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: !isQuestion ? '#5B4FCF' : t.bgMuted,
                color:      !isQuestion ? 'white'   : t.textMuted,
              }}>
              <MessageSquarePlus size={12} /> Reflection
            </button>
            <button
              onClick={() => setIsQuestion(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: isQuestion ? '#E8A838' : t.bgMuted,
                color:      isQuestion ? 'white'  : t.textMuted,
              }}>
              <HelpCircle size={12} /> Question
            </button>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <X size={14} style={{ color: t.textMuted }} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Pending verse pill */}
          {pendingVerse && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px]"
              style={{ background: '#EDE9FF', border: '1px solid #C4B5FD' }}>
              <BookOpen size={14} style={{ color: '#5B4FCF', flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>
                  {pendingVerse.reference}
                </p>
                <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#5B4FCF' }}>
                  {pendingVerse.text}
                </p>
              </div>
              <button onClick={clearVerse}>
                <X size={14} style={{ color: '#5B4FCF', flexShrink: 0 }} />
              </button>
            </div>
          )}

          {/* Text area */}
          <textarea
            ref={textRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              isQuestion
                ? "What question came up as you read today?"
                : "What stood out to you in today's reading?"
            }
            rows={5}
            maxLength={2000}
            className="w-full resize-none text-[14px] leading-relaxed focus:outline-none rounded-[12px] p-3 border"
            style={{ background: t.bgMuted, color: t.text, borderColor: t.border }}
          />
          <p className="text-[11px] text-right" style={{ color: t.textFaint }}>
            {content.length}/2000
          </p>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-[14px] text-white disabled:opacity-40 active:scale-[0.97] transition-all"
            style={{ background: isQuestion ? '#E8A838' : 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
            {submitting
              ? <Loader2 size={16} className="animate-spin" />
              : <><Send size={15} /> Share {isQuestion ? 'question' : 'reflection'}</>}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Main tab component
// ─────────────────────────────────────────────
export default function PlanReflectionsTab({ planId, currentDay, isMember }) {
  const { t }        = useTheme()
  const [authUser,   setAuthUser]   = useState(null)
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all') // 'all' | 'reflections' | 'questions'
  const [compose,    setCompose]    = useState(false)

  // Load auth user
  useEffect(() => {
    getAuthUser().then(u => setAuthUser(u || null))
  }, [])

  // Load reflections
  const load = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    try {
      const data = await getPlanReflections(planId)
      setItems(data)
    } catch {}
    finally { setLoading(false) }
  }, [planId])

  useEffect(() => { load() }, [load])

  // Real-time updates
  useEffect(() => {
    if (!planId) return
    return subscribeToPlanReflections(planId, async (payload) => {
      if (payload.eventType === 'INSERT') {
        // Re-fetch to get profile data
        const fresh = await getPlanReflections(planId, { limit: 1 })
        const newItem = fresh.find(r => r.id === payload.new.id)
        if (newItem) setItems(prev => [newItem, ...prev.filter(r => r.id !== newItem.id)])
      } else if (payload.eventType === 'DELETE') {
        setItems(prev => prev.filter(r => r.id !== payload.old.id))
      }
    })
  }, [planId])

  async function handleDelete(id) {
    try {
      await deletePlanReflection(id)
      setItems(prev => prev.filter(r => r.id !== id))
      showToast('Deleted')
    } catch (e) {
      showToast(e.message || 'Delete failed')
    }
  }

  const filtered = items.filter(r => {
    if (filter === 'reflections') return !r.isQuestion
    if (filter === 'questions')   return r.isQuestion
    return true
  })

  // Non-member gate
  if (!isMember) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: '#EDE9FF' }}>
          <MessageSquarePlus size={26} style={{ color: '#5B4FCF' }} />
        </div>
        <p className="font-bold text-[16px]" style={{ color: t.text }}>Members only</p>
        <p className="text-[13px] leading-relaxed" style={{ color: t.textMuted }}>
          Join this plan to see and share reflections with other members.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 pb-28">

      {/* Filter + compose bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-full flex-1"
          style={{ background: t.bgMuted }}>
          {[
            { key: 'all',         label: 'All'         },
            { key: 'reflections', label: 'Reflections' },
            { key: 'questions',   label: 'Questions'   },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => setFilter(key)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all"
              style={{ color: filter === key ? '#5B4FCF' : t.textMuted }}>
              {filter === key && (
                <motion.div layoutId="ref-filter"
                  className="absolute inset-0 bg-white rounded-full shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setCompose(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px] flex-shrink-0 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}>
          <MessageSquarePlus size={14} /> Share
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: '#5B4FCF' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[36px]">✍️</p>
          <p className="font-bold text-[15px]" style={{ color: t.text }}>
            {filter === 'questions' ? 'No questions yet' : 'No reflections yet'}
          </p>
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            Be the first to share something from today's reading.
          </p>
          <button onClick={() => setCompose(true)}
            className="px-5 py-2.5 rounded-full font-bold text-[13px] text-white active:scale-95"
            style={{ background: '#5B4FCF' }}>
            Share now
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {filtered.map(item => (
            <ReflectionCard
              key={item.id}
              item={item}
              authUserId={authUser?.id}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Compose sheet */}
      <AnimatePresence>
        {compose && (
          <ComposeSheet
            planId={planId}
            currentDay={currentDay}
            onClose={() => setCompose(false)}
            onPosted={item => setItems(prev => [item, ...prev])}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  )
}