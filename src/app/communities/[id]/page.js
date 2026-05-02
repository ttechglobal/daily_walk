'use client'

// ── /communities/[id] — Update 3: alive community detail ──
// Hero uses category colour gradient. Post composer creates check-in.
// FAB icon is PenLine. Blur overlay on Members if not joined.

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, PenLine, Plus, X, Users, Trash2, UserMinus } from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { useCheckin } from '../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  SEED_COMMUNITIES, SEED_CHALLENGES, CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_STYLES,
  avatarColor, initials, todayStr, formatTimestamp
} from '../../../lib/constants'

const CATEGORY_COLORS = {
  'Bible Study':   '#5B4FCF',
  'Prayer':        '#4A7C5F',
  'Mental Health': '#7CB9E8',
  'Youth':         '#E8A838',
  'Worship':       '#C77DFF',
  'General':       '#888780',
}

// ── Post composer sheet ──
function ComposeSheet({ community, onClose }) {
  const [passage,    setPassage]    = useState('')
  const [reflection, setReflection] = useState('')
  const [comms,  setComms]  = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [user]              = useLocalStorage('dw_user', null)
  const { performCheckin, isCheckedInToday } = useCheckin()

  function submit() {
    if (!passage.trim() && !reflection.trim()) { showToast('Add a passage or reflection'); return }
    const displayName = user?.name?.trim() || 'Anonymous'
    const post = {
      id: `p_${Date.now()}`, userId: 'local_user', displayName,
      passage: passage.trim(), reflection: reflection.trim(),
      communityId: community.id, createdAt: new Date().toISOString(),
    }
    setComms(prev => (prev || []).map(c =>
      c.id === community.id ? { ...c, posts: [post, ...(c.posts || [])] } : c
    ))
    // Also create a check-in if not already done today
    if (!isCheckedInToday) {
      performCheckin({ passage: passage.trim(), reflection: reflection.trim() })
    }
    showToast('Posted!')
    onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '88dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Sharing to</p>
            <p className="font-bold text-[15px] truncate" style={{ color: '#1A1A2E' }}>{community.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4 scroll-hide">
          <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
            placeholder="What did you read? e.g. John 3" autoFocus
            className="w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" style={{ color:'#1A1A2E' }} />
          <textarea value={reflection} onChange={e => setReflection(e.target.value)}
            placeholder="Share a reflection... (optional)" rows={3}
            className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" style={{ color:'#1A1A2E' }} />
          <button onClick={submit} className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all" style={{ background:'#5B4FCF' }}>
            Post →
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ── Post card ──
function PostCard({ post, onDelete }) {
  return (
    <div className="bg-white rounded-[16px] shadow-card p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: avatarColor(post.displayName) }}>
          {initials(post.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] truncate" style={{ color:'#1A1A2E' }}>{post.displayName}</p>
          <p className="text-[11px]" style={{ color:'#6B7280' }}>{formatTimestamp(post.createdAt)}</p>
        </div>
        {post.userId === 'local_user' && (
          <button onClick={onDelete} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0" style={{ color:'#9CA3AF' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {post.passage    && <p className="font-display font-semibold text-[14px]" style={{ color:'#5B4FCF' }}>{post.passage}</p>}
      {post.reflection && <p className="text-[13px] leading-relaxed" style={{ color:'#1A1A2E' }}>"{post.reflection}"</p>}
    </div>
  )
}

export default function CommunityDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [tab,     setTab]     = useState('feed')
  const [compose, setCompose] = useState(false)

  const [communities, setCommunities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [challenges,  setChallenges]  = useLocalStorage('dw_challenges',  SEED_CHALLENGES)
  const [user]                        = useLocalStorage('dw_user', null)
  const [, , hydrated]                = useLocalStorage('dw_communities', SEED_COMMUNITIES)

  const community = (communities || []).find(c => c.id === id)
  const catColor  = community ? (CATEGORY_COLORS[community.category] || '#5B4FCF') : '#5B4FCF'

  function toggleJoin() {
    if (!community) return
    setCommunities(prev => (prev || []).map(c =>
      c.id === id ? { ...c, joined: !c.joined, memberCount: Math.max(0, c.memberCount + (c.joined ? -1 : 1)) } : c
    ))
    showToast(community.joined ? 'Left community' : 'Joined!')
  }

  function deletePost(postId) {
    setCommunities(prev => (prev || []).map(c =>
      c.id === id ? { ...c, posts: (c.posts || []).filter(p => p.id !== postId) } : c
    ))
  }

  function toggleChallengeJoin(cid) {
    setChallenges(prev => (prev || []).map(c =>
      c.id !== cid ? c : { ...c, joined: !c.joined, joinCount: Math.max(0, c.joinCount + (c.joined ? -1 : 1)) }
    ))
  }

  if (!hydrated) return null
  if (!community) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p style={{ color:'#6B7280' }}>Community not found.</p>
      <button onClick={() => router.push('/communities')} className="font-semibold underline" style={{ color:'#5B4FCF' }}>Back</button>
    </div>
  )

  const posts      = community.posts || []
  const commChalls = (challenges || []).filter(c => c.communityId === id)

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden" style={{ background:'#FAF8F5' }}>

      {/* ── Hero — category colour gradient + large initial ── */}
      <div
        className="relative flex flex-col"
        style={{
          height: 160,
          background: `linear-gradient(135deg, ${catColor}22, ${catColor}55)`,
        }}
      >
        {/* Back button */}
        <div className="absolute top-5 left-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center hover:bg-white/90 transition-colors"
            style={{ color:'#1A1A2E' }}>
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Centred content */}
        <div className="flex flex-col items-center justify-center flex-1 pb-2">
          <p className="font-display font-bold" style={{ fontSize: 72, lineHeight: 1, color: catColor, opacity: 0.9 }}>
            {community.name[0].toUpperCase()}
          </p>
          <p className="font-display font-bold text-[22px] mt-1" style={{ color:'#1A1A2E' }}>
            {community.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:`${catColor}22`, color: catColor }}>
              {community.category}
            </span>
            <div className="flex items-center gap-1 text-[12px]" style={{ color:'#6B7280' }}>
              <Users size={12} />
              <span>{community.memberCount + (community.joined ? 1 : 0)} members</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #F0EDE8' }}>
        {community.joined ? (
          <div className="flex gap-2">
            <button
              onClick={() => showToast('Invite link coming soon')}
              className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 transition-all"
              style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}
            >
              Invite Friend
            </button>
            <button
              onClick={toggleJoin}
              className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 transition-all hover:bg-red-50"
              style={{ borderColor:'#EF4444', color:'#EF4444' }}
            >
              Leave
            </button>
          </div>
        ) : (
          <button
            onClick={toggleJoin}
            className="w-full text-white rounded-pill py-3.5 text-[15px] font-bold transition-all active:scale-[0.97] hover:opacity-90"
            style={{ background:'#5B4FCF' }}
          >
            Join Community
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[
            { key:'feed',       label:'Feed'       },
            { key:'challenges', label:'Challenges' },
            { key:'members',    label:'Members'    },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[12px] font-bold transition-all capitalize"
              style={tab === t.key ? { color:'#5B4FCF' } : { color:'#6B7280' }}
            >
              {tab === t.key && (
                <motion.div
                  layoutId="comm-tab-bg"
                  className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type:'spring', stiffness:400, damping:35 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed tab ── */}
      {tab === 'feed' && (
        <div className="flex flex-col gap-3 px-4 py-4 pb-28">
          {posts.length === 0 ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="bg-white rounded-[20px] shadow-card p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:`${catColor}15` }}>
                <PenLine size={24} style={{ color: catColor }} />
              </div>
              <p className="font-display text-[16px] font-semibold" style={{ color:'#1A1A2E' }}>No posts yet</p>
              <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>
                Check in and tag this community to start the feed.
              </p>
            </motion.div>
          ) : (
            posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
                <PostCard post={post} onDelete={() => deletePost(post.id)} />
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Challenges tab ── */}
      {tab === 'challenges' && (
        <div className="flex flex-col gap-3 px-4 py-4 pb-8">
          <button
            onClick={() => router.push('/challenges/create')}
            className="w-full flex items-center justify-center gap-2 rounded-[20px] py-4 text-[14px] font-bold border-2 border-dashed hover:bg-purple-light transition-colors"
            style={{ borderColor:'rgba(91,79,207,0.3)', color:'#5B4FCF' }}>
            <Plus size={16} /> Create Challenge
          </button>

          {commChalls.length === 0 ? (
            <div className="bg-white rounded-[20px] shadow-card p-8 text-center">
              <p className="text-[14px] font-semibold" style={{ color:'#1A1A2E' }}>No challenges yet</p>
              <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>Create one to get the community going.</p>
            </div>
          ) : (
            commChalls.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
                className="bg-white rounded-[16px] shadow-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[14px] leading-snug flex-1" style={{ color:'#1A1A2E' }}>{c.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${CHALLENGE_TYPE_STYLES[c.type]}`}>
                    {CHALLENGE_TYPE_LABELS[c.type]}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>{c.description}</p>
                <button onClick={() => toggleChallengeJoin(c.id)}
                  className="w-full rounded-pill py-2.5 text-[13px] font-bold transition-all active:scale-[0.97]"
                  style={c.joined
                    ? { background:'#E8F4ED', color:'#4A7C5F' }
                    : { background:'#5B4FCF', color:'white' }}>
                  {c.joined ? 'Joined ✓' : 'Join challenge'}
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <div className="px-4 py-4 pb-8 relative">
          {!community.joined ? (
            // Blurred overlay
            <div className="relative">
              {/* Ghost placeholder content */}
              <div className="flex flex-col gap-3 pointer-events-none" style={{ filter:'blur(6px)', opacity:0.4 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-[16px] shadow-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                      <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                  <Users size={22} style={{ color:'#5B4FCF' }} />
                </div>
                <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>Join to see members</p>
                <button onClick={toggleJoin}
                  className="text-white rounded-pill px-6 py-3 text-[14px] font-bold hover:opacity-90 transition-all"
                  style={{ background:'#5B4FCF' }}>
                  Join Community
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Current user */}
              <div className="bg-white rounded-[16px] shadow-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: avatarColor(user?.name || 'You') }}>
                  {initials(user?.name || 'You')}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>{user?.name || 'You'}</p>
                  <p className="text-[12px]" style={{ color:'#6B7280' }}>Member</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#EDE9FF', color:'#5B4FCF' }}>
                  You
                </span>
              </div>
              <p className="text-[13px] text-center py-2" style={{ color:'#6B7280' }}>
                + {community.memberCount} other members
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── FAB — PenLine, only when joined ── */}
      {community.joined && (
        <button
          onClick={() => setCompose(true)}
          className="fixed bottom-28 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-purple hover:opacity-90 active:scale-95 transition-all z-40"
          style={{ background:'#5B4FCF' }}
          aria-label="Post to community"
        >
          <PenLine size={20} />
        </button>
      )}

      <AnimatePresence>
        {compose && <ComposeSheet community={community} onClose={() => setCompose(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}