'use client'

// ── src/app/qa/[id]/QuestionDetailClient.js ──
// Question detail: the question, all answers, answer composer.
// Answers with scripture references are visually distinguished — anchored, trustworthy.
// Tone: safe, humble, scripture-grounded.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Heart, Send, Loader2,
  Check, MessageSquare, Trash2,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import { useAuthGate } from '../../../components/AuthGate'
import {
  getQuestion, getAnswers, postAnswer,
  deleteAnswer, deleteQuestion, toggleHelped,
} from '../../../lib/supabase/qa'
import { parseScriptureRefs } from '../../../lib/scripture'
import ScriptureSheet from '../../../components/ScriptureSheet'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return new Date(d).toLocaleDateString('en-US', {month:'short',day:'numeric'})
}

function Avatar({ name, avatar, size = 36 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
  return <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.38)}}>{ini}</div>
}

// ─────────────────────────────────────────────
//  Answer card — scripture-grounded answers look different
// ─────────────────────────────────────────────
function AnswerCard({ answer, onHelped, onDelete }) {
  const { t }          = useTheme()
  const [helped,   setHelped]   = useState(answer.helped)
  const [count,    setCount]    = useState(answer.helpedCount)
  const [scripture, setScripture] = useState(null)

  const passageRef = answer.passage ? parseScriptureRefs(answer.passage)?.[0] : null
  const hasScripture = !!answer.passage

  async function handleHelped() {
    try {
      const now = await toggleHelped('answer', answer.id)
      setHelped(now); setCount(c => c + (now ? 1 : -1))
      onHelped?.(answer.id, now)
    } catch (e) {
      if (e.message === 'not_authenticated') showToast('Sign in to mark helpful')
    }
  }

  return (
    <>
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: hasScripture ? t.sageLight || '#F0F7F2' : t.bgCard,
          border:     hasScripture ? `1.5px solid ${t.sage || '#4A7C5F'}30` : `1.5px solid ${t.border}`,
        }}>

        {/* Scripture anchor badge — makes this answer look grounded */}
        {answer.passage && (
          <button
            onClick={() => passageRef && setScripture(passageRef)}
            className="w-full flex items-center gap-2 px-4 py-2.5 border-b text-left transition-opacity active:opacity-70"
            style={{
              background:  t.sage ? `${t.sage}15` : '#E8F5EE',
              borderColor: t.sage ? `${t.sage}20` : '#C8E6CF',
            }}>
            <BookOpen size={13} style={{color: t.sage || '#4A7C5F', flexShrink:0}}/>
            <p className="text-[13px] font-bold" style={{color: t.sage || '#4A7C5F'}}>
              {answer.passage}
            </p>
            {passageRef && (
              <span className="text-[11px] ml-auto" style={{color:t.textFaint}}>Tap to read →</span>
            )}
          </button>
        )}

        <div className="p-4">
          {/* Author */}
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={answer.authorName} avatar={answer.authorAvatar} size={30}/>
            <div>
              <p className="font-bold text-[13px] text-text-primary">{answer.authorName}</p>
              <p className="text-[11px] text-text-muted">{timeAgo(answer.createdAt)}</p>
            </div>
            {answer.isOwn && (
              <button onClick={() => onDelete?.(answer.id)}
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center active:bg-red-50">
                <Trash2 size={12} className="text-text-muted"/>
              </button>
            )}
          </div>

          {/* Body */}
          <p className="text-[14px] leading-[1.75] text-text-primary">{answer.body}</p>

          {/* This helped me */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
            <button onClick={handleHelped}
              className="flex items-center gap-1.5 transition-all active:scale-90"
              style={{color: helped ? '#5B4FCF' : '#9CA3AF'}}>
              <Heart size={15} fill={helped ? '#5B4FCF' : 'none'} stroke={helped ? '#5B4FCF' : '#9CA3AF'}/>
              <span className="text-[12px] font-semibold">
                {helped ? 'This helped me' : 'This helped me'}
                {count > 0 && <span className="ml-1 opacity-60">· {count}</span>}
              </span>
            </button>
            {hasScripture && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:'#4A7C5F15', color:'#4A7C5F'}}>
                Scripture-grounded
              </span>
            )}
          </div>
        </div>
      </div>

      {scripture && <ScriptureSheet reference={scripture} onClose={() => setScripture(null)}/>}
    </>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function QuestionDetailClient({ questionId }) {
  const router = useRouter()
  const { t }  = useTheme()
  const { requireAuth } = useAuthGate()

  const [question, setQuestion] = useState(null)
  const [answers,  setAnswers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [answerBody,    setAnswerBody]    = useState('')
  const [answerPassage, setAnswerPassage] = useState('')
  const [sending,  setSending]  = useState(false)

  const bottomRef = useRef(null)

  useEffect(() => {
    if (!questionId) return
    Promise.all([getQuestion(questionId), getAnswers(questionId)]).then(([q, a]) => {
      setQuestion(q); setAnswers(a); setLoading(false)
    }).catch(() => setLoading(false))
  }, [questionId])

  async function submitAnswer() {
    if (!answerBody.trim()) return
    setSending(true)
    try {
      const a = await postAnswer({ questionId, body: answerBody, passage: answerPassage })
      setAnswers(prev => [...prev, a])
      setAnswerBody(''); setAnswerPassage('')
      setQuestion(q => q ? {...q, answerCount: q.answerCount + 1} : q)
      setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)
    } catch (e) {
      if (e.message === 'not_authenticated') showToast('Sign in to answer')
      else showToast('Something went wrong')
    } finally { setSending(false) }
  }

  function handleDeleteAnswer(id) {
    if (!confirm('Delete this answer?')) return
    deleteAnswer(id).catch(() => null)
    setAnswers(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:t.bg}}>
      <Loader2 size={24} className="animate-spin text-purple"/>
    </div>
  )

  if (!question) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{background:t.bg}}>
      <p className="font-bold text-[18px]" style={{color:t.text}}>Question not found</p>
      <button onClick={() => router.push('/qa')}
        className="px-5 py-2.5 rounded-full text-white font-bold text-[14px]"
        style={{background:'#5B4FCF'}}>Back to Q&A</button>
    </div>
  )

  const questionRef = question.passage ? parseScriptureRefs(question.passage)?.[0] : null
  const [scriptureOpen, setScriptureOpen] = useState(null)

  return (
    <div className="flex flex-col min-h-screen" style={{background:t.bg}}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.push('/qa')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{background:t.bgCard, boxShadow:t.shadow}}>
          <ArrowLeft size={18} style={{color:t.text}}/>
        </button>
        <p className="font-bold text-[16px] flex-1" style={{color:t.text}}>Question</p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 flex flex-col gap-4">

        {/* ── The question ── */}
        <div className="bg-white rounded-[20px] p-5 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={question.authorName} avatar={question.authorAvatar} size={36}/>
            <div>
              <p className="font-bold text-[13px] text-text-primary">{question.authorName}</p>
              <p className="text-[11px] text-text-muted">{timeAgo(question.createdAt)}</p>
            </div>
          </div>

          {question.passage && (
            <button onClick={() => questionRef && setScriptureOpen(questionRef)}
              className="flex items-center gap-2 mb-3 pl-0.5 text-left active:opacity-70 transition-opacity">
              <BookOpen size={13} className="text-purple flex-shrink-0"/>
              <p className="text-[13px] font-bold text-purple">{question.passage}</p>
            </button>
          )}

          <p className="font-display font-bold text-[18px] text-text-primary leading-snug mb-2">
            {question.title}
          </p>

          {question.body && (
            <p className="text-[14px] leading-relaxed text-text-muted">{question.body}</p>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-text-muted">
              <MessageSquare size={14}/>
              <span className="text-[12px]">{answers.length} answers</span>
            </div>
          </div>
        </div>

        {/* ── Answers ── */}
        {answers.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background:t.purpleBg||'#EDE9FF'}}>
              <BookOpen size={20} className="text-purple"/>
            </div>
            <p className="font-semibold text-[15px] text-text-primary">No answers yet</p>
            <p className="text-[13px] text-text-muted">Be the first to answer — especially with scripture.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted px-1">
              {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
            </p>
            {answers.map(a => (
              <AnswerCard key={a.id} answer={a}
                onHelped={(id, now) => setAnswers(prev => prev.map(x => x.id !== id ? x : {...x, helped:now, helpedCount:x.helpedCount+(now?1:-1)}))}
                onDelete={handleDeleteAnswer}/>
            ))}
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* ── Answer composer ── fixed at bottom ── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t flex flex-col gap-2 px-4 pt-3"
        style={{
          background:    t.bgCard,
          borderColor:   t.border,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          zIndex:        40,
        }}>
        {/* Scripture prompt */}
        <input
          value={answerPassage}
          onChange={e => setAnswerPassage(e.target.value)}
          placeholder='📖 Add a scripture reference (e.g. "Romans 8:28")'
          className="w-full rounded-[12px] px-3.5 py-2 text-[13px] focus:outline-none"
          style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${answerPassage ? '#4A7C5F' : t.border}`}}
        />
        <div className="flex items-end gap-2">
          <textarea
            value={answerBody}
            onChange={e => setAnswerBody(e.target.value.slice(0, 2000))}
            onKeyDown={e => e.key==='Enter' && e.metaKey && submitAnswer()}
            placeholder="Share what God has shown you about this…"
            rows={2}
            className="flex-1 rounded-[12px] px-3.5 py-2.5 text-[14px] resize-none focus:outline-none"
            style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${t.border}`}}
          />
          <button onClick={submitAnswer} disabled={!answerBody.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all"
            style={{background:'#5B4FCF'}}>
            {sending ? <Loader2 size={15} className="animate-spin text-white"/> : <Send size={15} className="text-white"/>}
          </button>
        </div>
        {answerPassage && (
          <p className="text-[11px] font-bold" style={{color:'#4A7C5F'}}>
            ✓ Your answer will be marked as scripture-grounded
          </p>
        )}
      </div>

      {scriptureOpen && <ScriptureSheet reference={scriptureOpen} onClose={() => setScriptureOpen(null)}/>}
    </div>
  )
}