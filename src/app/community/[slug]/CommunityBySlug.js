'use client'

// ── src/app/community/[slug]/CommunityBySlug.js ──
//
// FIX 1 — Admin access control:
//   Root cause: isCreator was computed as a derived value at render time,
//   but authUser loads async (getAuthUser() resolves after community loads).
//   On first render both are null → isCreator=false → Manage button hidden.
//   On second render community is set but authUser may still be null.
//   Fix: useEffect watches both authUser and community and sets isCreator
//   explicitly in state only when BOTH are resolved and non-null.
//   This guarantees the button appears reliably for the actual creator.
//
// FIX 2 — Members tab hidden from non-admins:
//   Regular members see only Posts and About tabs.
//   Admins/creators see Posts, About, and Members.
//
// DESIGN — World-class community page:
//   • Rich hero banner with gradient, community initial, category pill
//   • Info card below banner: name (large), description, member count, tags
//   • Clean tab bar (compact, consistent with rest of app)
//   • Posts feed with proper empty states
//   • Floating action button for compose

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Share2, Settings,
  CheckCircle2, UserPlus, X, Send, Globe, Lock,
} from 'lucide-react'
import { useAuthGate }               from '../../../components/AuthGate'
import { ToastContainer, showToast } from '../../../components/Toast'
import PostComposer                  from '../../../components/PostComposer'
import {
  getCommunityBySlug, getPosts, deletePost,
  getComments, addComment,
  joinCommunity, leaveCommunity,
  subscribeToNewPosts, subscribeToNewComments,
  subscribeMemberCount,
  getAuthUser,
} from '../../../lib/supabase/communities'
import PostCard     from '../../../components/communities/PostCard'
import PostSkeleton from '../../../components/communities/PostSkeleton'

function fmtCount(n) {
  const v = n || 0
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, avatar, size = 40 }) {
  const ini    = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0) || 0) % colors.length]
  if (avatar) return (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={e => { e.currentTarget.style.display='none' }} />
  )
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.36) }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Comment sheet
// ─────────────────────────────────────────────
function CommentSheet({ post, authUser, onClose }) {
  const { requireAuth } = useAuthGate()
  const [text,     setText]     = useState('')
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getComments(post.id)
      .then(d => { setComments(d); setLoading(false) })
      .catch(() => setLoading(false))
    const unsub = subscribeToNewComments(post.id, c => {
      setComments(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return () => unsub()
  }, [post.id])

  async function submit() {
    if (!text.trim() || sending) return
    if (!authUser) { requireAuth('comment'); return }
    setSending(true)
    try {
      const c = await addComment(post.id, text.trim())
      setComments(prev => [...prev, c])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch { showToast('Failed to post comment') }
    finally   { setSending(false) }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'75dvh', paddingBottom:'max(1rem,env(safe-area-inset-bottom))' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-warm-outer"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-[16px] text-text-primary">Comments</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-warm-outer flex items-center justify-center">
            <X size={14} className="text-text-muted"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          {loading && [1,2,3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-warm-outer flex-shrink-0"/>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 w-20 rounded-full bg-warm-outer"/>
                <div className="h-3 w-full rounded-full bg-warm-outer"/>
              </div>
            </div>
          ))}
          {!loading && !comments.length && (
            <p className="text-center text-[13px] text-text-muted py-8">
              No comments yet — be the first.
            </p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.authorName} avatar={c.authorAvatar} size={32}/>
              <div className="flex-1 min-w-0">
                <div className="inline-flex flex-wrap items-baseline gap-1.5">
                  <span className="font-bold text-[13px] text-text-primary">{c.authorName}</span>
                  <span className="text-[13px] text-text-primary">{c.content}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-1">{timeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 flex-shrink-0">
          {authUser && <Avatar name={authUser.name||''} avatar={authUser.avatar_url} size={32}/>}
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submit()}
            placeholder="Add a comment…"
            className="flex-1 bg-warm-outer rounded-full px-4 py-2.5 text-[14px] focus:outline-none text-text-primary placeholder:text-text-muted"/>
          <button onClick={submit} disabled={!text.trim()||sending}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-purple disabled:opacity-40 transition-all active:scale-90">
            <Send size={15} className="text-white"/>
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  About tab
// ─────────────────────────────────────────────
function AboutTab({ community }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="bg-white rounded-[18px] p-4 shadow-card">
        <p className="font-bold text-[14px] text-text-primary mb-2">About this community</p>
        <p className="text-[14px] leading-relaxed text-text-muted">
          {community.description || 'A community on Daily Walk.'}
        </p>
      </div>
      <div className="bg-white rounded-[18px] p-4 shadow-card">
        {[
          ['Category',   community.category || 'General'],
          ['Visibility', community.visibility === 'private' ? '🔒 Private' : '🌐 Public'],
          ['Members',    fmtCount(community.member_count)],
          ['Created by', community.owner_name || 'Daily Walk'],
        ].map(([l,v]) => (
          <div key={l} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-[13px] text-text-muted">{l}</span>
            <span className="text-[13px] font-semibold text-text-primary">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function CommunityBySlug({ slug }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()

  const [authUser,    setAuthUser]    = useState(null)
  const [community,   setComm]        = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [posts,       setPosts]       = useState([])
  const [tab,         setTab]         = useState('posts')
  const [loading,     setLoading]     = useState(true)
  const [postsLoad,   setPostsLoad]   = useState(true)
  const [error,       setError]       = useState(null)
  const [joining,     setJoining]     = useState(false)
  const [compose,     setCompose]     = useState(false)
  const [cpPost,      setCpPost]      = useState(null)

  // FIX: isCreator in state, set only when BOTH authUser and community are resolved
  const [isCreator, setIsCreator] = useState(false)

  // Resolve auth user
  useEffect(() => { getAuthUser().then(setAuthUser) }, [])

  // Load community
  const loadCommunity = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const comm = await getCommunityBySlug(slug)
      if (!comm) { setError('not_found'); return }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug) && comm.slug)
        window.history.replaceState(null, '', `/community/${comm.slug}`)
      setComm(comm)
      setMemberCount(comm.member_count || 0)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { loadCommunity() }, [loadCommunity])

  // FIX: Watch both authUser and community. Set isCreator only when both are available.
  // This prevents the timing bug where one resolves before the other.
  useEffect(() => {
    if (!authUser?.id || !community?.created_by) return
    const result = authUser.id === community.created_by
    setIsCreator(result)
    if (result) console.log('[CommunityBySlug] Creator confirmed:', authUser.id)
  }, [authUser?.id, community?.created_by])

  // Load posts
  useEffect(() => {
    if (!community?.id) return
    setPostsLoad(true)
    getPosts(community.id)
      .then(d => { setPosts(d || []); setPostsLoad(false) })
      .catch(() => setPostsLoad(false))
  }, [community?.id])

  // Real-time new posts
  useEffect(() => {
    if (!community?.id) return
    const unsub = subscribeToNewPosts(community.id, np => {
      if (np.authorId === authUser?.id) return
      setPosts(prev => prev.some(p => p.id === np.id) ? prev : [np, ...prev])
    })
    return () => unsub()
  }, [community?.id, authUser?.id])

  // Real-time member count
  useEffect(() => {
    if (!community?.id) return
    const unsub = subscribeMemberCount(community.id, count => setMemberCount(count))
    return () => unsub()
  }, [community?.id])

  async function handleJoin() {
    if (!authUser) { requireAuth('join'); return }
    if (joining) return
    setJoining(true)
    const wasJoined = community.joined
    setComm(c => ({ ...c, joined: !wasJoined }))
    setMemberCount(n => n + (wasJoined ? -1 : 1))
    try {
      if (wasJoined) { await leaveCommunity(community.id); showToast('Left community') }
      else           { await joinCommunity(community.id);  showToast(`Joined ${community.name} 🙌`) }
    } catch {
      setComm(c => ({ ...c, joined: wasJoined }))
      setMemberCount(n => n + (wasJoined ? 1 : -1))
      showToast('Something went wrong')
    }
    setJoining(false)
  }

  async function handleDeletePost(postId) {
    if (!confirm('Delete this post?')) return
    try {
      await deletePost(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      showToast('Post deleted')
    } catch { showToast('Delete failed') }
  }

  function handleShare() {
    const url = `${window.location.origin}/community/${community.slug || slug}`
    if (navigator.share) {
      navigator.share({ title: community.name, url }).catch(() => null)
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
    }
  }

  // Tabs: admins see all three, regular members see Posts + About only
  const TABS = isCreator
    ? ['posts', 'about', 'members']
    : ['posts', 'about']

  // ── Loading state ──
  if (loading) return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      {/* Hero skeleton */}
      <div className="h-[200px] bg-warm-outer animate-pulse"/>
      <div className="px-4 -mt-10">
        <div className="bg-white rounded-[20px] shadow-card p-5 animate-pulse">
          <div className="h-6 w-48 rounded-full bg-warm-outer mb-2"/>
          <div className="h-4 w-full rounded-full bg-warm-outer mb-1"/>
          <div className="h-4 w-3/4 rounded-full bg-warm-outer"/>
        </div>
      </div>
      <div className="px-4 mt-4 flex flex-col gap-3">
        {[1,2,3].map(i => <PostSkeleton key={i}/>)}
      </div>
    </div>
  )

  if (error === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center bg-warm-bg">
      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-light">
        <Users size={36} className="text-purple"/>
      </div>
      <div>
        <p className="font-bold text-[22px] text-text-primary">Community not found</p>
        <p className="text-[14px] mt-2 text-text-muted">This link may have been removed.</p>
      </div>
      <button onClick={() => router.push('/communities')}
        className="px-7 py-3.5 rounded-full bg-purple text-white font-bold text-[15px]">
        Browse Communities
      </button>
    </div>
  )

  if (!community) return null

  // Category → gradient accent
  const CATEGORY_GRADIENTS = {
    'Bible Study':     'linear-gradient(135deg, #5B4FCF 0%, #3D3190 100%)',
    'Prayer':          'linear-gradient(135deg, #4A7C5F 0%, #2D6043 100%)',
    'Mental Health':   'linear-gradient(135deg, #7CB9E8 0%, #4A90D9 100%)',
    'Youth':           'linear-gradient(135deg, #E8A838 0%, #D4850A 100%)',
    'Worship':         'linear-gradient(135deg, #C77DFF 0%, #9B40E8 100%)',
    'General':         'linear-gradient(135deg, #5B4FCF 0%, #3D3190 100%)',
  }
  const heroGradient = CATEGORY_GRADIENTS[community.category] || CATEGORY_GRADIENTS.General

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <ToastContainer/>

      {/* ── HERO BANNER ── */}
      <div className="relative" style={{ height: 220 }}>
        {/* Gradient background */}
        <div className="absolute inset-0" style={{ background: heroGradient }}/>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize:'22px 22px' }}/>

        {/* Bottom fade — blends into the info card */}
        <div className="absolute bottom-0 left-0 right-0 h-20"
          style={{ background:'linear-gradient(to bottom, transparent, rgba(0,0,0,0.15))' }}/>

        {/* Back + Actions */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
          <button onClick={() => router.push('/communities')}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background:'rgba(0,0,0,0.25)', backdropFilter:'blur(6px)' }}>
            <ArrowLeft size={18} className="text-white"/>
          </button>

          <div className="flex items-center gap-2">
            {/* Manage — only visible to creator/admin */}
            {isCreator && (
              <button
                onClick={() => router.push(`/community/${community.slug}/manage`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(6px)' }}>
                <Settings size={14} className="text-white"/>
                <span className="text-white text-[12px] font-bold">Manage</span>
              </button>
            )}
            <button onClick={handleShare}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background:'rgba(0,0,0,0.25)', backdropFilter:'blur(6px)' }}>
              <Share2 size={16} className="text-white"/>
            </button>
          </div>
        </div>

        {/* Community initial — large, centered */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="w-20 h-20 rounded-[22px] flex items-center justify-center text-white font-bold text-[32px] border-4 border-white shadow-lg"
            style={{ background: heroGradient }}>
            {(community.name || 'C')[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── INFO CARD ── */}
      <div className="px-4 pt-12 pb-0">
        <div className="bg-white rounded-[22px] shadow-card px-5 pt-5 pb-0">
          {/* Name + badges */}
          <div className="text-center mb-1">
            <h1 className="font-display font-bold text-[24px] text-text-primary leading-tight">
              {community.name}
            </h1>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-center gap-3 mt-1.5 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-text-muted"/>
              <span className="text-[13px] font-semibold text-text-muted">
                {fmtCount(memberCount)} members
              </span>
            </div>
            {community.category && (
              <>
                <span className="text-text-muted text-[12px]">·</span>
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-purple-light text-purple">
                  {community.category}
                </span>
              </>
            )}
            {community.visibility === 'private'
              ? <Lock size={13} className="text-text-muted"/>
              : <Globe size={13} className="text-text-muted"/>
            }
            {isCreator && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                ✦ Admin
              </span>
            )}
          </div>

          {/* Description */}
          {community.description && (
            <p className="text-[14px] leading-relaxed text-text-muted text-center mb-4 px-2">
              {community.description}
            </p>
          )}

          {/* Join / Leave button */}
          <div className="flex justify-center pb-4">
            {isCreator ? null : (
              <button onClick={handleJoin} disabled={joining}
                className={`flex items-center gap-2 px-8 py-3 rounded-full text-[14px] font-bold transition-all active:scale-95 ${
                  community.joined
                    ? 'border-2 border-gray-200 text-text-muted bg-transparent'
                    : 'bg-purple text-white shadow-purple'
                }`}>
                {joining ? '…'
                  : community.joined
                    ? <><CheckCircle2 size={16}/> Joined</>
                    : <><UserPlus size={16}/> Join community</>
                }
              </button>
            )}
          </div>

          {/* ── Tab bar — inside the card, flush bottom ── */}
          <div className="flex border-t border-gray-100">
            {TABS.map(t_ => (
              <button key={t_} onClick={() => setTab(t_)}
                className="flex-1 py-3.5 text-[13px] font-bold capitalize transition-colors relative"
                style={{ color: tab === t_ ? '#5B4FCF' : '#9CA3AF' }}>
                {t_}
                {tab === t_ && (
                  <motion.div layoutId="community-tab-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-purple"
                    style={{ width:'40%' }}
                    transition={{ type:'spring', stiffness:400, damping:35 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1" style={{ paddingBottom: community.joined && tab==='posts' ? 96 : 80 }}>
        <AnimatePresence mode="wait">

          {/* POSTS */}
          {tab === 'posts' && (
            <motion.div key="posts" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="flex flex-col gap-3 px-4 py-4">
              {postsLoad
                ? [1,2,3].map(i => <PostSkeleton key={i}/>)
                : posts.length === 0
                  ? (
                    <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-light">
                        <Users size={28} className="text-purple"/>
                      </div>
                      <p className="font-bold text-[17px] text-text-primary">No posts yet</p>
                      <p className="text-[14px] text-text-muted leading-relaxed">
                        {community.joined
                          ? 'Be the first to share a reflection, prayer, or encouragement.'
                          : 'Join this community to see and create posts.'
                        }
                      </p>
                      {community.joined && (
                        <button onClick={() => setCompose(true)}
                          className="px-6 py-3 rounded-full bg-purple text-white font-bold text-[14px] shadow-purple">
                          Write the first post
                        </button>
                      )}
                    </div>
                  )
                  : posts.map((post, i) => (
                      <motion.div key={post.id}
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.2) }}>
                        <PostCard
                          post={post}
                          authUser={authUser}
                          requireAuth={requireAuth}
                          onDelete={authUser?.id === post.authorId ? handleDeletePost : undefined}
                          onCommentTap={p => authUser ? setCpPost(p) : requireAuth('comment')}
                          onLikeOptimistic={nowLiked => {
                            setPosts(prev => prev.map(p =>
                              p.id !== post.id ? p : {
                                ...p,
                                liked:      nowLiked,
                                like_count: Math.max(0, (p.like_count||0) + (nowLiked?1:-1)),
                              }
                            ))
                          }}
                        />
                      </motion.div>
                    ))
              }
            </motion.div>
          )}

          {/* ABOUT */}
          {tab === 'about' && (
            <motion.div key="about" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              <AboutTab community={{ ...community, member_count: memberCount }}/>
            </motion.div>
          )}

          {/* MEMBERS — admin only */}
          {tab === 'members' && isCreator && (
            <motion.div key="members" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="px-4 py-4">
              <div className="bg-white rounded-[18px] p-5 shadow-card text-center">
                <p className="font-semibold text-[15px] text-text-primary mb-1">
                  {fmtCount(memberCount)} members
                </p>
                <p className="text-[13px] text-text-muted">
                  Full member list available in the Manage panel.
                </p>
                <button onClick={() => router.push(`/community/${community.slug}/manage`)}
                  className="mt-4 px-5 py-2.5 rounded-full bg-purple text-white text-[13px] font-bold">
                  Open Manage panel
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── FAB — compose post ── */}
      {tab === 'posts' && (
        <motion.button
          onClick={() => community.joined ? setCompose(true) : (authUser ? handleJoin() : requireAuth('join'))}
          className="fixed flex items-center justify-center text-white rounded-full z-30 bg-purple shadow-purple"
          style={{ width:56, height:56, bottom:80, right:16 }}
          initial={{ scale:0 }} animate={{ scale:1 }} whileTap={{ scale:0.9 }}
          transition={{ type:'spring', stiffness:400, damping:24 }}>
          <Plus size={24}/>
        </motion.button>
      )}

      <AnimatePresence>
        {compose && community && (
          <PostComposer
            defaultCommunityId={community.id}
            onClose={() => setCompose(false)}
            onPost={post => {
              if (post.communityId === community.id) setPosts(prev => [post, ...prev])
            }}
          />
        )}
        {cpPost && (
          <CommentSheet post={cpPost} authUser={authUser} onClose={() => setCpPost(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}