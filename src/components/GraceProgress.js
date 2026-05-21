'use client'

// ── src/components/GraceProgress.js ──
// Grace-first progress display. Replaces any screen that communicates guilt or shame.
//
// Rules enforced:
//  • Streaks are CONSISTENCY CELEBRATIONS, not pressure mechanics
//  • Missing days = grace message + clear "Start Again" CTA
//  • No language like "Don't break your streak!" or "You missed X days"
//  • Progress shown as a journey, not a score
//  • Return after a gap = celebrated, not judged

import { motion } from 'framer-motion'
import { Flame, BookOpen, RefreshCw, Heart } from 'lucide-react'

// ─────────────────────────────────────────────
//  Grace messages — gospel-centred, warm, non-shaming
// ─────────────────────────────────────────────
const GRACE_MESSAGES = [
  {
    headline: 'Jesus restores — pick up where you left off.',
    sub:      'Every day is a new beginning. Grace isn\'t a reason to stop — it\'s a reason to start again.',
    icon:     '🕊️',
  },
  {
    headline: 'You are forgiven. Go and sin no more.',
    sub:      'The Word is waiting for you. One chapter today is all it takes to begin again.',
    icon:     '✝️',
  },
  {
    headline: 'Grace isn\'t a reason to stop. It\'s a reason to start again.',
    sub:      'God\'s mercies are new every morning. So is your opportunity to read and grow.',
    icon:     '🌅',
  },
  {
    headline: 'He who began a good work in you will carry it on to completion.',
    sub:      'Philippians 1:6. Your journey isn\'t over — it\'s just waiting for you.',
    icon:     '🌱',
  },
  {
    headline: 'Come as you are. The Bible is open.',
    sub:      'No preparation needed. No guilt required. Just open the Word and start.',
    icon:     '📖',
  },
]

function getDaysSince(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}

// ─────────────────────────────────────────────
//  Streak celebration — used when streak is active
// ─────────────────────────────────────────────
export function StreakCelebration({ streak, onPress }) {
  if (!streak?.current || streak.current < 1) return null

  const messages = {
    1:  'Day 1 — a great start! 🌱',
    3:  'Three days in a row — a habit is forming! 🔥',
    7:  'One full week! You\'re building something beautiful. ✨',
    14: 'Two weeks of consistency — God is pleased. 🙌',
    21: '21 days! A habit is officially formed. Keep walking.',
    30: 'A whole month! This is extraordinary faithfulness.',
  }

  const msg = messages[streak.current]
    || (streak.current % 10 === 0 ? `${streak.current} days of consistent reading — well done!` : null)

  const count = streak.current

  return (
    <motion.button
      onClick={onPress}
      initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-left"
      style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 flex-shrink-0">
        <Flame size={20} className="text-amber"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] text-white">
          {count} day{count !== 1 ? 's' : ''} in a row
        </p>
        {msg && <p className="text-[12px] text-white/80 mt-0.5">{msg}</p>}
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Grace card — shown when user has missed days
//  Never mentions guilt, shame, or failure
// ─────────────────────────────────────────────
export function GraceCard({ lastCheckinDate, onStartAgain, planName }) {
  const daysSince = getDaysSince(lastCheckinDate)
  const msgIndex  = lastCheckinDate
    ? Math.min(Math.floor(daysSince / 3), GRACE_MESSAGES.length - 1)
    : 0
  const msg = GRACE_MESSAGES[msgIndex]

  return (
    <motion.div
      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className="w-full rounded-[20px] overflow-hidden"
      style={{ background:'white', border:'1.5px solid #EDE9FF' }}>

      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28, lineHeight:1, flexShrink:0 }}>{msg.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[17px] text-text-primary leading-snug">
              {msg.headline}
            </p>
            <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">{msg.sub}</p>
          </div>
        </div>

        {planName && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-[12px]" style={{background:'#EDE9FF'}}>
            <BookOpen size={13} className="text-purple flex-shrink-0"/>
            <p className="text-[13px] font-semibold text-purple truncate">{planName}</p>
          </div>
        )}

        {/* Primary CTA — shame-free, prominent */}
        <button
          onClick={onStartAgain}
          className="w-full mt-4 py-3.5 rounded-full text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <RefreshCw size={16}/>
          Start reading today
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Plan progress bar — journey framing, not score
// ─────────────────────────────────────────────
export function PlanProgress({ plan, compact = false }) {
  if (!plan) return null
  const total    = plan.totalDays || plan.days?.length || 1
  const current  = plan.currentDay || 1
  const pct      = Math.min(100, Math.round(((current - 1) / total) * 100))
  const done     = (plan.days || []).filter(d => d.completedAt).length

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-purple-light overflow-hidden">
          <div className="h-full rounded-full bg-purple transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <span className="text-[11px] font-bold text-purple flex-shrink-0">{pct}%</span>
      </div>
    )
  }

  // Journey milestones (quarters of the plan)
  const milestones = [25, 50, 75, 100]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-text-primary">
          Day {current} of {total}
        </p>
        <p className="text-[13px] font-bold text-purple">{pct}%</p>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-purple-light rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-purple"
          initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:0.6, ease:'easeOut' }}
        />
        {/* Milestone markers */}
        {milestones.map(m => (
          <div key={m} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white"
            style={{
              left:       `${m}%`,
              background: pct >= m ? '#5B4FCF' : '#E0DCFF',
              transform:  'translate(-50%, -50%)',
            }}/>
        ))}
      </div>

      <p className="text-[12px] text-text-muted">
        {done > 0
          ? `${done} day${done !== 1 ? 's' : ''} read — keep going! 🙌`
          : 'Your journey starts with the first day.'
        }
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Return celebration — member comes back after a gap
//  Shown to community members, not to the returning user
// ─────────────────────────────────────────────
export function ReturnCelebration({ memberName, planName }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
      className="px-4 py-3 rounded-[16px] flex items-center gap-3"
      style={{ background:'#E8F5EE', border:'1.5px solid #4A7C5F30' }}>
      <Heart size={18} style={{ color:'#4A7C5F', flexShrink:0 }}/>
      <p className="text-[13px] leading-relaxed" style={{ color:'#2D5A40' }}>
        <strong>{memberName}</strong> is back on{' '}
        <em>{planName}</em> — encourage them! 🙏
      </p>
    </motion.div>
  )
}

export default { StreakCelebration, GraceCard, PlanProgress, ReturnCelebration }