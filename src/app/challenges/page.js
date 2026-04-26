'use client'

// ── /challenges — Challenge list page (Update 4) ──

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Users, CheckCircle2 } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { SEED_CHALLENGES, CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_STYLES } from '../../lib/constants'

export default function ChallengesPage() {
  const router = useRouter()
  const [challenges, setChallenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const [, , hydrated]              = useLocalStorage('dw_challenges', SEED_CHALLENGES)

  function toggleJoin(id) {
    setChallenges(prev => (prev || []).map(c => {
      if (c.id !== id) return c
      const nowJoined = !c.joined
      return { ...c, joined: nowJoined, joinCount: c.joinCount + (nowJoined ? 1 : -1) }
    }))
    const c = (challenges || []).find(c => c.id === id)
    showToast(c?.joined ? 'Left challenge' : 'Joined challenge!')
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-display text-[24px] font-bold text-text-primary">Challenges</h1>
        <Link
          href="/challenges/create"
          className="flex items-center gap-1.5 bg-purple text-white px-4 py-2 rounded-pill text-[13px] font-bold shadow-purple hover:bg-purple-dark transition-all"
        >
          <Plus size={14} />
          Create
        </Link>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 px-4 py-3 pb-8">
        {(challenges || []).map((c, idx) => {
          const start = new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const end   = new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="card p-4 flex flex-col gap-3"
            >
              {/* Tap body to open detail */}
              <Link href={`/challenges/${c.id}`} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-text-primary text-[15px] leading-snug flex-1">{c.title}</p>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${CHALLENGE_TYPE_STYLES[c.type]}`}>
                    {CHALLENGE_TYPE_LABELS[c.type]}
                  </span>
                </div>
                <p className="text-text-primary text-[13px] leading-relaxed">{c.description}</p>
                <div className="flex items-center gap-3 text-[12px] text-text-muted">
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>{c.joinCount} joined</span>
                  </div>
                  <span>·</span>
                  <span>by {c.createdBy}</span>
                  <span>·</span>
                  <span>{start} – {end}</span>
                </div>
              </Link>

              {/* Join button — separate from tap area */}
              <button
                onClick={() => toggleJoin(c.id)}
                className={`w-full rounded-pill py-2.5 text-[14px] font-bold transition-all active:scale-[0.97] ${
                  c.joined
                    ? 'bg-sage-light text-sage border-2 border-sage/30 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                    : 'bg-purple text-white shadow-purple hover:bg-purple-dark'
                }`}
              >
                {c.joined ? 'Joined ✓' : 'Join challenge'}
              </button>
            </motion.div>
          )
        })}
      </div>

      <ToastContainer />
    </div>
  )
}