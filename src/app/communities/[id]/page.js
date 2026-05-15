'use client'

// ── /communities/[id] — Community Detail (internal, UUID-based) ──
// Public URLs use /community/[slug] which redirects here.
// Wired to Supabase: posts, comments, likes, membership all persist.
// Real-time: new posts/comments appear instantly via Supabase subscriptions.
// Graceful localStorage fallback when Supabase not configured.

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, PenLine, X, Users, Trash2, MoreVertical,
  Heart, MessageCircle, Share2, Send, UserPlus, LogOut,
  Copy, Settings2, WifiOff
} from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { createShareUrl } from '../../../lib/config'
import { useCheckin } from '../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  SEED_COMMUNITIES, SEED_CHALLENGES, CHALLENGE_TYPE_LABELS,
  CHALLENGE_TYPE_STYLES, avatarColor, initials, todayStr
} from '../../../lib/constants'
import {
  getCommunityById, getCommunityBySlug, getPosts, createPost, deletePost,
  toggleLike, addComment, joinCommunity, leaveCommunity, subscribeToLikes,
  subscribeToCommunityPosts, subscribeToComments,
} from '../../../lib/supabase/communities'
import { addAppNotification, sendNewPostNotification, sendCommentNotification, sendLikeNotification, notifyCommunityPost, notifyComment, notifyLike } from '../../../lib/notifications'

const CATEGORY_COLORS = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}
const POST_TYPES = [
  { key:'general',       label:'General',       color:'#888780' },
  { key:'reading',       label:'Reading',       color:'#5B4FCF' },
  { key:'prayer',        label:'Prayer',        color:'#4A7C5F' },
  { key:'encouragement', label:'Encouragement', color:'#E8A838' },
]

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  if (h < 48) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

// ── Invite sheet ──
function InviteSheet({ community, onClose }) {
  const catColor  = CATEGORY_COLORS[community.category] || '#5B4FCF'
  const code      = community.invite_code || community.inviteCode || 'INVITE'
  const inviteUrl = createShareUrl(`/join/${code}`)
  const shareText = `Join me in "${community.name}" on Daily Walk! ${inviteUrl}`

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl).catch(() => {})
    showToast('Link copied!')
  }
  async function handleShare() {
    if (navigator.share) { try { await navigator.share({ text:shareText, url:inviteUrl }) } catch {} }
    else handleCopy()
  }

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <motion.div className="w-full max-w-[420px] mx-auto bg-white rounded-t-[28px] p-5 pb-10"
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <p className="font-bold text-[17px] mb-1" style={{ color:'#1A1A2E' }}>Invite people</p>
        <p className="text-[13px] mb-4" style={{ color:'#6B7280' }}>Share this link to invite people to {community.name}</p>
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-4" style={{ background:'#F5F5F5' }}>
          <div className="flex-1 font-mono text-[13px] break-all" style={{ color:'#1A1A2E' }}>{inviteUrl}</div>
          <button onClick={handleCopy} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'#5B4FCF' }}><Copy size={14} className="text-white" /></button>
        </div>
        <button onClick={handleShare}
          className="w-full text-white rounded-full py-4 font-bold text-[14px] mb-3"
          style={{ background:'#5B4FCF' }}>Share Invite Link</button>
        <button onClick={onClose} className="w-full py-2 text-[14px] font-semibold" style={{ color:'#9CA3AF' }}>Close</button>
      </motion.div>
    </motion.div>
  )
}

// ── Three-dot menu ──
function ThreeDotMenu({ community, onInvite, onLeave }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', color:'#1A1A2E' }}>
        <MoreVertical size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute right-0 top-11 w-48 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
            initial={{ opacity:0, scale:0.95, y:-8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95 }}>
            {[
              { icon:UserPlus, label:'Invite people', fn: () => { onInvite(); setOpen(false) } },
              { icon:LogOut,   label:'Leave community', fn: () => { onLeave(); setOpen(false) }, red:true },
            ].map(item => (
              <button key={item.label} onClick={item.fn}
                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold hover:bg-gray-50"
                style={{ color: item.red ? '#EF4444' : '#1A1A2E' }}>
                <item.icon size={15} />{item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Post compose sheet ──
function ComposeSheet({ community, user, onClose, onPost }) {
  const [content, setContent]   = useState('')
  const [passage, setPassage]   = useState('')
  const [postType, setPostType] = useState('general')
  const [saving,  setSaving]    = useState(false)

  async function submit() {
    if (!content.trim()) return
    setSaving(true)
    const post = {
      id:             `post_${Date.now()}`,
      communityId:    community.id,
      authorId:       user?.id || (() => { try { const u=localStorage.getItem('dw_user'); return u?JSON.parse(u)?.id||'local_user':'local_user' } catch { return 'local_user' } })(),
      authorName:     user?.username || user?.name || 'Anonymous',
      authorInitials: (user?.name || 'A').slice(0,2).toUpperCase(),
      content:        content.trim(),
      passage:        passage.trim() || null,
      type:           postType,
      likedBy:        [],
      comments:       [],
      createdAt:      new Date().toISOString(),
    }
    const saved = await createPost(community.id, post, user)
    onPost(saved)
    setSaving(false)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <motion.div className="w-full max-w-[420px] mx-auto bg-white rounded-t-[28px] p-5 pb-10"
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>New Post</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        {/* Post type pills */}
        <div className="flex gap-2 mb-3 overflow-x-auto scroll-hide pb-1">
          {POST_TYPES.map(t => (
            <button key={t.key} onClick={() => setPostType(t.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
              style={postType===t.key
                ? { background:t.color, borderColor:t.color, color:'white' }
                : { background:'white', borderColor:'#E5E7EB', color:'#6B7280' }}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="What's on your heart?"
          rows={4} autoFocus
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[14px] resize-none focus:outline-none focus:border-purple mb-3"
          style={{ color:'#1A1A2E' }} />
        <input value={passage} onChange={e => setPassage(e.target.value)}
          placeholder="Passage (optional) — e.g. John 3:16"
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[14px] focus:outline-none focus:border-purple mb-4"
          style={{ color:'#1A1A2E' }} />
        <button onClick={submit} disabled={!content.trim() || saving}
          className="w-full text-white rounded-full py-4 font-bold text-[14px] disabled:opacity-50"
          style={{ background:'#5B4FCF' }}>
          {saving ? 'Posting...' : 'Post'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Comment sheet ──
function CommentSheet({ post, user, onClose, onAddComment }) {
  const [text,   setText]   = useState('')
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState(post.comments || [])

  // Real-time comment subscription
  useEffect(() => {
    const unsub = subscribeToComments(post.id, newComment => {
      setComments(prev => {
        if (prev.find(c => c.id === newComment.id)) return prev
        return [...prev, newComment]
      })
    })
    return unsub
  }, [post.id])

  async function submit() {
    if (!text.trim()) return
    setSaving(true)
    const comment = {
      id:             `comment_${Date.now()}`,
      postId:         post.id,
      authorId:       user?.id || (() => { try { const u=localStorage.getItem('dw_user'); return u?JSON.parse(u)?.id||'local_user':'local_user' } catch { return 'local_user' } })(),
      authorName:     user?.username || user?.name || 'Anonymous',
      authorInitials: (user?.name || 'A').slice(0,2).toUpperCase(),
      content:        text.trim(),
      createdAt:      new Date().toISOString(),
    }
    const saved = await addComment(post.id, post.communityId, comment, user)
    // Notify post author if it's someone else
    if (post.authorId && post.authorId !== (user?.id || 'local_user')) {
      sendCommentNotification(user?.name || 'Someone', post.content)
      notifyComment(post.authorId, user?.name || 'Someone', post.content)
    }
    setComments(prev => [...prev, saved])
    onAddComment(saved)
    setText('')
    setSaving(false)
  }

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <motion.div className="w-full max-w-[420px] mx-auto bg-white rounded-t-[28px] flex flex-col"
        style={{ maxHeight:'70dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
          <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>Comments</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        {/* Quote original */}
        <div className="mx-5 mb-3 p-3 rounded-xl border-l-4 flex-shrink-0" style={{ background:'#F8F7FF', borderColor:'#5B4FCF' }}>
          <p className="text-[13px] line-clamp-2" style={{ color:'#6B7280' }}>{post.content}</p>
        </div>
        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-3 scroll-hide">
          {comments.length === 0 && (
            <p className="text-center text-[13px] py-6" style={{ color:'#9CA3AF' }}>No comments yet. Be the first!</p>
          )}
          {comments.map((c, i) => (
            <div key={c.id || i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: avatarColor(c.authorName||'A') }}>
                {initials(c.authorName||'A')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-[12px]" style={{ color:'#1A1A2E' }}>{c.authorName}</p>
                  <p className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(c.createdAt)}</p>
                </div>
                <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color:'#1A1A2E' }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Input */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3 flex-shrink-0 pb-8">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Write a comment..."
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple"
            style={{ color:'#1A1A2E' }} />
          <button onClick={submit} disabled={!text.trim() || saving}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40"
            style={{ background:'#5B4FCF' }}>
            <Send size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Post card ──
function PostCard({ post, userId, community, onDelete, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const typeColor = { general:'#888780', reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838' }
  const isLiked   = (post.likedBy || []).includes(userId)
  const likeCount = (post.likedBy || []).length
  const isAuthor  = post.authorId === userId || post.authorId === 'local_user'
  const isLong    = post.content.length > 200

  async function handleShare() {
    const params = new URLSearchParams({ author:post.authorName, content:post.content.slice(0,200), type:post.type||'general' })
    if (post.passage) params.set('passage', post.passage)
    params.set('community', community.name)
    const url = createShareUrl(`/post/${post.id}?${params}`)
    if (navigator.share) { try { await navigator.share({ title:'Daily Walk', url }) } catch {} }
    else { await navigator.clipboard.writeText(url).catch(()=>{}); showToast('Link copied!') }
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
          style={{ background: avatarColor(post.authorName||'A') }}>
          {initials(post.authorName||'A')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>{post.authorName}</p>
          <p className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(post.createdAt)}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background:`${typeColor[post.type]||'#888780'}18`, color:typeColor[post.type]||'#888780' }}>
          {post.type}
        </span>
        {isAuthor && (
          <button onClick={() => onDelete(post.id)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50"
            style={{ color:'#EF4444' }}><Trash2 size={13} /></button>
        )}
      </div>
      {/* Content */}
      <div className="px-4 pb-3">
        {post.passage && <p className="text-[12px] font-bold mb-1" style={{ color:'#5B4FCF' }}>{post.passage}</p>}
        <p className="text-[14px] leading-[1.7]" style={{ color:'#1A1A2E' }}>
          {isLong && !expanded ? `${post.content.slice(0,200)}…` : post.content}
        </p>
        {isLong && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-[12px] font-semibold mt-1" style={{ color:'#5B4FCF' }}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-gray-100">
        <button onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-95"
          style={{ color: isLiked ? '#E84060' : '#9CA3AF' }}>
          <Heart size={15} fill={isLiked ? '#E84060' : 'none'} />
          <span className="text-[12px] font-semibold">{likeCount||''}</span>
        </button>
        <button onClick={() => setShowComments(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ color:'#9CA3AF' }}>
          <MessageCircle size={15} />
          <span className="text-[12px] font-semibold">{(post.comments||[]).length||''}</span>
        </button>
        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ color:'#9CA3AF' }}>
          <Share2 size={15} />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentSheet post={post} userId={userId}
            onClose={() => setShowComments(false)}
            onAddComment={c => onComment(post.id, c)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunityDetailPage({ params: propParams } = {}) {
  const routeParams = useParams()
  const id = propParams?.id || routeParams?.id
  const router   = useRouter()
  const isOnline = useOnlineStatus()

  const [community,  setCommunity]  = useState(null)
  const [posts,      setPosts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCompose,setCompose]    = useState(false)
  const [showInvite, setInvite]     = useState(false)
  const [joining,    setJoining]    = useState(false)

  // Get user from localStorage (anon-friendly)
  const [userRaw] = useLocalStorage('dw_user', null)
  const user = userRaw ? (typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw) : null
  const userId = user?.id || 'local_user'

  // Load community + posts
  useEffect(() => {
    async function load() {
      setLoading(true)
      // Detect whether the URL segment is a UUID or a slug
      // UUIDs look like: 00000000-0000-0000-0000-000000000001
      // Slugs look like: bible-lovers-x4k
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)
      let comm = null
      if (isUUID) {
        comm = await getCommunityById(id).catch(() => null)
      } else {
        comm = await getCommunityBySlug(id).catch(() => null)
      }
      const realId = comm ? comm.id : id
      const ps = await getPosts(realId).catch(() => [])
      if (comm) setCommunity(comm)
      if (ps)   setPosts(ps)
      setLoading(false)
    }
    load()
  }, [id])

  // Real-time subscription to new posts
  useEffect(() => {
    const unsub = subscribeToCommunityPosts(id, newPost => {
      setPosts(prev => {
        if (prev.find(p => p.id === newPost.id)) return prev
        // Add in-app notification
        addAppNotification({
          type: 'community_post',
          title: community?.name || 'Community',
          body: `${newPost.authorName} posted: "${newPost.content.slice(0,60)}"`,
          url: `/community/${community?.slug || id}`,
        })
        return [newPost, ...prev]
      })
    })
    return unsub
  }, [id, community?.name])

  async function handleToggleJoin() {
    if (!community) return
    setJoining(true)
    if (community.joined) {
      await leaveCommunity(id, user)
      setCommunity(c => ({ ...c, joined: false, member_count: Math.max(0, (c.member_count||1)-1) }))
      showToast('Left community')
    } else {
      await joinCommunity(id, user)
      setCommunity(c => ({ ...c, joined: true, member_count: (c.member_count||0)+1 }))
      showToast('Joined!')
    }
    setJoining(false)
  }

  function handlePost(post) {
    setPosts(prev => [post, ...prev])
  }

  async function handleDelete(postId) {
    await deletePost(postId, id, user)
    setPosts(prev => prev.filter(p => p.id !== postId))
    showToast('Post deleted')
  }

  async function handleLike(postId) {
    const uid = userId
    const nowLiked = await toggleLike(postId, id, uid)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked   = (p.likedBy||[]).includes(uid)
      const likedBy = liked
        ? (p.likedBy||[]).filter(x => x !== uid)
        : [...(p.likedBy||[]), uid]
      return { ...p, likedBy }
    }))
  }

  function handleComment(postId, comment) {
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, comments: [...(p.comments||[]), comment] }
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background:'#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} />
      </div>
    )
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6" style={{ background:'#FAF8F5' }}>
        <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>Community not found</p>
        <button onClick={() => router.push('/communities')}
          className="text-[14px] font-semibold" style={{ color:'#5B4FCF' }}>Browse communities</button>
      </div>
    )
  }

  const catColor   = CATEGORY_COLORS[community.category] || '#5B4FCF'
  const memberCount = community.member_count || community.memberCount || 1

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" style={{ color:'#1A1A2E' }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-[18px] truncate" style={{ color:'#1A1A2E' }}>{community.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${catColor}18`, color:catColor }}>{community.category}</span>
              <span className="flex items-center gap-1 text-[12px]" style={{ color:'#9CA3AF' }}>
                <Users size={11} />{memberCount} {memberCount===1?'member':'members'}
              </span>
            </div>
          </div>
          {community.joined && (
            <ThreeDotMenu community={community} onInvite={() => setInvite(true)} onLeave={handleToggleJoin} />
          )}
        </div>
        {community.description && (
          <p className="text-[13px] leading-relaxed mb-3" style={{ color:'#6B7280' }}>{community.description}</p>
        )}
        {/* Join/Leave button */}
        {!community.joined && (
          <button onClick={handleToggleJoin} disabled={joining}
            className="w-full text-white rounded-full py-3 font-bold text-[14px] disabled:opacity-60"
            style={{ background: catColor }}>
            {joining ? 'Joining...' : 'Join Community'}
          </button>
        )}
        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color:'#E8A838' }}>
            <WifiOff size={12} />
            <span>Offline — showing cached posts</span>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 pb-24">
        {posts.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
              <PenLine size={24} style={{ color:'#5B4FCF' }} />
            </div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>No posts yet</p>
            <p className="text-[13px]" style={{ color:'#9CA3AF' }}>
              {community.joined ? 'Be the first to post!' : 'Join to see and create posts'}
            </p>
          </div>
        )}
        {posts.map(post => (
          <PostCard key={post.id} post={post} userId={userId} community={community}
            onDelete={handleDelete} onLike={handleLike} onComment={handleComment} />
        ))}
      </div>

      {/* FAB — compose */}
      {community.joined && (
        <button onClick={() => setCompose(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 z-40"
          style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.4)' }}>
          <PenLine size={22} />
        </button>
      )}

      <AnimatePresence>
        {showCompose && (
          <ComposeSheet community={community} user={user}
            onClose={() => setCompose(false)} onPost={handlePost} />
        )}
        {showInvite && <InviteSheet community={community} onClose={() => setInvite(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}