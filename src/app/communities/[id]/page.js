'use client'

// ── /communities/[id] — Full social feed: posts, likes, comments, share ──
// Update 2: free-form posts, likes, comment sheet, full composer with type selector

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, PenLine, X, Users, Trash2,
  Heart, MessageCircle, Share2, Send, ChevronDown, ChevronUp
} from 'lucide-react'
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

const POST_TYPES = [
  { key: 'general',       label: 'General',       color: '#888780' },
  { key: 'reading',       label: 'Reading',       color: '#5B4FCF' },
  { key: 'prayer',        label: 'Prayer',        color: '#4A7C5F' },
  { key: 'encouragement', label: 'Encouragement', color: '#E8A838' },
]

const TYPE_PLACEHOLDERS = {
  general:       'Share something with the community...',
  reading:       'What did you read and what stood out to you?',
  prayer:        'Share a prayer request or praise report...',
  encouragement: 'Encourage someone in the community today...',
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'Just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  if (h < 48)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────
//  Comment sheet
// ─────────────────────────────────────────────
function CommentSheet({ post, onClose, onAddComment }) {
  const [input, setInput] = useState('')
  const [user]            = useLocalStorage('dw_user', null)
  const listRef           = useRef(null)

  function submit() {
    const text = input.trim()
    if (!text) return
    const comment = {
      id: `cmt_${Date.now()}`,
      authorId:       'local_user',
      authorName:     user?.name?.trim() || 'Anonymous',
      authorInitials: initials(user?.name || 'A'),
      content:        text,
      createdAt:      new Date().toISOString(),
    }
    onAddComment(post.id, comment)
    setInput('')
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 80)
  }

  const userInitials = initials(user?.name || 'A')

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '80dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Comments</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 scroll-hide">
          {(!post.comments || post.comments.length === 0) ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle size={28} style={{ color:'#E8E5E0' }} />
              <p className="text-[14px] font-semibold" style={{ color:'#9CA3AF' }}>No comments yet</p>
              <p className="text-[12px]" style={{ color:'#C4C1BC' }}>Be the first to reply</p>
            </div>
          ) : (
            post.comments.map(cmt => (
              <div key={cmt.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                  style={{ background: avatarColor(cmt.authorName) }}>
                  {cmt.authorInitials || initials(cmt.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>{cmt.authorName}</span>
                    <span className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(cmt.createdAt)}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed" style={{ color:'#1A1A2E' }}>{cmt.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input row */}
        <div className="px-4 py-3 pb-8 border-t border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background: avatarColor(user?.name || 'A') }}>
            {userInitials}
          </div>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Write a comment..."
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
            style={{ color:'#1A1A2E' }}
          />
          <button onClick={submit} disabled={!input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 active:scale-95"
            style={{ background: '#5B4FCF' }}>
            <Send size={15} />
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Post composer sheet
// ─────────────────────────────────────────────
function ComposeSheet({ community, onClose, onPost }) {
  const [postType, setPostType] = useState('general')
  const [content,  setContent]  = useState('')
  const [passage,  setPassage]  = useState('')
  const [user]                  = useLocalStorage('dw_user', null)
  const { performCheckin, isCheckedInToday } = useCheckin()
  const MAX = 500

  function submit() {
    if (!content.trim()) { showToast('Write something first'); return }
    const displayName = user?.name?.trim() || 'Anonymous'
    const post = {
      id:             `p_${Date.now()}`,
      communityId:    community.id,
      authorId:       'local_user',
      authorName:     displayName,
      authorInitials: initials(displayName),
      content:        content.trim(),
      passage:        postType === 'reading' ? passage.trim() : undefined,
      type:           postType,
      likedBy:        [],
      comments:       [],
      createdAt:      new Date().toISOString(),
    }
    onPost(post)
    // Auto-check-in if it's a reading post and not already checked in
    if (postType === 'reading' && !isCheckedInToday) {
      performCheckin({ passage: passage.trim(), reflection: content.trim() })
    }
    showToast('Posted!')
    onClose()
  }

  const typeColor = POST_TYPES.find(t => t.key === postType)?.color || '#888780'

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '92dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>

        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:'#6B7280' }}>Posting to</p>
            <p className="font-bold text-[15px] truncate" style={{ color:'#1A1A2E' }}>{community.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4 scroll-hide">
          {/* Post type pills */}
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {POST_TYPES.map(t => (
              <button key={t.key} onClick={() => setPostType(t.key)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                style={postType === t.key
                  ? { background: t.color, borderColor: t.color, color: 'white' }
                  : { background: 'white', borderColor: '#E5E7EB', color: '#6B7280' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Passage input (reading type only) */}
          {postType === 'reading' && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
              exit={{ opacity:0, height:0 }}>
              <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
                placeholder="Passage (optional) e.g. John 3:16"
                className="w-full border border-gray-200 rounded-input px-4 py-3 text-[13px] focus:outline-none transition-all placeholder:text-text-muted"
                style={{ color:'#1A1A2E', borderColor: passage ? '#5B4FCF' : undefined }} />
            </motion.div>
          )}

          {/* Content textarea */}
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX))}
              placeholder={TYPE_PLACEHOLDERS[postType]}
              autoFocus
              rows={5}
              className="w-full border border-gray-200 rounded-[16px] resize-none px-4 py-3 text-[15px] focus:outline-none focus:ring-2 transition-all placeholder:text-text-muted"
              style={{ color:'#1A1A2E', lineHeight: 1.7, focusBorderColor: typeColor }}
              onFocus={e => e.target.style.borderColor = typeColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
            <span className="absolute bottom-3 right-3 text-[11px]" style={{ color: content.length > MAX * 0.9 ? '#EF4444' : '#9CA3AF' }}>
              {content.length}/{MAX}
            </span>
          </div>

          <button onClick={submit} disabled={!content.trim()}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background: typeColor }}>
            Post to Community
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Post card
// ─────────────────────────────────────────────
function PostCard({ post, onDelete, onLike, onComment }) {
  const [expanded, setExpanded] = useState(false)
  const isLiked   = post.likedBy?.includes('local_user')
  const likeCount = post.likedBy?.length || 0
  const cmtCount  = post.comments?.length || 0
  const isLong    = post.content.length > 200
  const typeInfo  = POST_TYPES.find(t => t.key === post.type) || POST_TYPES[0]

  async function handleShare() {
    const text = `${post.authorName} on Daily Walk: "${post.content.slice(0, 100)}${post.content.length > 100 ? '…' : ''}"`
    if (navigator.share) {
      try { await navigator.share({ text, title: 'Daily Walk' }) } catch {}
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
      showToast('Copied to clipboard')
    }
  }

  return (
    <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
      <div className="p-4 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
              style={{ background: avatarColor(post.authorName) }}>
              {post.authorInitials || initials(post.authorName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>{post.authorName}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background:`${typeInfo.color}18`, color: typeInfo.color }}>
                  {typeInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(post.createdAt)}</span>
            {post.authorId === 'local_user' && (
              <button onClick={() => onDelete(post.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                style={{ color:'#9CA3AF' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Passage badge */}
        {post.passage && (
          <span className="self-start text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background:'#EDE9FF', color:'#5B4FCF' }}>
            {post.passage}
          </span>
        )}

        {/* Content */}
        <div>
          <p className="text-[15px] leading-[1.7]" style={{ color:'#1A1A2E' }}>
            {isLong && !expanded ? `${post.content.slice(0, 200)}…` : post.content}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 mt-1 text-[13px] font-semibold"
              style={{ color:'#5B4FCF' }}>
              {expanded ? <><ChevronUp size={13}/> Less</> : <><ChevronDown size={13}/> Read more</>}
            </button>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
          {/* Like */}
          <button onClick={() => onLike(post.id)}
            className="flex items-center gap-1.5 transition-colors"
            aria-label="Like">
            <motion.div animate={isLiked ? { scale:[1,1.4,1] } : { scale:1 }} transition={{ duration:0.25 }}>
              <Heart size={17} style={{ color: isLiked ? '#EF4444' : '#9CA3AF', fill: isLiked ? '#EF4444' : 'none' }} />
            </motion.div>
            <span className="text-[13px] font-semibold" style={{ color: isLiked ? '#EF4444' : '#9CA3AF' }}>
              {likeCount > 0 ? likeCount : ''}
            </span>
          </button>

          {/* Comment */}
          <button onClick={() => onComment(post)}
            className="flex items-center gap-1.5 transition-colors"
            aria-label="Comment">
            <MessageCircle size={17} style={{ color:'#9CA3AF' }} />
            <span className="text-[13px] font-semibold" style={{ color:'#9CA3AF' }}>
              {cmtCount > 0 ? cmtCount : ''}
            </span>
          </button>

          {/* Share */}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 transition-colors ml-auto"
            aria-label="Share">
            <Share2 size={15} style={{ color:'#9CA3AF' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunityDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [tab,          setTab]     = useState('feed')
  const [compose,      setCompose] = useState(false)
  const [commentPost,  setCmtPost] = useState(null) // post being commented on

  const [communities, setCommunities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [challenges,  setChallenges]  = useLocalStorage('dw_challenges',  SEED_CHALLENGES)
  const [user]                        = useLocalStorage('dw_user', null)
  const [, , hydrated]                = useLocalStorage('dw_communities', SEED_COMMUNITIES)

  const community = (communities || []).find(c => c.id === id)
  const catColor  = community ? (CATEGORY_COLORS[community.category] || '#5B4FCF') : '#5B4FCF'

  function updateCommunity(updater) {
    setCommunities(prev => (prev || []).map(c => c.id === id ? updater(c) : c))
  }

  function toggleJoin() {
    if (!community) return
    updateCommunity(c => ({ ...c, joined: !c.joined, memberCount: Math.max(0, c.memberCount + (c.joined ? -1 : 1)) }))
    showToast(community.joined ? 'Left community' : 'Joined!')
  }

  function handlePost(post) {
    updateCommunity(c => ({ ...c, posts: [post, ...(c.posts || [])] }))
  }

  function deletePost(postId) {
    updateCommunity(c => ({ ...c, posts: (c.posts || []).filter(p => p.id !== postId) }))
  }

  function toggleLike(postId) {
    updateCommunity(c => ({
      ...c,
      posts: (c.posts || []).map(p => {
        if (p.id !== postId) return p
        const liked    = p.likedBy?.includes('local_user')
        const likedBy  = liked
          ? (p.likedBy || []).filter(x => x !== 'local_user')
          : [...(p.likedBy || []), 'local_user']
        return { ...p, likedBy }
      })
    }))
  }

  function addComment(postId, comment) {
    updateCommunity(c => ({
      ...c,
      posts: (c.posts || []).map(p =>
        p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p
      )
    }))
    // Also update commentPost so the sheet refreshes
    const updated = (communities || []).find(c => c.id === id)
    const updatedPost = updated?.posts?.find(p => p.id === postId)
    if (updatedPost) setCmtPost({ ...updatedPost, comments: [...(updatedPost.comments || []), comment] })
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

      {/* ── Hero ── */}
      <div className="relative flex flex-col" style={{ minHeight: 160, background: `linear-gradient(135deg, ${catColor}22, ${catColor}55)` }}>
        <div className="absolute top-5 left-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center"
            style={{ color:'#1A1A2E' }}>
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 pb-2 pt-12">
          <p className="font-display font-bold" style={{ fontSize:64, lineHeight:1, color:catColor, opacity:0.9 }}>
            {community.name[0].toUpperCase()}
          </p>
          <p className="font-display font-bold text-[22px] mt-1" style={{ color:'#1A1A2E' }}>{community.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:`${catColor}22`, color:catColor }}>
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
      <div className="px-4 py-4" style={{ borderBottom:'1px solid #F0EDE8' }}>
        {community.joined ? (
          <div className="flex gap-2">
            <button onClick={() => showToast('Invite link coming soon')}
              className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 transition-all"
              style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
              Invite Friend
            </button>
            <button onClick={toggleJoin}
              className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 transition-all hover:bg-red-50"
              style={{ borderColor:'#EF4444', color:'#EF4444' }}>
              Leave
            </button>
          </div>
        ) : (
          <button onClick={toggleJoin}
            className="w-full text-white rounded-pill py-3.5 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'#5B4FCF' }}>
            Join Community
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[{ key:'feed', label:'Feed' }, { key:'challenges', label:'Challenges' }, { key:'members', label:'Members' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[12px] font-bold transition-all"
              style={tab === t.key ? { color:'#5B4FCF' } : { color:'#6B7280' }}>
              {tab === t.key && (
                <motion.div layoutId="comm-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type:'spring', stiffness:400, damping:35 }} />
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
              className="bg-white rounded-[20px] p-10 flex flex-col items-center gap-3 text-center"
              style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:`${catColor}15` }}>
                <PenLine size={24} style={{ color:catColor }} />
              </div>
              <p className="font-display text-[16px] font-semibold" style={{ color:'#1A1A2E' }}>No posts yet</p>
              <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>
                Be the first to share something with this community.
              </p>
            </motion.div>
          ) : (
            posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}>
                <PostCard
                  post={post}
                  onDelete={deletePost}
                  onLike={toggleLike}
                  onComment={p => setCmtPost(p)}
                />
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Challenges tab ── */}
      {tab === 'challenges' && (
        <div className="flex flex-col gap-3 px-4 py-4 pb-8">
          <button onClick={() => router.push('/plans/create')}
            className="w-full flex items-center justify-center gap-2 rounded-[20px] py-4 text-[14px] font-bold border-2 border-dashed hover:opacity-80 transition-colors"
            style={{ borderColor:'rgba(91,79,207,0.3)', color:'#5B4FCF' }}>
            <PenLine size={16} /> Create Challenge
          </button>
          {commChalls.length === 0 ? (
            <div className="bg-white rounded-[20px] p-8 text-center" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
              <p className="text-[14px] font-semibold" style={{ color:'#1A1A2E' }}>No challenges yet</p>
              <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>Create one to get the community going.</p>
            </div>
          ) : (
            commChalls.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
                className="bg-white rounded-[16px] p-4 flex flex-col gap-3" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[14px] flex-1" style={{ color:'#1A1A2E' }}>{c.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${CHALLENGE_TYPE_STYLES[c.type]}`}>
                    {CHALLENGE_TYPE_LABELS[c.type]}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>{c.description}</p>
                <button onClick={() => toggleChallengeJoin(c.id)}
                  className="w-full rounded-pill py-2.5 text-[13px] font-bold transition-all active:scale-[0.97]"
                  style={c.joined ? { background:'#E8F4ED', color:'#4A7C5F' } : { background:'#5B4FCF', color:'white' }}>
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
            <div className="relative">
              <div className="flex flex-col gap-3 pointer-events-none" style={{ filter:'blur(6px)', opacity:0.4 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-[16px] p-4 flex items-center gap-3" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                      <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                  <Users size={22} style={{ color:'#5B4FCF' }} />
                </div>
                <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>Join to see members</p>
                <button onClick={toggleJoin}
                  className="text-white rounded-pill px-6 py-3 text-[14px] font-bold hover:opacity-90"
                  style={{ background:'#5B4FCF' }}>
                  Join Community
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-[16px] p-4 flex items-center gap-3" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: avatarColor(user?.name || 'You') }}>
                  {initials(user?.name || 'You')}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>{user?.name || 'You'}</p>
                  <p className="text-[12px]" style={{ color:'#6B7280' }}>Member</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#EDE9FF', color:'#5B4FCF' }}>You</span>
              </div>
              <p className="text-[13px] text-center py-2" style={{ color:'#6B7280' }}>
                + {community.memberCount} other members
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── FAB — PenLine, joined only ── */}
      {community.joined && tab === 'feed' && (
        <button onClick={() => setCompose(true)}
          className="fixed bottom-28 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center active:scale-95 transition-all z-40"
          style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.45)' }}
          aria-label="Post to community">
          <PenLine size={20} />
        </button>
      )}

      <AnimatePresence>
        {compose && <ComposeSheet community={community} onClose={() => setCompose(false)} onPost={handlePost} />}
        {commentPost && (
          <CommentSheet
            post={commentPost}
            onClose={() => setCmtPost(null)}
            onAddComment={addComment}
          />
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}