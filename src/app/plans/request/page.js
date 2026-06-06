'use client'

// ── src/app/plans/request/page.js ──
// Users submit a topic/theme they want a Bible reading plan for.
// Matches against existing TOPICS and PLAN_TEMPLATES first.
// Falls back to queuing for admin review (plan_requests table).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, Send, CheckCircle2, Loader2, Lightbulb } from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { useAuthContext } from '../../../contexts/AuthContext'
import { ToastContainer, showToast } from '../../../components/Toast'
import { submitPlanRequest } from '../../../lib/supabase/plans'
import { TOPICS, PLAN_TEMPLATES } from '../../../lib/reading-data'

// Popular suggestions to surface
const SUGGESTIONS = [
  'Overcoming fear', 'Marriage and relationships', 'Leadership',
  'Grief and healing', 'Forgiveness', 'Financial wisdom', 'Prayer',
  'Identity in Christ', 'Anxiety and peace', 'Parenting',
  'Purpose and calling', 'Spiritual warfare',
]

export default function PlanRequestPage() {
  const { t }    = useTheme()
  const { user } = useAuthContext()
  const router   = useRouter()

  const [topic,     setTopic]     = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [matchedPlan, setMatchedPlan] = useState(null)

  // Live matching: find existing topics/templates that match the input
  const lowerTopic = topic.toLowerCase().trim()
  const matches = lowerTopic.length >= 3
    ? [
        ...TOPICS.filter(t =>
          t.name.toLowerCase().includes(lowerTopic) ||
          t.description?.toLowerCase().includes(lowerTopic)
        ).map(t => ({ type: 'topic', id: t.id, name: t.name, icon: t.icon, color: t.color })),
        ...PLAN_TEMPLATES.filter(t =>
          t.name.toLowerCase().includes(lowerTopic) ||
          t.description?.toLowerCase().includes(lowerTopic)
        ).map(t => ({ type: 'template', id: t.id, name: t.name, icon: t.icon, color: t.color })),
      ].slice(0, 4)
    : []

  async function handleSubmit() {
    if (!user) { router.push('/auth?next=/plans/request'); return }
    if (!topic.trim()) return
    setSubmitting(true)
    try {
      await submitPlanRequest(topic.trim())
      setSubmitted(true)
    } catch (e) {
      showToast(e.message || 'Something went wrong — try again')
    } finally {
      setSubmitting(false)
    }
  }

  function handleMatchClick(match) {
    if (match.type === 'topic') {
      router.push(`/plans/create?mode=topic&topicId=${match.id}`)
    } else {
      router.push(`/plans/create?template=${match.id}`)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 gap-5"
        style={{ background: t.bg }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#E8F4ED' }}>
          <CheckCircle2 size={32} style={{ color: '#4A7C5F' }} />
        </motion.div>
        <div className="text-center">
          <p className="font-bold text-[20px] mb-1" style={{ color: t.text }}>Request submitted!</p>
          <p className="text-[14px] leading-relaxed" style={{ color: t.textMuted }}>
            We'll build a plan on <span className="font-semibold" style={{ color: t.text }}>"{topic}"</span> and
            notify you when it's ready.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => router.push('/plans')}
            className="w-full py-4 rounded-full text-white font-bold text-[15px]"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            Browse existing plans
          </button>
          <button
            onClick={() => { setSubmitted(false); setTopic('') }}
            className="w-full py-3 text-[14px] font-semibold"
            style={{ color: t.textMuted }}>
            Request another plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgCard, boxShadow: t.shadow }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <h1 className="font-bold text-[18px]" style={{ color: t.text }}>Request a Plan</h1>
      </div>

      <div className="flex-1 px-4 flex flex-col gap-5 pb-24">

        {/* Hero blurb */}
        <div className="rounded-[18px] px-4 py-4 flex gap-3"
          style={{ background: '#EDE9FF' }}>
          <Lightbulb size={20} style={{ color: '#5B4FCF', flexShrink: 0 }} />
          <p className="text-[14px] leading-relaxed" style={{ color: '#5B4FCF' }}>
            Don't see a plan on the topic you need? Tell us what you're looking for — we'll build it.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-[14px]" style={{ color: t.text }}>
            What topic or theme do you want to study?
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: t.textFaint }} />
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. overcoming fear, marriage, identity in Christ…"
              maxLength={120}
              className="w-full pl-10 pr-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none transition-all"
              style={{
                background:   t.bgInput,
                borderColor:  topic ? '#5B4FCF' : t.borderInput,
                color:        t.text,
              }}
            />
          </div>
          <p className="text-[11px] text-right" style={{ color: t.textFaint }}>
            {topic.length}/120
          </p>
        </div>

        {/* Live matches */}
        <AnimatePresence>
          {matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              <p className="font-bold text-[13px]" style={{ color: t.textMuted }}>
                We already have plans on this →
              </p>
              {matches.map(m => (
                <button key={`${m.type}-${m.id}`}
                  onClick={() => handleMatchClick(m)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-left active:opacity-80 transition-all"
                  style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                    style={{ background: `${m.color || '#5B4FCF'}18` }}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate" style={{ color: t.text }}>{m.name}</p>
                    <p className="text-[11px]" style={{ color: t.textFaint }}>
                      {m.type === 'topic' ? 'Topical study' : 'Plan template'}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold px-3 py-1 rounded-full"
                    style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
                    Start →
                  </span>
                </button>
              ))}
              <p className="text-[12px]" style={{ color: t.textFaint }}>
                Or submit below if none of these fit.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {!topic && (
          <div className="flex flex-col gap-2">
            <p className="font-bold text-[13px]" style={{ color: t.textMuted }}>Popular requests</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s}
                  onClick={() => setTopic(s)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold border"
                  style={{ background: t.bgCard, borderColor: t.border, color: t.textMuted }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-2 mt-auto pt-4">
          <button
            onClick={handleSubmit}
            disabled={!topic.trim() || submitting}
            className="w-full py-4 rounded-full text-white font-bold text-[16px] disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
              : <><Send size={16} /> Submit Request</>
            }
          </button>
          <p className="text-center text-[12px]" style={{ color: t.textFaint }}>
            You'll be notified in-app when your plan is ready.
          </p>
        </div>

      </div>
    </div>
  )
}