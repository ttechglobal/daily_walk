'use client'

// ── /checkin — Celebration screen ──
// Updates 5: challenge tagging uses challengeId, creates post when content present.
// "Share to community" removed — social lives in challenges only.

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Flame, ChevronDown, ChevronUp, BookOpen, MessageSquare, Trophy } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCheckin } from '../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../components/Toast'
import { SEED_CHALLENGES } from '../../lib/constants'
import Link from 'next/link'

// ── Confetti ──
const COLORS = ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#F9C74F','#FF6B6B','#0B7FAC','#9C5AB8']
function generateConfetti(n = 48) {
  return Array.from({ length: n }, (_, i) => ({
    id: i, x: (Math.random()-0.5)*340, y: Math.random()*-280+20,
    color: COLORS[i%COLORS.length], size: 6+Math.random()*7,
    delay: Math.random()*0.4, rotation: (Math.random()-0.5)*720,
  }))
}
function ConfettiPiece({ x, y, color, size, delay, rotation }) {
  return (
    <motion.div className="absolute rounded-sm pointer-events-none"
      style={{ left:'50%', top:'20%', width:size, height:size, background:color }}
      initial={{ x:0, y:0, opacity:1, rotate:0 }}
      animate={{ x, y, opacity:0, rotate:rotation }}
      transition={{ duration:1.4+Math.random()*0.6, delay, ease:'easeOut' }} />
  )
}

function CollapsibleCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-text-muted" />
          <span className="font-bold text-text-primary text-[14px]">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }} className="overflow-hidden">
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CheckinScreen() {
  const router       = useRouter()
  const [confetti]   = useState(() => generateConfetti())
  const { performCheckin, streak } = useCheckin()

  const [challenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const joinedChallenges = (challenges || []).filter(c => c.joined)

  // Pre-fill passage if arriving from /read (via query param)
  const [passage,      setPassage]      = useState('')
  const [reflection,   setReflection]   = useState('')
  const [challengeId,  setChallengeId]  = useState(null) // Update 5: use id not tag
  const [saving,       setSaving]       = useState(false)

  const today         = todayStr()
  const displayStreak = (streak?.current || 0) + (streak?.lastCheckinDate === today ? 0 : 1)

  function todayStr() { return new Date().toISOString().split('T')[0] }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    // performCheckin creates the Post in the challenge if challengeId + content provided
    performCheckin({ passage, reflection, challengeId })
    setSaving(false)
    showToast('Saved!')
    setTimeout(() => router.push('/journey'), 700)
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-warm-bg overflow-hidden pb-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {confetti.map(p => <ConfettiPiece key={p.id} {...p} />)}
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-14 pb-5 px-4">
        <motion.div initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:260, damping:18, delay:0.1 }}
          className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center mb-4">
          <CheckCircle2 size={44} className="text-sage" />
        </motion.div>
        <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className="font-display text-[28px] font-bold text-text-primary text-center">
          Well done!
        </motion.h1>
        <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.35 }}
          className="text-text-muted text-[15px] mt-1 text-center">
          Keep showing up. It adds up.
        </motion.p>
        <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.45, type:'spring' }}
          className="mt-4 flex items-center gap-2 bg-amber-light border border-amber/40 px-5 py-2.5 rounded-pill">
          <Flame size={18} className="text-amber flame-flicker" />
          <span className="font-bold text-[14px] text-amber-700">Day {displayStreak} streak</span>
        </motion.div>
      </div>

      {/* Log cards */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
        className="relative z-10 px-4 flex flex-col gap-3">

        <CollapsibleCard title="What did you read?" icon={BookOpen}>
          <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
            placeholder="e.g. Psalm 23, Romans 8..."
            className="w-full border border-gray-200 rounded-input px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
        </CollapsibleCard>

        <CollapsibleCard title="What stood out to you?" icon={MessageSquare}>
          <textarea value={reflection} onChange={e => setReflection(e.target.value)}
            placeholder="A reflection, anything..." rows={3}
            className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
        </CollapsibleCard>

        {/* ── Update 5: Tag a challenge ── */}
        <CollapsibleCard title="Tag a challenge (optional)" icon={Trophy} defaultOpen>
          {joinedChallenges.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-text-muted text-[13px]">Join a challenge to tag your check-in.</p>
              <Link href="/challenges" className="text-purple text-[13px] font-bold underline underline-offset-2">Browse challenges →</Link>
            </div>
          ) : (
            <>
              <p className="text-text-muted text-[13px] mb-3">Does this reading count toward a challenge?</p>
              <div className="flex flex-wrap gap-2">
                {joinedChallenges.map(c => (
                  <button key={c.id}
                    onClick={() => setChallengeId(prev => prev === c.id ? null : c.id)}
                    className={`px-3 py-2 rounded-full text-[13px] font-bold border-2 transition-all ${
                      challengeId === c.id ? 'bg-purple text-white border-purple' : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'
                    }`}>
                    {c.title}
                  </button>
                ))}
              </div>
              {challengeId && (
                <p className="text-sage text-[12px] font-semibold mt-2">
                  {passage.trim() || reflection.trim()
                    ? 'Your post will appear in this challenge.'
                    : 'Add a passage or reflection to post in the challenge feed.'}
                </p>
              )}
            </>
          )}
        </CollapsibleCard>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
        className="relative z-10 px-4 mt-5 flex flex-col items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold tracking-wide shadow-purple transition-all hover:bg-purple-dark active:scale-[0.97] disabled:opacity-60">
          {saving ? 'Saving...' : 'Save check-in'}
        </button>
        <p className="text-text-muted text-[12px] text-center px-4">
          Your check-in is saved to your Journey.
        </p>
      </motion.div>

      <ToastContainer />
    </div>
  )
}