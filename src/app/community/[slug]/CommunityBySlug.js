'use client'

// ── CommunityBySlug — resolves slug and renders community ──
// /community/bible-lovers → looks up slug → renders full detail
// Falls back gracefully: if slug column doesn't exist yet, tries UUID match
// Never exposes UUID in the URL bar

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCommunityBySlug, getCommunityById,
  getPosts, joinCommunity, leaveCommunity,
  createPost, toggleLike, addComment,
  subscribeToCommunityPosts,
} from '../../../lib/supabase/communities'
import { localUserId, localUserName } from '../../../lib/supabase/communities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Heart, MessageCircle, Share2,
  Send, X, MoreVertical, Globe, Lock
} from 'lucide-react'
import { showToast, ToastContainer } from '../../../components/Toast'

const CAT_COLORS = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}

function timeSince(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400)return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}

function Avatar({ name, size = 36, color = '#5B4FCF' }) {
  const ini = (name||'A').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
      style={{ width:size, height:size, background:color, fontSize: size * 0.35 }}>
      {ini}
    </div>
  )
}

function PostCard({ post, communityId, currentUserId, onLike, onOpenComments }) {
  const liked  = (post.likedBy||[]).includes(currentUserId)
  const color  = '#5B4FCF'

  return (
    <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={post.author_name||post.authorName} size={38} color={color} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>
              {post.author_name || post.authorName || 'Anonymous'}
            </p>
            <p className="text-[11px]" style={{ color:'#9CA3AF' }}>
              {timeSince(post.created_at || post.createdAt)}
            </p>
          </div>
        </div>

        {post.passage && (
          <p className="text-[12px] font-bold mb-1.5" style={{ color }}>{post.passage}</p>
        )}
        <p className="text-[15px] leading-[1.7]" style={{ color:'#1A1A2E' }}>{post.content}</p>

        <div className="flex items-center gap-5 mt-3 pt-3 border-t" style={{ borderColor:'#F5F5F5' }}>
          <button onClick={() => onLike(post.id)}
            className="flex items-center gap-1.5 transition-all active:scale-90"
            style={{ color: liked ? '#E84060' : '#9CA3AF' }}>
            <Heart size={16} fill={liked ? '#E84060' : 'none'} />
            <span className="text-[13px] font-semibold">{post.like_count || 0}</span>
          </button>
          <button onClick={() => onOpenComments(post)}
            className="flex items-center gap-1.5" style={{ color:'#9CA3AF' }}>
            <MessageCircle size={16} />
            <span className="text-[13px] font-semibold">{post.comment_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ComposeSheet({ community, onClose, onPost }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!content.trim()) return
    setSending(true)
    const user = { id: localUserId(), name: localUserName() }
    const post = await createPost(community.id, { content: content.trim(), type:'general' }, user)
    onPost(post)
    setContent('')
    setSending(false)
    onClose()
    showToast('Posted!')
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[24px] z-[70] p-5 pb-10"
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-[17px]" style={{color:'#1A1A2E'}}>Post to {community.name}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>
        <textarea value={content} onChange={e=>setContent(e.target.value)}
          placeholder="Share what God is showing you..."
          autoFocus rows={4}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[15px] resize-none focus:outline-none focus:border-purple mb-4"
          style={{color:'#1A1A2E'}} />
        <button onClick={submit} disabled={!content.trim()||sending}
          className="w-full text-white rounded-full py-3.5 font-bold text-[15px] disabled:opacity-40 active:scale-[0.97]"
          style={{background:'#5B4FCF'}}>
          {sending ? 'Posting...' : 'Post'}
        </button>
      </motion.div>
    </>
  )
}

function CommentsSheet({ post, onClose, onAddComment }) {
  const [text, setText]     = useState('')
  const [sending, setSend]  = useState(false)
  const comments = post.comments || []

  async function submit() {
    if (!text.trim()) return
    setSend(true)
    const user = { id: localUserId(), name: localUserName() }
    const c    = await onAddComment(post.id, text.trim(), user)
    setText('')
    setSend(false)
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[24px] z-[70] flex flex-col"
        style={{maxHeight:'75dvh'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="font-bold text-[16px]" style={{color:'#1A1A2E'}}>Comments</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 scroll-hide">
          {comments.length === 0 && (
            <p className="text-center py-8 text-[14px]" style={{color:'#9CA3AF'}}>No comments yet — be the first!</p>
          )}
          {comments.map((c,i) => (
            <div key={c.id||i} className="flex items-start gap-3 mb-4">
              <Avatar name={c.author_name||c.authorName} size={32} />
              <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                <p className="font-bold text-[12px]" style={{color:'#1A1A2E'}}>{c.author_name||c.authorName||'Anonymous'}</p>
                <p className="text-[14px] mt-0.5" style={{color:'#1A1A2E'}}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()} }}
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple"
            style={{color:'#1A1A2E'}} />
          <button onClick={submit} disabled={!text.trim()||sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
            style={{background:'#5B4FCF'}}>
            <Send size={15}/>
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ── Main community view ──
export default function CommunityBySlug({ slug }) {
  const router               = useRouter()
  const [community, setComm] = useState(null)
  const [posts,     setPosts]= useState([])
  const [loading,   setLoad] = useState(true)
  const [error,     setError]= useState(null)
  const [compose,   setComp] = useState(false)
  const [commentPost, setCP] = useState(null)
  const currentUserId        = localUserId()

  const load = useCallback(async () => {
    setLoad(true)
    setError(null)
    try {
      // Detect UUID vs slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
      let comm = null

      if (isUUID) {
        comm = await getCommunityById(slug)
        // If it has a slug, update the URL silently
        if (comm?.slug && comm.slug !== slug) {
          window.history.replaceState(null, '', `/community/${comm.slug}`)
        }
      } else {
        comm = await getCommunityBySlug(slug)
        // If slug lookup fails (column may not exist yet), try as ID
        if (!comm) {
          comm = await getCommunityById(slug).catch(() => null)
        }
      }

      if (!comm) { setError('not_found'); return }

      setComm(comm)
      const ps = await getPosts(comm.id)
      setPosts(ps || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoad(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  // Real-time new posts
  useEffect(() => {
    if (!community?.id) return
    return subscribeToCommunityPosts(community.id, post => {
      setPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev])
    })
  }, [community?.id])

  async function handleJoin() {
    if (!community) return
    await joinCommunity(community.id)
    setComm(c => ({ ...c, joined: true, member_count: (c.member_count||0)+1 }))
    showToast(`Joined ${community.name}!`)
  }

  async function handleLeave() {
    if (!community) return
    await leaveCommunity(community.id)
    setComm(c => ({ ...c, joined: false, member_count: Math.max(0,(c.member_count||1)-1) }))
    showToast('Left community')
  }

  async function handleLike(postId) {
    const next = await toggleLike(postId, community.id, currentUserId)
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      liked:      next,
      likedBy:    next ? [...(p.likedBy||[]), currentUserId] : (p.likedBy||[]).filter(x=>x!==currentUserId),
      like_count: Math.max(0,(p.like_count||0)+(next?1:-1)),
    }))
  }

  async function handleComment(postId, text, user) {
    const comment = await addComment(postId, community.id, text, user)
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      comments:      [...(p.comments||[]), comment],
      comment_count: (p.comment_count||0)+1,
    }))
    // Update comments sheet post
    if (commentPost?.id === postId) {
      setCP(prev => ({ ...prev, comments:[...(prev.comments||[]), comment] }))
    }
    return comment
  }

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:'#FAF8F5'}}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#5B4FCF'}} />
    </div>
  )

  // ── Error ──
  if (error === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{background:'#FAF8F5'}}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:'#EDE9FF'}}>
        <Users size={28} style={{color:'#5B4FCF'}} />
      </div>
      <p className="font-bold text-[20px]" style={{color:'#1A1A2E'}}>Community not found</p>
      <p className="text-[14px]" style={{color:'#9CA3AF'}}>
        This community may have been removed or the link has changed.
      </p>
      <button onClick={() => router.push('/communities')}
        className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
        style={{background:'#5B4FCF'}}>
        Browse Communities
      </button>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{background:'#FAF8F5'}}>
      <p className="font-bold text-[17px]" style={{color:'#1A1A2E'}}>Something went wrong</p>
      <p className="text-[13px]" style={{color:'#9CA3AF'}}>{error}</p>
      <button onClick={load} className="px-5 py-2.5 rounded-full text-white font-bold text-[14px]" style={{background:'#5B4FCF'}}>Retry</button>
      <button onClick={() => router.push('/communities')} className="text-[14px] font-semibold" style={{color:'#9CA3AF'}}>Back to Communities</button>
    </div>
  )

  const color = CAT_COLORS[community.category] || '#5B4FCF'

  return (
    <div className="flex flex-col min-h-screen" style={{background:'#FAF8F5'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 bg-white border-b" style={{borderColor:'#F0EDE8'}}>
        <button onClick={() => router.push('/communities')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{background:'#F5F5F5', color:'#1A1A2E'}}>
          <ArrowLeft size={18}/>
        </button>
        <div className="flex-1 mx-3 min-w-0">
          <p className="font-bold text-[16px] truncate" style={{color:'#1A1A2E'}}>{community.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Users size={11} style={{color:'#9CA3AF'}}/>
            <span className="text-[12px]" style={{color:'#9CA3AF'}}>{community.member_count||0} members</span>
            <span className="text-[12px]" style={{color:'#C4C1BC'}}>·</span>
            {community.visibility === 'private'
              ? <Lock size={11} style={{color:'#9CA3AF'}}/>
              : <Globe size={11} style={{color:'#9CA3AF'}}/>
            }
          </div>
        </div>
        <button
          onClick={community.joined ? handleLeave : handleJoin}
          className="px-4 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95"
          style={community.joined
            ? {background:'#F5F5F5', color:'#6B7280'}
            : {background:'#5B4FCF', color:'white'}
          }>
          {community.joined ? 'Leave' : 'Join'}
        </button>
      </div>

      {/* Description */}
      {community.description && (
        <div className="px-5 py-3 bg-white border-b" style={{borderColor:'#F0EDE8'}}>
          <p className="text-[14px] leading-relaxed" style={{color:'#6B7280'}}>{community.description}</p>
        </div>
      )}

      {/* Posts */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 pb-32">
        {posts.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{background:'#EDE9FF'}}>
              <MessageCircle size={24} style={{color:'#5B4FCF'}}/>
            </div>
            <p className="font-bold text-[16px]" style={{color:'#1A1A2E'}}>No posts yet</p>
            <p className="text-[13px]" style={{color:'#9CA3AF'}}>
              {community.joined ? 'Be the first to post!' : 'Join to start posting'}
            </p>
          </div>
        )}
        {posts.map((post, i) => (
          <PostCard key={post.id||i} post={post} communityId={community.id}
            currentUserId={currentUserId}
            onLike={handleLike}
            onOpenComments={p => setCP(p)}
          />
        ))}
      </div>

      {/* Compose FAB */}
      {community.joined && (
        <button onClick={() => setComp(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 z-30"
          style={{background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.4)'}}>
          <Plus size={24}/>
        </button>
      )}

      <AnimatePresence>
        {compose && <ComposeSheet community={community} onClose={() => setComp(false)} onPost={p => setPosts(prev => [p,...prev])} />}
        {commentPost && <CommentsSheet post={commentPost} onClose={() => setCP(null)} onAddComment={handleComment} />}
      </AnimatePresence>

      <ToastContainer/>
    </div>
  )
}