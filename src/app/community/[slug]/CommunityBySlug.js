'use client'

// ── src/app/community/[slug]/CommunityBySlug.js ──
// Preview-before-join: everyone can read the feed, non-members see a sticky join bar.
// Auth is resolved via createClient().auth.getUser() — never imported from communities.js.
// All writes (join, post, like, comment) verify auth before proceeding.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Heart, MessageCircle,
  Share2, Send, X, Globe, Lock,
  UserPlus, MoreHorizontal, Bookmark, BookmarkCheck,
  CheckCircle2, LogIn, ChevronDown
} from 'lucide-react'
import {
  getCommunityBySlug, getCommunityById,
  getPosts, createPost, deletePost,
  toggleLike, addComment, getComments,
  joinCommunity, leaveCommunity, checkMembership,
  subscribeToCommunityPosts,
  savePost, unsavePost, isPostSaved,
  localUserName,
} from '../../../lib/supabase/communities'
import { createClient } from '../../../lib/supabase/client'
import { showToast, ToastContainer } from '../../../components/Toast'
import { avatarColor, initials } from '../../../lib/constants'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const CAT_COLORS = {
  'Bible Study': '#5B4FCF', 'Prayer': '#4A7C5F', 'Mental Health': '#7CB9E8',
  'Youth': '#E8A838', 'Worship': '#C77DFF', 'General': '#888780',
}
const CAT_GRADIENTS = {
  'Bible Study':  'linear-gradient(135deg,#5B4FCF,#3D3190)',
  'Prayer':       'linear-gradient(135deg,#4A7C5F,#2D5A40)',
  'Mental Health':'linear-gradient(135deg,#7CB9E8,#4A7C5F)',
  'Youth':        'linear-gradient(135deg,#E8A838,#B07000)',
  'Worship':      'linear-gradient(135deg,#C77DFF,#7C3AED)',
  'General':      'linear-gradient(135deg,#888780,#4A4A4A)',
}
const POST_TYPES = [
  { key: 'general',       label: 'General',       color: '#888780' },
  { key: 'reading',       label: 'Reading',       color: '#5B4FCF' },
  { key: 'prayer',        label: 'Prayer',        color: '#4A7C5F' },
  { key: 'encouragement', label: 'Encouragement', color: '#E8A838' },
]

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 172800) return 'Yesterday'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtCount(n) {
  const v = n || 0
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

// ─────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="bg-white rounded-[20px] p-4 animate-pulse" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-100 rounded-full w-1/3 mb-2" />
          <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded-full mb-2" />
      <div className="h-3 bg-gray-100 rounded-full w-4/5 mb-2" />
      <div className="h-3 bg-gray-100 rounded-full w-2/3" />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Post Card
// ─────────────────────────────────────────────
function PostCard({ post, color, authUid, isJoined, onLike, onComment, onDelete, onGuestAction }) {
  const [likeAnim, setLikeAnim] = useState(false)
  const [saved,    setSaved]    = useState(() => isPostSaved(post.id))
  const [liked,    setLiked]    = useState(post.liked || false)
  const [count,    setCount]    = useState(post.like_count || 0)
  const [expanded, setExpanded] = useState(false)
  const isOwn  = authUid && post.authorId === authUid
  const isLong = (post.content || '').length > 220
  const typeColor = POST_TYPES.find(t => t.key === post.type)?.color || color

  function handleLike() {
    if (!isJoined) { onGuestAction('like'); return }
    const nowLiked = !liked
    setLiked(nowLiked)
    setCount(c => Math.max(0, c + (nowLiked ? 1 : -1)))
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 380)
    onLike(post.id)
  }

  function handleComment() {
    if (!isJoined) { onGuestAction('comment'); return }
    onComment(post)
  }

  async function handleSave() {
    if (!isJoined) { onGuestAction('save'); return }
    const nowSaved = !saved
    setSaved(nowSaved)
    if (nowSaved) { await savePost(post); showToast('Post saved!') }
    else          { await unsavePost(post.id); showToast('Removed from saved') }
  }

  async function handleShare() {
    const url  = `${window.location.origin}/community/${post.communitySlug || post.communityId}`
    const text = `"${(post.content || '').slice(0, 80)}" — Daily Walk`
    if (navigator.share) { try { await navigator.share({ title: 'Daily Walk', text, url }) } catch {} }
    else { await navigator.clipboard.writeText(url).catch(() => {}); showToast('Link copied!') }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
          style={{ background: avatarColor(post.authorName || 'A') }}
        >
          {initials(post.authorName || 'A')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[14px] truncate" style={{ color: '#1A1A2E' }}>
              {post.authorName || 'Anonymous'}
            </p>
            {post.type && post.type !== 'general' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                style={{ background: `${typeColor}18`, color: typeColor }}>
                {post.type}
              </span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: '#9CA3AF' }}>
            {timeAgo(post.createdAt || post.created_at)}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={() => onDelete(post.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
          >
            <X size={14} style={{ color: '#EF4444' }} />
          </button>
        )}
      </div>

      {/* Scripture badge */}
      {post.passage && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: '#F8F7FF', borderLeft: `3px solid ${color}` }}>
          <p className="text-[12px] font-bold" style={{ color }}>{post.passage}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-[1.7]" style={{ color: '#1A1A2E' }}>
          {isLong && !expanded ? post.content.slice(0, 220) : post.content}
          {isLong && !expanded && (
            <button onClick={() => setExpanded(true)} className="ml-1 font-semibold" style={{ color }}>
              more
            </button>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-3 pt-2 border-t" style={{ borderColor: '#F5F5F5' }}>
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
          style={{ color: liked ? '#E84060' : '#9CA3AF', background: liked ? '#FFF0F3' : 'transparent' }}
        >
          <motion.div animate={likeAnim ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.35 }}>
            <Heart size={17} fill={liked ? '#E84060' : 'none'} />
          </motion.div>
          <span className="text-[13px] font-semibold">{fmtCount(count)}</span>
        </button>

        <button
          onClick={handleComment}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
          style={{ color: '#9CA3AF' }}
        >
          <MessageCircle size={17} />
          <span className="text-[13px] font-semibold">{fmtCount(post.comment_count)}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
          style={{ color: '#9CA3AF' }}
        >
          <Share2 size={17} />
        </button>

        <button
          onClick={handleSave}
          className="ml-auto flex items-center px-3 py-2 rounded-full transition-all active:scale-90"
          style={{ color: saved ? color : '#9CA3AF', background: saved ? `${color}18` : 'transparent' }}
        >
          {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Comment Sheet
// ─────────────────────────────────────────────
function CommentSheet({ post, color, authUser, onClose, onAddComment }) {
  const [text,     setText]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [comments, setComments] = useState(post.comments || [])
  const inputRef = useRef(null)

  useEffect(() => {
    getComments(post.id)
      .then(d => { setComments(d); setLoading(false) })
      .catch(() => setLoading(false))
    setTimeout(() => inputRef.current?.focus(), 400)
  }, [post.id])

  async function submit() {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const comment = await addComment(post.id, post.communityId, text.trim())
      setComments(prev => [...prev, comment])
      if (onAddComment) onAddComment(post.id, comment)
      setText('')
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Please sign in to comment' : 'Failed to post comment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-[480px] mx-auto bg-white rounded-t-[28px] flex flex-col"
        style={{ maxHeight: '72dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <p className="font-bold text-[17px]" style={{ color: '#1A1A2E' }}>
            Comments {comments.length > 0 && <span style={{ color: '#9CA3AF' }}>({comments.length})</span>}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        {/* Original post quote */}
        <div className="mx-5 mb-3 px-3 py-2.5 rounded-xl border-l-[3px] flex-shrink-0"
          style={{ background: '#F8F7FF', borderColor: color }}>
          <p className="text-[13px] line-clamp-2" style={{ color: '#6B7280' }}>{post.content}</p>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-4" style={{ overflowX: 'hidden' }}>
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-center text-[13px] py-8" style={{ color: '#9CA3AF' }}>
              Be the first to comment 🙏
            </p>
          )}
          {comments.map((c, i) => (
            <div key={c.id || i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: avatarColor(c.author_name || c.authorName || 'A') }}>
                {initials(c.author_name || c.authorName || 'A')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-[13px]" style={{ color: '#1A1A2E' }}>
                    {c.author_name || c.authorName}
                  </p>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                    {timeAgo(c.createdAt || c.created_at)}
                  </p>
                </div>
                <p className="text-[14px] mt-0.5 leading-relaxed" style={{ color: '#1A1A2E' }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0 pb-8"
          style={{ borderColor: '#F0F0F0' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background: avatarColor(authUser?.name || 'A') }}>
            {initials(authUser?.name || 'A')}
          </div>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Add a comment..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-[14px] focus:outline-none border border-transparent focus:border-purple-200 transition-colors"
            style={{ color: '#1A1A2E' }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || saving}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-90"
            style={{ background: color }}
          >
            <Send size={15} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Compose Sheet
// ─────────────────────────────────────────────
function ComposeSheet({ community, color, onClose, onPost }) {
  const [content,  setContent]  = useState('')
  const [passage,  setPassage]  = useState('')
  const [type,     setType]     = useState('general')
  const [posting,  setPosting]  = useState(false)

  async function submit() {
    if (!content.trim() || posting) return
    setPosting(true)
    try {
      const post = await createPost(community.id, { content: content.trim(), passage: passage.trim() || null, type })
      onPost(post)
      onClose()
      showToast('Posted! 🙌')
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Please sign in to post' : 'Failed to post — please try again')
    } finally {
      setPosting(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-[480px] mx-auto bg-white rounded-t-[28px] flex flex-col"
        style={{ maxHeight: '80dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <p className="font-bold text-[17px]" style={{ color: '#1A1A2E' }}>New Post</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-4">
          {/* Post type pills */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                style={
                  type === t.key
                    ? { background: t.color, borderColor: t.color, color: 'white' }
                    : { background: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Passage input */}
          <input
            value={passage}
            onChange={e => setPassage(e.target.value)}
            placeholder="Scripture reference (optional) — e.g. John 3:16"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[14px] focus:outline-none focus:border-purple-300 bg-gray-50 transition-colors"
            style={{ color: '#1A1A2E' }}
          />

          {/* Content textarea */}
          <textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share what's on your heart..."
            rows={5}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[15px] focus:outline-none focus:border-purple-300 bg-gray-50 resize-none leading-relaxed transition-colors"
            style={{ color: '#1A1A2E' }}
          />
        </div>

        <div className="px-5 py-4 border-t flex-shrink-0 pb-8" style={{ borderColor: '#F0F0F0' }}>
          <button
            onClick={submit}
            disabled={!content.trim() || posting}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: color }}
          >
            {posting ? 'Posting…' : 'Post to community'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  About Tab
// ─────────────────────────────────────────────
function AboutTab({ community, color }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-4 pb-32">
      <div className="bg-white rounded-[20px] p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <p className="font-bold text-[15px] mb-2" style={{ color: '#1A1A2E' }}>About</p>
        <p className="text-[14px] leading-relaxed" style={{ color: '#6B7280' }}>
          {community.description || 'A community on Daily Walk.'}
        </p>
      </div>
      <div className="bg-white rounded-[20px] p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <p className="font-bold text-[13px] uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>Details</p>
        <div className="flex flex-col gap-3">
          {[
            ['Category',   community.category   || 'General'],
            ['Visibility', community.visibility === 'private' ? '🔒 Private' : '🌐 Public'],
            ['Members',    fmtCount(community.member_count)],
            ['Created by', community.owner_name || 'Daily Walk'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: '#9CA3AF' }}>{label}</span>
              <span className="text-[13px] font-semibold" style={{ color: '#1A1A2E' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Guest join prompt (bottom bar for non-members)
// ─────────────────────────────────────────────
function GuestJoinBar({ community, color, joining, onJoin }) {
  return (
    <motion.div
      initial={{ y: 80 }} animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4 pb-8 pt-4 bg-white border-t"
      style={{ borderColor: '#F0EDE8' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px]" style={{ color: '#1A1A2E' }}>
            Join to post &amp; interact
          </p>
          <p className="text-[12px]" style={{ color: '#6B7280' }}>
            You're previewing {community.name}
          </p>
        </div>
        <button
          onClick={onJoin}
          disabled={joining}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all active:scale-95"
          style={{ background: color }}
        >
          <UserPlus size={15} />
          {joining ? 'Joining…' : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunityBySlug({ slug }) {
  const router = useRouter()

  // Auth state — resolved via Supabase client directly, no import from communities.js
  const [authUser, setAuthUser] = useState(null)   // { id, name, email } | null
  const [authReady, setAuthReady] = useState(false)

  // Community + posts
  const [community, setComm]    = useState(null)
  const [posts,     setPosts]   = useState([])
  const [loading,   setLoading] = useState(true)
  const [postsLoad, setPlLoad]  = useState(true)
  const [error,     setError]   = useState(null)

  // Actions
  const [joining,  setJoining]  = useState(false)
  const [tab,      setTab]      = useState('posts')
  const [compose,  setCompose]  = useState(false)
  const [cpPost,   setCpPost]   = useState(null)

  // ── Step 1: Resolve auth session (never import getAuthUser — call createClient directly) ──
  useEffect(() => {
    async function resolveAuth() {
      const sb = createClient()
      if (sb) {
        try {
          const { data } = await sb.auth.getUser()
          const u = data?.user
          if (u) {
            setAuthUser({
              id:    u.id,
              name:  u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Friend',
              email: u.email,
            })
            setAuthReady(true)
            return
          }
        } catch {}
      }
      // Fall back to localStorage dw_user
      try {
        const local = JSON.parse(localStorage.getItem('dw_user') || 'null')
        if (local?.id) {
          setAuthUser({ id: local.id, name: local.name || local.username || 'Friend', email: local.email || null })
        }
      } catch {}
      setAuthReady(true)
    }
    resolveAuth()
  }, [])

  // ── Step 2: Load community (runs once auth is ready) ──
  const loadCommunity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
      let comm = isUUID
        ? await getCommunityById(slug)
        : (await getCommunityBySlug(slug)) || (await getCommunityById(slug).catch(() => null))

      if (!comm) { setError('not_found'); return }

      // Replace UUID URL with slug URL
      if (isUUID && comm.slug) {
        window.history.replaceState(null, '', `/community/${comm.slug}`)
      }

      // Verify membership from Supabase directly (never trust only the joined flag from getCommunity*)
      if (authUser?.id) {
        const isJoined = await checkMembership(comm.id)
        comm = { ...comm, joined: isJoined }
      } else {
        comm = { ...comm, joined: false }
      }

      setComm(comm)
    } catch (e) {
      setError(e.message || 'unknown')
    } finally {
      setLoading(false)
    }
  }, [slug, authUser?.id])

  useEffect(() => {
    if (!authReady) return
    loadCommunity()
  }, [authReady, loadCommunity])

  // ── Step 3: Load posts (publicly visible — no membership required) ──
  const loadPosts = useCallback(async (communityId) => {
    setPlLoad(true)
    try {
      const ps = await getPosts(communityId)
      setPosts(ps || [])
    } catch {}
    setPlLoad(false)
  }, [])

  useEffect(() => {
    if (community?.id) loadPosts(community.id)
  }, [community?.id, loadPosts])

  // ── Real-time new posts ──
  useEffect(() => {
    if (!community?.id) return
    const unsub = subscribeToCommunityPosts(community.id, newPost => {
      if (newPost.authorId === authUser?.id) return // we added it already
      setPosts(prev => prev.some(p => p.id === newPost.id) ? prev : [newPost, ...prev])
    })
    return () => typeof unsub === 'function' && unsub()
  }, [community?.id, authUser?.id])

  // ── Join ──
  async function handleJoin() {
    if (!community || joining) return
    if (!authUser?.id) {
      showToast('Please sign in to join communities')
      router.push('/auth/signin')
      return
    }
    setJoining(true)
    try {
      await joinCommunity(community.id)
      setComm(c => ({ ...c, joined: true, member_count: (c.member_count || 0) + 1 }))
      showToast(`Welcome to ${community.name}! 🙌`)
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Please sign in to join' : 'Failed to join — please try again')
    } finally {
      setJoining(false)
    }
  }

  // ── Leave ──
  async function handleLeave() {
    if (!community || joining) return
    setJoining(true)
    try {
      await leaveCommunity(community.id)
      setComm(c => ({ ...c, joined: false, member_count: Math.max(0, (c.member_count || 1) - 1) }))
      showToast('Left community')
    } catch {
      showToast('Failed — please try again')
    } finally {
      setJoining(false)
    }
  }

  // ── Guest tries to interact ──
  function handleGuestAction(action) {
    showToast(`Join ${community?.name || 'this community'} to ${action} posts`)
  }

  // ── Like (optimistic) ──
  async function handleLike(postId) {
    if (!authUser?.id) { showToast('Please sign in to like posts'); return }
    const post  = posts.find(p => p.id === postId)
    if (!post) return
    const wasLiked = post.liked
    // Optimistic UI already handled inside PostCard — just call the API
    try {
      await toggleLike(postId, community.id)
    } catch {
      // Revert
      setPosts(prev => prev.map(p => p.id !== postId ? p : {
        ...p, liked: wasLiked, like_count: Math.max(0, (p.like_count || 0) + (wasLiked ? 1 : -1)),
      }))
    }
  }

  // ── Comment submitted ──
  function handleAddComment(postId, comment) {
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : {
        ...p,
        comment_count: (p.comment_count || 0) + 1,
        comments: [...(p.comments || []), comment],
      }
    ))
    if (cpPost?.id === postId) setCpPost(p => ({ ...p, comments: [...(p.comments || []), comment] }))
  }

  // ── Delete post ──
  async function handleDelete(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await deletePost(postId, community.id)
    showToast('Post deleted')
  }

  // ── Share community ──
  function handleShare() {
    const url = `${window.location.origin}/community/${community.slug || slug}`
    navigator.share?.({ title: community.name, text: community.description || '', url })
      .catch(() => navigator.clipboard.writeText(url).then(() => showToast('Link copied!')))
    ?? navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
  }

  // ─────────────────────────────────────────────
  //  Loading state
  // ─────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      <div className="h-[180px] bg-gray-200 animate-pulse" />
      <div className="h-[120px] bg-white animate-pulse" />
      <div className="px-4 py-4 flex flex-col gap-3">
        {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
      </div>
    </div>
  )

  if (error === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center" style={{ background: '#FAF8F5' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#EDE9FF' }}>
        <Users size={36} style={{ color: '#5B4FCF' }} />
      </div>
      <div>
        <p className="font-bold text-[22px] mb-2" style={{ color: '#1A1A2E' }}>Community not found</p>
        <p className="text-[14px] leading-relaxed" style={{ color: '#9CA3AF' }}>
          This community may have been removed or the link has changed.
        </p>
      </div>
      <button onClick={() => router.push('/communities')}
        className="px-7 py-3.5 rounded-full text-white font-bold text-[15px]"
        style={{ background: '#5B4FCF' }}>
        Browse Communities
      </button>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{ background: '#FAF8F5' }}>
      <p className="font-bold text-[18px]" style={{ color: '#1A1A2E' }}>Something went wrong</p>
      <p className="text-[13px]" style={{ color: '#9CA3AF' }}>{error}</p>
      <button onClick={loadCommunity} className="px-6 py-3 rounded-full text-white font-bold" style={{ background: '#5B4FCF' }}>
        Retry
      </button>
      <button onClick={() => router.push('/communities')} className="text-[14px]" style={{ color: '#9CA3AF' }}>
        Back to Communities
      </button>
    </div>
  )

  const color    = CAT_COLORS[community.category]    || '#5B4FCF'
  const gradient = CAT_GRADIENTS[community.category] || CAT_GRADIENTS.General
  const TABS     = ['posts', 'about']

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#FAF8F5' }}>
      <ToastContainer />

      {/* ── COVER BANNER ── */}
      <div className="relative" style={{ height: 180 }}>
        <div className="absolute inset-0" style={{ background: gradient }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Back */}
        <button onClick={() => router.push('/communities')}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        {/* Share */}
        <button onClick={handleShare}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}>
          <Share2 size={16} className="text-white" />
        </button>
      </div>

      {/* ── COMMUNITY INFO BAR ── */}
      <div className="bg-white px-5 pt-4 pb-0 relative" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Avatar overlapping banner */}
        <div className="absolute -top-8 left-5 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-[28px] border-4 border-white"
          style={{ background: color }}>
          {(community.name || 'C')[0].toUpperCase()}
        </div>

        {/* Join / Leave button — top right */}
        <div className="flex justify-end mb-2">
          {community.joined ? (
            <button
              onClick={handleLeave}
              disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold border-2 disabled:opacity-50 transition-all"
              style={{ borderColor: color, color }}
            >
              <CheckCircle2 size={14} />
              {joining ? 'Leaving…' : 'Joined'}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: color }}
            >
              <UserPlus size={14} />
              {joining ? 'Joining…' : 'Join'}
            </button>
          )}
        </div>

        {/* Name + meta */}
        <div className="mt-2 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-[20px]" style={{ color: '#1A1A2E' }}>{community.name}</h1>
            {community.visibility === 'private'
              ? <Lock size={14} style={{ color: '#9CA3AF' }} />
              : <Globe size={14} style={{ color: '#9CA3AF' }} />
            }
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Users size={13} style={{ color: '#9CA3AF' }} />
              <span className="text-[13px]" style={{ color: '#6B7280' }}>{fmtCount(community.member_count)} members</span>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}18`, color }}
            >
              {community.category || 'General'}
            </span>
          </div>
          {community.description && (
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: '#6B7280' }}>
              {community.description}
            </p>
          )}
        </div>

        {/* Preview notice for non-members */}
        {!community.joined && (
          <div className="flex items-center gap-2 py-2.5 px-3 mb-3 rounded-xl"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
            <span style={{ color, fontSize: 13 }}>👁</span>
            <p className="text-[12px] font-medium" style={{ color }}>
              You're previewing this community — join to post and interact
            </p>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b" style={{ borderColor: '#F0EDE8' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative flex-1 py-3 text-[13px] font-bold capitalize transition-colors"
              style={{ color: tab === t ? color : '#9CA3AF' }}
            >
              {t}
              {tab === t && (
                <motion.div layoutId="community-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: color }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1">
        {tab === 'posts' && (
          <div className="px-4 py-4 flex flex-col gap-3" style={{ paddingBottom: community.joined ? 100 : 120 }}>
            {postsLoad && [1, 2, 3].map(i => <PostSkeleton key={i} />)}

            {!postsLoad && posts.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-20 text-center">
                <div style={{ fontSize: 52 }}>🌱</div>
                <div>
                  <p className="font-bold text-[20px] mb-1.5" style={{ color: '#1A1A2E' }}>No posts yet</p>
                  <p className="text-[14px] max-w-[240px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                    {community.joined
                      ? 'Be the first to start the conversation!'
                      : 'Join this community to see and create posts.'}
                  </p>
                </div>
                {community.joined ? (
                  <button onClick={() => setCompose(true)}
                    className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
                    style={{ background: color }}>
                    Write the first post
                  </button>
                ) : (
                  <button onClick={handleJoin} disabled={joining}
                    className="px-6 py-3 rounded-full text-white font-bold text-[14px] disabled:opacity-60"
                    style={{ background: color }}>
                    {joining ? 'Joining…' : 'Join Community'}
                  </button>
                )}
              </motion.div>
            )}

            {!postsLoad && posts.map((post, i) => (
              <motion.div
                key={post.id || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <PostCard
                  post={post}
                  color={color}
                  authUid={authUser?.id || null}
                  isJoined={community.joined}
                  onLike={handleLike}
                  onComment={p => setCpPost(p)}
                  onDelete={handleDelete}
                  onGuestAction={handleGuestAction}
                />
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'about' && <AboutTab community={community} color={color} />}
      </div>

      {/* ── FAB — members only ── */}
      {community.joined && tab === 'posts' && (
        <motion.button
          onClick={() => setCompose(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white z-30"
          style={{ background: color, boxShadow: `0 4px 20px ${color}55` }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <Plus size={24} />
        </motion.button>
      )}

      {/* ── Guest sticky join bar ── */}
      {!community.joined && (
        <GuestJoinBar
          community={community}
          color={color}
          joining={joining}
          onJoin={handleJoin}
        />
      )}

      {/* ── Sheets ── */}
      <AnimatePresence>
        {compose && (
          <ComposeSheet
            community={community}
            color={color}
            onClose={() => setCompose(false)}
            onPost={post => setPosts(prev => [post, ...prev])}
          />
        )}
        {cpPost && (
          <CommentSheet
            post={cpPost}
            color={color}
            authUser={authUser}
            onClose={() => setCpPost(null)}
            onAddComment={handleAddComment}
          />
        )}
      </AnimatePresence>
    </div>
  )
}