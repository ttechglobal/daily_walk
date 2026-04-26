'use client'

// ── /challenges/[id] — Update 3+4: no fake data, real posts only ──
// Posts come from challenge.posts[] in localStorage.
// Delete button on own posts (userId === 'local_user').
// No likes, no comments, no fake counts.

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Send, X, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  SEED_CHALLENGES, CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_STYLES,
  getChallengeProgress, avatarColor, initials, todayStr, formatTimestamp
} from '../../../lib/constants'
import { useCheckin } from '../../../hooks/useCheckin'

// ── Post composer sheet ──
function ComposeSheet({ challenge, onClose }) {
  const [passage,    setPassage]    = useState('')
  const [reflection, setReflection] = useState('')
  const [challenges, setChallenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const [user]                      = useLocalStorage('dw_user', null)

  function submit() {
    if (!passage.trim() && !reflection.trim()) { showToast('Add a passage or reflection'); return }
    const displayName = user?.name?.trim() || 'Anonymous'
    const post = {
      id: `post_${Date.now()}`, userId: 'local_user', displayName,
      passage: passage.trim(), reflection: reflection.trim(),
      challengeId: challenge.id, createdAt: new Date().toISOString(),
    }
    setChallenges(prev => (prev || []).map(c =>
      c.id === challenge.id ? { ...c, posts: [post, ...(c.posts || [])] } : c
    ))
    showToast('Posted!')
    onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'88dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Sharing to</p>
            <p className="font-bold text-text-primary text-[15px] truncate">{challenge.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3 flex-shrink-0"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4 scroll-hide">
          <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
            placeholder="What did you read? e.g. John 3" autoFocus
            className="w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
          <textarea value={reflection} onChange={e => setReflection(e.target.value)}
            placeholder="What stood out? (optional)" rows={3}
            className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
          <button onClick={submit}
            className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark active:scale-[0.97] transition-all">
            Post →
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ── Post card — Update 4: no likes/comments, delete own posts ──
function PostCard({ post, onDelete }) {
  const isOwn = post.userId === 'local_user'
  return (
    <div className="card p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: avatarColor(post.displayName) }}>
          {initials(post.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary text-[14px] truncate">{post.displayName}</p>
          <p className="text-text-muted text-[11px]">{formatTimestamp(post.createdAt)}</p>
        </div>
        {/* Delete button — own posts only */}
        {isOwn && (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            aria-label="Delete post">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {post.passage && (
        <p className="font-display font-semibold text-purple text-[14px]">{post.passage}</p>
      )}
      {post.reflection && (
        <p className="text-text-primary text-[13px] leading-relaxed">"{post.reflection}"</p>
      )}
    </div>
  )
}

export default function ChallengeDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [compose, setCompose] = useState(false)

  const [challenges, setChallenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const [checkins]                  = useLocalStorage('dw_checkins', [])
  const [, , hydrated]              = useLocalStorage('dw_challenges', SEED_CHALLENGES)

  const challenge = (challenges || []).find(c => c.id === id)

  function toggleJoin() {
    if (!challenge) return
    setChallenges(prev => (prev || []).map(c =>
      c.id === id ? { ...c, joined: !c.joined, joinCount: Math.max(0, c.joinCount + (c.joined ? -1 : 1)) } : c
    ))
    showToast(challenge.joined ? 'Left challenge' : 'Joined challenge!')
  }

  function deletePost(postId) {
    setChallenges(prev => (prev || []).map(c =>
      c.id === id ? { ...c, posts: (c.posts || []).filter(p => p.id !== postId) } : c
    ))
    showToast('Post deleted')
  }

  if (!hydrated) return null
  if (!challenge) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p className="text-text-muted text-center">Challenge not found.</p>
      <button onClick={() => router.push('/challenges')} className="text-purple font-semibold underline">Back to challenges</button>
    </div>
  )

  const start = new Date(challenge.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end   = new Date(challenge.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const { completed, total } = getChallengeProgress(challenge, checkins)
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0
  const posts = challenge.posts || []

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg overflow-x-hidden">

      {/* ── Hero strip ── */}
      <div style={{ background: 'linear-gradient(135deg, #5B4FCF 0%, #3D3190 100%)' }}>
        <div className="px-4 pt-5 pb-2">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="px-5 pb-6">
          <h1 className="font-display text-[26px] font-bold text-white leading-snug mb-3 pr-4">
            {challenge.title}
          </h1>
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              {CHALLENGE_TYPE_LABELS[challenge.type]}
            </span>
            <div className="flex items-center gap-1 text-white/80 text-[13px]">
              <Users size={13} /><span>{challenge.joinCount} joined</span>
            </div>
            <span className="text-white/60 text-[12px]">{start} – {end}</span>
          </div>
          <p className="text-white/80 text-[14px] leading-relaxed mb-4">{challenge.description}</p>

          {challenge.joined && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-white/70 text-[12px] font-semibold">Your progress</p>
                <p className="text-white font-bold text-[12px]">{completed}/{total} days</p>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-amber rounded-full"
                  initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7, ease:'easeOut' }} />
              </div>
            </div>
          )}

          <button onClick={toggleJoin}
            className={`w-full rounded-pill py-3.5 text-[15px] font-bold transition-all active:scale-[0.97] ${
              challenge.joined
                ? 'bg-white/20 text-white border-2 border-white/30 hover:bg-white/10'
                : 'bg-white text-purple hover:bg-white/90'
            }`}>
            {challenge.joined ? 'Joined ✓' : 'Join challenge'}
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="flex flex-col gap-3 px-4 py-5 pb-28">
        <p className="text-[13px] font-bold text-text-primary">What people are sharing</p>

        {posts.length === 0 ? (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <p className="font-display text-[16px] font-semibold text-text-primary">No posts yet in this challenge.</p>
            <p className="text-text-muted text-[13px] leading-relaxed">
              Check in and tag this challenge to be the first.
            </p>
          </div>
        ) : (
          posts.map((post, idx) => (
            <motion.div key={post.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.04 }}>
              <PostCard post={post} onDelete={() => deletePost(post.id)} />
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setCompose(true)}
        className="fixed bottom-28 right-4 w-14 h-14 rounded-full bg-purple text-white flex items-center justify-center shadow-purple hover:bg-purple-dark active:scale-95 transition-all z-40"
        aria-label="Post to challenge">
        <Send size={20} />
      </button>

      <AnimatePresence>
        {compose && <ComposeSheet challenge={challenge} onClose={() => setCompose(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}