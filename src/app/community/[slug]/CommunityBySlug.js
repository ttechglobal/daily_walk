'use client'

// ── CommunityBySlug — full community page at /community/[slug] ──
// Works for authenticated users (full experience) and guests (read-only).
// Never redirects to external URLs. Join works in-place.
// Senior Meta/IG-level UI: cover banner, tabs, skeleton loaders, optimistic updates.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Heart, MessageCircle,
  Share2, Send, X, CheckCircle2, Globe, Lock,
  UserPlus, BookOpen, Info
} from 'lucide-react'
import {
  getCommunityBySlug, getCommunityById,
  getPosts, createPost, toggleLike, addComment,
  joinCommunity, leaveCommunity,
  subscribeToCommunityPosts,
  localUserId, localUserName,
} from '../../../lib/supabase/communities'
import { createClient } from '../../../lib/supabase/client'
import { showToast, ToastContainer } from '../../../components/Toast'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const CAT_COLORS = {
  'Bible Study':'#5B4FCF', 'Prayer':'#4A7C5F', 'Mental Health':'#7CB9E8',
  'Youth':'#E8A838', 'Worship':'#C77DFF', 'General':'#888780',
}

const CAT_GRADIENTS = {
  'Bible Study': 'linear-gradient(135deg,#5B4FCF,#3D3190)',
  'Prayer':      'linear-gradient(135deg,#4A7C5F,#2D5A40)',
  'Mental Health':'linear-gradient(135deg,#7CB9E8,#4A7C5F)',
  'Youth':       'linear-gradient(135deg,#E8A838,#B07000)',
  'Worship':     'linear-gradient(135deg,#C77DFF,#7C3AED)',
  'General':     'linear-gradient(135deg,#888780,#4A4A4A)',
}

function timeSince(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 172800) return 'yesterday'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtCount(n) {
  const v = n || 0
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}

function Avatar({ name='?', size=40, color='#5B4FCF' }) {
  const ini = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white select-none"
      style={{ width:size, height:size, background:color, fontSize:Math.round(size*0.36) }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Skeleton loader
// ─────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="bg-white rounded-[18px] p-4 animate-pulse" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full w-1/3 mb-1.5" />
          <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded-full mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-4/5 mb-2" />
      <div className="h-3 bg-gray-100 rounded-full w-3/5" />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Post card
// ─────────────────────────────────────────────
function PostCard({ post, color, currentUid, onLike, onComment }) {
  const liked      = post.liked || (post.likedBy||[]).includes(currentUid)
  const authorName = post.author_name || post.authorName || 'Anonymous'
  const typeColors = { reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838', general:'#888780' }
  const typeColor  = typeColors[post.post_type] || '#888780'
  const [likeAnim, setLikeAnim] = useState(false)

  function handleLikeTap() {
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 400)
    onLike(post.id)
  }

  return (
    <div className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={authorName} size={40} color={color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-[14px] truncate" style={{ color:'#1A1A2E' }}>{authorName}</p>
              {post.post_type && post.post_type !== 'general' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize"
                  style={{ background:`${typeColor}18`, color:typeColor }}>
                  {post.post_type}
                </span>
              )}
            </div>
            <p className="text-[11px]" style={{ color:'#9CA3AF' }}>
              {timeSince(post.created_at || post.createdAt)}
            </p>
          </div>
        </div>

        {post.passage && (
          <p className="text-[12px] font-bold mb-2" style={{ color:'#5B4FCF' }}>{post.passage}</p>
        )}
        <p className="text-[15px] leading-[1.75]" style={{ color:'#1A1A2E' }}>
          {post.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3.5 pt-3 border-t -mx-1 px-1"
          style={{ borderColor:'#F5F5F5' }}>
          <button onClick={handleLikeTap}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
            style={{ color: liked ? '#E84060' : '#9CA3AF',
                     background: liked ? '#FFF0F3' : 'transparent' }}>
            <motion.div animate={likeAnim ? { scale:[1,1.4,1] } : {}} transition={{ duration:0.3 }}>
              <Heart size={16} fill={liked ? '#E84060' : 'none'} />
            </motion.div>
            <span className="text-[13px] font-semibold">{fmtCount(post.like_count)}</span>
          </button>
          <button onClick={() => onComment(post)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
            style={{ color:'#9CA3AF' }}>
            <MessageCircle size={16} />
            <span className="text-[13px] font-semibold">{fmtCount(post.comment_count)}</span>
          </button>
          <button className="ml-auto px-3 py-2 rounded-full active:scale-90"
            style={{ color:'#9CA3AF' }}
            onClick={() => {
              const url = window.location.href
              navigator.share?.({ text: post.content, url }).catch(() => null)
                || navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
            }}>
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Compose sheet
// ─────────────────────────────────────────────
function ComposeSheet({ community, color, onClose, onPost }) {
  const [content, setContent] = useState('')
  const [type,    setType]    = useState('general')
  const [sending, setSending] = useState(false)
  const idemKey = useRef(`post_${Date.now()}_${Math.random().toString(36).slice(2,8)}`)

  const TYPES = ['general','reading','prayer','encouragement']

  async function submit() {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const user = { id: localUserId(), name: localUserName() }
      const post = await createPost(community.id, {
        content: content.trim(), type,
        idempotencyKey: idemKey.current,
      }, user)
      onPost(post)
      showToast('Posted!')
      onClose()
    } catch (e) {
      showToast('Failed to post — try again')
      setSending(false)
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] bg-white rounded-t-[28px] z-[70]"
        style={{ paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3 mb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>New Post</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} style={{ color:'#6B7280' }} />
          </button>
        </div>
        <div className="flex gap-2 px-5 mb-3 overflow-x-auto scroll-hide">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="px-3 py-1.5 rounded-full text-[12px] font-bold capitalize flex-shrink-0 transition-all"
              style={type===t ? { background:color, color:'white' } : { background:'#F5F5F5', color:'#9CA3AF' }}>
              {t}
            </button>
          ))}
        </div>
        <div className="px-5 pb-1">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Share what God is showing you…"
            autoFocus rows={5}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[15px] resize-none focus:outline-none focus:border-purple transition-all"
            style={{ color:'#1A1A2E', marginBottom:12 }} />
          <button onClick={submit} disabled={!content.trim() || sending}
            className="w-full text-white rounded-full py-4 font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all"
            style={{ background:color }}>
            {sending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Comments sheet
// ─────────────────────────────────────────────
function CommentsSheet({ post, color, onClose, onAddComment }) {
  const [text,    setText]  = useState('')
  const [sending, setSend]  = useState(false)
  const bottomRef           = useRef(null)
  const comments = post.comments || []

  async function submit() {
    if (!text.trim() || sending) return
    setSend(true)
    const user = { id: localUserId(), name: localUserName() }
    await onAddComment(post.id, text.trim(), user)
    setText('')
    setSend(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'80dvh', paddingBottom:'env(safe-area-inset-bottom)' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor:'#F0EDE8' }}>
          <div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Comments</p>
            <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>
              {comments.length} {comments.length===1?'comment':'comments'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} style={{ color:'#6B7280' }} />
          </button>
        </div>
        <div className="px-5 py-3 border-b" style={{ background:'#FAF8F5', borderColor:'#F5F5F5' }}>
          <p className="text-[13px] line-clamp-2" style={{ color:'#6B7280' }}>{post.content}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 scroll-hide">
          {comments.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <MessageCircle size={32} style={{ color:'#E8E5E0' }} />
              <p className="font-semibold text-[15px]" style={{ color:'#1A1A2E' }}>No comments yet</p>
              <p className="text-[13px]" style={{ color:'#9CA3AF' }}>Be the first to respond</p>
            </div>
          )}
          {comments.map((c, i) => (
            <div key={c.id||i} className="flex items-start gap-3 mb-4">
              <Avatar name={c.author_name||c.authorName||'?'} size={34} color={color} />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <p className="font-bold text-[12px] mb-0.5" style={{ color:'#1A1A2E' }}>
                    {c.author_name||c.authorName||'Anonymous'}
                  </p>
                  <p className="text-[14px] leading-[1.6]" style={{ color:'#1A1A2E' }}>{c.content}</p>
                </div>
                <p className="text-[11px] mt-1 pl-1" style={{ color:'#9CA3AF' }}>
                  {timeSince(c.created_at||c.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-4 py-3 border-t flex gap-2 items-center" style={{ borderColor:'#F0EDE8' }}>
          <Avatar name={localUserName()} size={32} color={color} />
          <input value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); submit() } }}
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple"
            style={{ color:'#1A1A2E' }} />
          <button onClick={submit} disabled={!text.trim()||sending}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 active:scale-90 flex-shrink-0"
            style={{ background:color }}>
            <Send size={14} />
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  About tab
// ─────────────────────────────────────────────
function AboutTab({ community, color }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="bg-white rounded-[18px] p-5" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
        <p className="font-bold text-[13px] uppercase tracking-wider mb-2" style={{ color:'#9CA3AF' }}>About</p>
        <p className="text-[15px] leading-[1.7]" style={{ color:'#1A1A2E' }}>
          {community.description || 'No description yet.'}
        </p>
      </div>
      <div className="bg-white rounded-[18px] p-5" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
        <p className="font-bold text-[13px] uppercase tracking-wider mb-3" style={{ color:'#9CA3AF' }}>Details</p>
        <div className="flex flex-col gap-2.5">
          {[
            ['Category', community.category || 'General'],
            ['Visibility', community.visibility === 'private' ? 'Private' : 'Public'],
            ['Members', fmtCount(community.member_count)],
            ['Created by', community.owner_name || 'Daily Walk'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color:'#9CA3AF' }}>{label}</span>
              <span className="text-[13px] font-semibold" style={{ color:'#1A1A2E' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunityBySlug({ slug }) {
  const router                 = useRouter()
  const [community, setComm]   = useState(null)
  const [posts,     setPosts]  = useState([])
  const [loading,   setLoad]   = useState(true)
  const [postsLoad, setPlLoad] = useState(true)
  const [error,     setError]  = useState(null)
  const [joining,   setJoining]= useState(false)
  const [tab,       setTab]    = useState('posts')
  const [compose,   setCompose]= useState(false)
  const [cpPost,    setCpPost] = useState(null)
  const currentUid             = localUserId()

  // ── Load community + check REAL join status from Supabase ──
  const load = useCallback(async () => {
    setLoad(true); setError(null)
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
      let comm = null

      if (isUUID) {
        comm = await getCommunityById(slug)
        if (comm?.slug) window.history.replaceState(null, '', `/community/${comm.slug}`)
      } else {
        comm = await getCommunityBySlug(slug)
        if (!comm) comm = await getCommunityById(slug).catch(() => null)
      }

      if (!comm) { setError('not_found'); return }

      // Verify real join status from Supabase (never trust only local cache)
      const sb = createClient()
      if (sb && currentUid !== 'local_user') {
        try {
          const { data } = await sb.from('community_members')
            .select('user_id').eq('community_id', comm.id).eq('user_id', currentUid).maybeSingle()
          comm = { ...comm, joined: !!data }
        } catch {}
      }

      setComm(comm)
    } catch (e) {
      setError(e.message || 'unknown')
    } finally {
      setLoad(false)
    }
  }, [slug, currentUid])

  // ── Load posts separately ──
  const loadPosts = useCallback(async (communityId) => {
    setPlLoad(true)
    try {
      const ps = await getPosts(communityId)
      setPosts(ps || [])
    } catch {}
    setPlLoad(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (community?.id) loadPosts(community.id)
  }, [community?.id, loadPosts])

  // Real-time new posts
  useEffect(() => {
    if (!community?.id) return
    const unsub = subscribeToCommunityPosts(community.id, newPost => {
      if (newPost.author_id === currentUid) return
      setPosts(prev => prev.some(p => p.id === newPost.id) ? prev : [newPost, ...prev])
    })
    return () => typeof unsub === 'function' && unsub()
  }, [community?.id, currentUid])

  // ── Join / Leave ──
  async function handleJoin() {
    if (!community || joining) return
    setJoining(true)
    setComm(c => ({ ...c, joined: true, member_count: (c.member_count||0)+1 }))
    try {
      await joinCommunity(community.id)
      showToast(`Joined ${community.name}!`)
    } catch {
      setComm(c => ({ ...c, joined: false, member_count: Math.max(0,(c.member_count||1)-1) }))
      showToast('Failed to join — please try again')
    }
    setJoining(false)
  }

  async function handleLeave() {
    if (!community || joining) return
    setJoining(true)
    setComm(c => ({ ...c, joined: false, member_count: Math.max(0,(c.member_count||1)-1) }))
    try {
      await leaveCommunity(community.id)
      showToast('Left community')
    } catch {
      setComm(c => ({ ...c, joined: true, member_count: (c.member_count||0)+1 }))
      showToast('Failed — please try again')
    }
    setJoining(false)
  }

  // ── Like (optimistic) ──
  async function handleLike(postId) {
    const post  = posts.find(p => p.id === postId)
    if (!post) return
    const liked = post.liked || (post.likedBy||[]).includes(currentUid)
    const delta = liked ? -1 : 1
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      liked:      !liked,
      likedBy:    !liked ? [...(p.likedBy||[]),currentUid] : (p.likedBy||[]).filter(x=>x!==currentUid),
      like_count: Math.max(0,(p.like_count||0)+delta),
    }))
    try { await toggleLike(postId, community.id, currentUid) }
    catch { setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, liked, likedBy:post.likedBy, like_count:post.like_count })) }
  }

  // ── Comment ──
  async function handleComment(postId, text, user) {
    const comment = await addComment(postId, community.id, text, user)
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p, comments:[...(p.comments||[]),comment], comment_count:(p.comment_count||0)+1,
    }))
    if (cpPost?.id === postId) setCpPost(p => ({ ...p, comments:[...(p.comments||[]),comment] }))
    return comment
  }

  // ── Share ──
  function handleShare() {
    const url = `${window.location.origin}/community/${community.slug || slug}`
    navigator.share?.({ title:community.name, text:community.description||'', url })
      .catch(() => navigator.clipboard.writeText(url).then(() => showToast('Link copied!')))
      || navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
  }

  // ─────────────────────────────────────────────
  //  Loading state
  // ─────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen" style={{ background:'#FAF8F5' }}>
      <div className="h-[200px] bg-gray-200 animate-pulse" />
      <div className="px-4 py-4 flex flex-col gap-3">
        {[1,2,3].map(i => <PostSkeleton key={i} />)}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────
  //  Error states
  // ─────────────────────────────────────────────
  if (error === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center" style={{ background:'#FAF8F5' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
        <Users size={36} style={{ color:'#5B4FCF' }} />
      </div>
      <div>
        <p className="font-bold text-[24px] mb-2" style={{ color:'#1A1A2E' }}>Community not found</p>
        <p className="text-[15px] leading-relaxed" style={{ color:'#9CA3AF' }}>
          This community may have been removed or the link has changed.
        </p>
      </div>
      <button onClick={() => router.push('/communities')}
        className="px-7 py-3.5 rounded-full text-white font-bold text-[15px]"
        style={{ background:'#5B4FCF' }}>
        Browse Communities
      </button>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{ background:'#FAF8F5' }}>
      <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Something went wrong</p>
      <p className="text-[13px]" style={{ color:'#9CA3AF' }}>{error}</p>
      <button onClick={load} className="px-6 py-3 rounded-full text-white font-bold" style={{ background:'#5B4FCF' }}>Retry</button>
      <button onClick={() => router.push('/communities')} className="text-[14px]" style={{ color:'#9CA3AF' }}>Back to Communities</button>
    </div>
  )

  const color    = CAT_COLORS[community.category] || '#5B4FCF'
  const gradient = CAT_GRADIENTS[community.category] || CAT_GRADIENTS.General
  const TABS     = ['posts','members','about']

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>

      {/* ── COVER BANNER ── */}
      <div className="relative" style={{ height:180 }}>
        {/* Gradient banner */}
        <div className="absolute inset-0" style={{ background: gradient }} />

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize:'32px 32px' }} />

        {/* Back button */}
        <button onClick={() => router.push('/communities')}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.25)', backdropFilter:'blur(4px)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Share button */}
        <button onClick={handleShare}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.25)', backdropFilter:'blur(4px)' }}>
          <Share2 size={16} className="text-white" />
        </button>
      </div>

      {/* ── COMMUNITY INFO ── */}
      <div className="bg-white px-5 pt-4 pb-0 relative" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Avatar overlapping banner */}
        <div className="absolute -top-8 left-5 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-[28px] border-4 border-white"
          style={{ background:color }}>
          {(community.name||'C')[0].toUpperCase()}
        </div>

        {/* Join button — top right */}
        <div className="flex justify-end mb-2">
          <button
            onClick={community.joined ? handleLeave : handleJoin}
            disabled={joining}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all active:scale-95 disabled:opacity-60"
            style={community.joined
              ? { border:`2px solid ${color}`, color, background:'white' }
              : { background:color, color:'white', boxShadow:`0 3px 12px ${color}50` }
            }>
            {joining ? '…' : community.joined ? <><CheckCircle2 size={15}/> Joined</> : <><UserPlus size={15}/> Join</>}
          </button>
        </div>

        {/* Name + meta */}
        <div className="mt-2 mb-3">
          <h1 className="font-bold text-[22px] leading-snug" style={{ color:'#1A1A2E' }}>
            {community.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1" style={{ color:'#9CA3AF' }}>
              <Users size={13} />
              <span className="text-[13px] font-semibold">{fmtCount(community.member_count)} members</span>
            </div>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:`${color}18`, color }}>
              {community.category}
            </span>
            {community.visibility==='private'
              ? <Lock size={13} style={{ color:'#9CA3AF' }} />
              : <Globe size={13} style={{ color:'#9CA3AF' }} />}
          </div>
          {community.description && (
            <p className="text-[14px] leading-relaxed mt-2" style={{ color:'#6B7280' }}>
              {community.description}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor:'#F0EDE8' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[14px] font-semibold capitalize relative transition-colors"
              style={{ color: tab===t ? color : '#9CA3AF' }}>
              {t}
              {tab===t && (
                <motion.div layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background:color }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1">
        {tab === 'posts' && (
          <div className="px-4 py-4 flex flex-col gap-3" style={{ paddingBottom:120 }}>

            {/* Skeleton while loading */}
            {postsLoad && [1,2,3].map(i => <PostSkeleton key={i} />)}

            {/* Empty state */}
            {!postsLoad && posts.length === 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="w-18 h-18 flex items-center justify-center" style={{ fontSize:56 }}>🌱</div>
                <div>
                  <p className="font-bold text-[20px] mb-1.5" style={{ color:'#1A1A2E' }}>
                    No posts yet
                  </p>
                  <p className="text-[14px] max-w-[260px] leading-relaxed" style={{ color:'#9CA3AF' }}>
                    {community.joined
                      ? 'Be the first to start the conversation!'
                      : 'Join this community to see and create posts.'}
                  </p>
                </div>
                {community.joined ? (
                  <button onClick={() => setCompose(true)}
                    className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
                    style={{ background:color }}>
                    Write the first post
                  </button>
                ) : (
                  <button onClick={handleJoin}
                    className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
                    style={{ background:color }}>
                    Join Community
                  </button>
                )}
              </motion.div>
            )}

            {/* Posts */}
            {!postsLoad && posts.map((post, i) => (
              <PostCard key={post.id||i}
                post={post} color={color} currentUid={currentUid}
                onLike={handleLike} onComment={p => setCpPost(p)} />
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="px-4 py-4">
            <div className="bg-white rounded-[18px] p-5" style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
              <p className="font-bold text-[15px] mb-4" style={{ color:'#1A1A2E' }}>
                {fmtCount(community.member_count)} Members
              </p>
              <p className="text-[14px]" style={{ color:'#9CA3AF' }}>
                Member list coming soon.
              </p>
            </div>
          </div>
        )}

        {tab === 'about' && <AboutTab community={community} color={color} />}
      </div>

      {/* ── FAB — members only ── */}
      {community.joined && tab === 'posts' && (
        <motion.button onClick={() => setCompose(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white z-30"
          style={{ background:color, boxShadow:`0 4px 20px ${color}55` }}
          whileTap={{ scale:0.9 }}>
          <Plus size={24} />
        </motion.button>
      )}

      {/* Non-member prompt */}
      {!community.joined && tab === 'posts' && posts.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-3 z-20"
          style={{ background:'white', borderTop:'1px solid #F0EDE8' }}>
          <button onClick={handleJoin}
            className="w-full text-white rounded-full py-3.5 font-bold text-[15px] flex items-center justify-center gap-2"
            style={{ background:color }}>
            <UserPlus size={18} /> Join to post and comment
          </button>
        </div>
      )}

      {/* ── Sheets ── */}
      <AnimatePresence>
        {compose && (
          <ComposeSheet community={community} color={color}
            onClose={() => setCompose(false)}
            onPost={post => setPosts(prev => [post, ...prev])} />
        )}
        {cpPost && (
          <CommentsSheet post={cpPost} color={color}
            onClose={() => setCpPost(null)}
            onAddComment={handleComment} />
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}