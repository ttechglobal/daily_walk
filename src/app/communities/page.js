'use client'

// ── /communities — Update 3: For You | My Communities | Explore ──
// "For You" tab: unified feed from all joined communities.
// My Communities: list with cards. Explore: filter + join.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Users, ChevronRight, Sparkles, Search, X as XIcon,
  PenLine, Heart, MessageCircle, Share2, Home
} from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { SEED_COMMUNITIES, COMMUNITY_CATEGORIES, initials, avatarColor, formatTimestamp } from '../../lib/constants'

const CATEGORY_COLORS = {
  'Bible Study':   '#5B4FCF',
  'Prayer':        '#4A7C5F',
  'Mental Health': '#7CB9E8',
  'Youth':         '#E8A838',
  'Worship':       '#C77DFF',
  'General':       '#888780',
}

function CatBadge({ category }) {
  const color = CATEGORY_COLORS[category] || '#888780'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background:`${color}22`, color }}>{category}</span>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'Just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  if (h < 48)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

// ── Unified feed post card ──
function FeedPostCard({ post, community, onLike, onComment, onShare, showCommunityTag = true }) {
  const router  = useRouter()
  const isLiked = post.likedBy?.includes('local_user')
  const likes   = post.likedBy?.length || 0
  const comments = post.comments?.length || 0
  const typeColor = {
    general:'#888780', reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838'
  }[post.type] || '#888780'

  return (
    <motion.div
      initial={{ opacity:0, y:10 }}
      animate={{ opacity:1, y:0 }}
      className="bg-white rounded-[16px] overflow-hidden"
      style={{ boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>

      {/* Community tag — tappable */}
      {showCommunityTag && community && (
        <button
          onClick={() => router.push(`/communities/${community.id}`)}
          className="flex items-center gap-1.5 px-4 pt-3 pb-1 w-full text-left"
          style={{ borderBottom:'1px solid #F5F5F5' }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
            style={{ background: CATEGORY_COLORS[community.category] || '#888780' }}>
            {community.name[0]}
          </div>
          <span className="text-[12px] font-bold" style={{ color: CATEGORY_COLORS[community.category] || '#888780' }}>
            {community.name}
          </span>
        </button>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: avatarColor(post.authorName) }}>
              {post.authorInitials || initials(post.authorName)}
            </div>
            <div>
              <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>{post.authorName}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background:`${typeColor}18`, color:typeColor }}>
                  {post.type}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[11px] flex-shrink-0" style={{ color:'#9CA3AF' }}>{timeAgo(post.createdAt)}</span>
        </div>

        {post.passage && (
          <span className="self-start text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background:'#EDE9FF', color:'#5B4FCF' }}>
            {post.passage}
          </span>
        )}

        <p className="text-[15px] leading-[1.8]" style={{ color:'#1A1A2E' }}>{post.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
          <button onClick={() => onLike(post)} className="flex items-center gap-1.5">
            <motion.div animate={isLiked ? { scale:[1,1.35,1] } : { scale:1 }} transition={{ duration:0.22 }}>
              <Heart size={16} style={{ color:isLiked?'#EF4444':'#9CA3AF', fill:isLiked?'#EF4444':'none' }} />
            </motion.div>
            {likes > 0 && <span className="text-[12px] font-semibold" style={{ color:isLiked?'#EF4444':'#9CA3AF' }}>{likes}</span>}
          </button>
          <button onClick={() => onComment(post)} className="flex items-center gap-1.5">
            <MessageCircle size={16} style={{ color:'#9CA3AF' }} />
            {comments > 0 && <span className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>{comments}</span>}
          </button>
          <button onClick={() => onShare(post)} className="flex items-center gap-1.5 ml-auto">
            <Share2 size={14} style={{ color:'#9CA3AF' }} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── My Communities card ──
function MyCommunityCard({ community, idx }) {
  const router = useRouter()
  const color  = CATEGORY_COLORS[community.category] || '#888780'
  return (
    <motion.button
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.05 }}
      onClick={() => router.push(`/communities/${community.id}`)}
      className="w-full bg-white rounded-[16px] p-4 flex items-center gap-3 text-left hover:shadow-md transition-all active:scale-[0.98]"
      style={{ boxShadow:'0 2px 10px rgba(0,0,0,0.06)', borderLeft:`3px solid ${color}` }}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-display font-bold text-[18px] flex-shrink-0"
        style={{ background:color }}>
        {community.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-[15px] truncate" style={{ color:'#1A1A2E' }}>{community.name}</p>
          <CatBadge category={community.category} />
        </div>
        <div className="flex items-center gap-2" style={{ color:'#6B7280' }}>
          <Users size={11} />
          <span className="text-[12px]">{community.memberCount + 1}</span>
          <span className="text-[11px]">· Active recently</span>
        </div>
      </div>
      <ChevronRight size={16} style={{ color:'#9CA3AF', flexShrink:0 }} />
    </motion.button>
  )
}

// ── Explore card ──
function ExploreCard({ community, onToggleJoin, idx }) {
  const router = useRouter()
  const color  = CATEGORY_COLORS[community.category] || '#888780'
  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.06 }}
      className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow:'0 2px 10px rgba(0,0,0,0.07)' }}>
      <div className="h-1 w-full" style={{ background:color }} />
      <button className="w-full text-left px-4 pt-4 pb-2" onClick={() => router.push(`/communities/${community.id}`)}>
        <p className="font-display text-[17px] font-semibold" style={{ color:'#1A1A2E' }}>{community.name}</p>
        <div className="flex items-center gap-2 my-1">
          <CatBadge category={community.category} />
          <div className="flex items-center gap-1" style={{ color:'#6B7280' }}>
            <Users size={11} /><span className="text-[12px]">{community.memberCount + (community.joined?1:0)}</span>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color:'#6B7280' }}>{community.description}</p>
      </button>
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center">
          {[0,1,2].slice(0, Math.min(3, community.memberCount)).map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
              style={{ background:CATEGORY_COLORS[community.category]||'#888780', marginLeft:i>0?-8:0 }}>
              {community.name[0]}
            </div>
          ))}
          {community.memberCount > 3 && (
            <span className="text-[11px] font-semibold ml-2" style={{ color:'#6B7280' }}>+{community.memberCount-3}</span>
          )}
        </div>
        <button onClick={() => onToggleJoin(community.id)}
          className="rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-95"
          style={community.joined
            ? { background:'#E8F4ED', color:'#4A7C5F' }
            : { background:'#5B4FCF', color:'white' }}>
          {community.joined ? 'Joined ✓' : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunitiesPage() {
  const router   = useRouter()
  const [tab,         setTab]         = useState('foryou')
  const [filter,      setFilter]      = useState('All')
  const [query,       setQuery]       = useState('')
  const [communities, setCommunities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [, , hydrated]                = useLocalStorage('dw_communities', SEED_COMMUNITIES)

  function toggleJoin(id) {
    const c = (communities||[]).find(x => x.id === id)
    setCommunities(prev => (prev||[]).map(x =>
      x.id !== id ? x : { ...x, joined:!x.joined, memberCount:x.memberCount+(x.joined?-1:1) }
    ))
    showToast(c?.joined ? 'Left community' : 'Joined!')
  }

  // Unified feed — all posts from joined communities, sorted newest first
  const feedPosts = useMemo(() => {
    const joined = (communities||[]).filter(c => c.joined)
    const all = []
    joined.forEach(c => {
      (c.posts||[]).forEach(p => all.push({ ...p, _community: c }))
    })
    return all.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [communities])

  function handleLike(post) {
    setCommunities(prev => (prev||[]).map(c => {
      if (c.id !== post.communityId) return c
      return { ...c, posts:(c.posts||[]).map(p => {
        if (p.id !== post.id) return p
        const liked   = p.likedBy?.includes('local_user')
        const likedBy = liked ? (p.likedBy||[]).filter(x=>x!=='local_user') : [...(p.likedBy||[]), 'local_user']
        return { ...p, likedBy }
      })}
    }))
  }

  function handleComment(post) {
    router.push(`/communities/${post.communityId}`)
  }

  async function handleShare(post) {
    const text = `${post.authorName} on Daily Walk: "${(post.content||'').slice(0,80)}"`
    if (navigator.share) { try { await navigator.share({ text }) } catch {} }
    else { await navigator.clipboard.writeText(text).catch(()=>{}); showToast('Copied!') }
  }

  const searchMatch = (c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
  }

  const mine     = (communities||[]).filter(c => c.joined && searchMatch(c))
  const publicOnly = (communities||[]).filter(c => c.visibility !== 'private' || c.joined)
  const filtered = (filter==='All' ? publicOnly : publicOnly.filter(c=>c.category===filter)).filter(searchMatch)

  if (!hydrated) return null

  const TABS = [
    { key:'foryou', label:'For You' },
    { key:'mine',   label:'My Communities' },
    { key:'explore',label:'Explore' },
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold" style={{ color:'#1A1A2E' }}>Communities</h1>
          <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>Grow together with other believers</p>
        </div>
        <Link href="/communities/create"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold border-2 hover:opacity-80 transition-all"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
          <Plus size={13} /> Create
        </Link>
      </div>

      {/* Search bar */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'#9CA3AF' }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-10 pr-10 py-3 rounded-full border border-gray-200 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all bg-white"
            style={{ color:'#1A1A2E' }} />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <XIcon size={12} style={{ color:'#6B7280' }} />
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher — 3 tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[12px] font-bold transition-all"
              style={tab===t.key ? { color:'#5B4FCF' } : { color:'#6B7280' }}>
              {tab===t.key && (
                <motion.div layoutId="comm-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type:'spring', stiffness:400, damping:35 }} />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* FOR YOU — unified feed */}
        {tab === 'foryou' && (
          <motion.div key="foryou" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col gap-3 px-4 py-4 pb-28">
            {feedPosts.length === 0 ? (
              <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                className="flex flex-col items-center gap-4 text-center py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                  <Users size={28} style={{ color:'#5B4FCF' }} />
                </div>
                <div>
                  <p className="font-display text-[17px] font-semibold" style={{ color:'#1A1A2E' }}>Your feed is empty</p>
                  <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>
                    Join communities to see posts from believers around the world
                  </p>
                </div>
                <button onClick={() => setTab('explore')}
                  className="text-white rounded-full px-6 py-3 text-[14px] font-bold hover:opacity-90"
                  style={{ background:'#5B4FCF' }}>
                  Explore Communities
                </button>
              </motion.div>
            ) : (
              feedPosts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
                  <FeedPostCard
                    post={post}
                    community={post._community}
                    showCommunityTag
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                  />
                </motion.div>
              ))
            )}

            {/* Compose FAB */}
            <button
              onClick={() => {
                const joined = (communities||[]).filter(c=>c.joined)
                if (joined.length === 0) { showToast('Join a community first'); return }
                router.push(`/communities/${joined[0].id}`)
              }}
              className="fixed bottom-28 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center z-40 active:scale-95 transition-all"
              style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.45)' }}
              aria-label="New post">
              <PenLine size={20} />
            </button>
          </motion.div>
        )}

        {/* MY COMMUNITIES */}
        {tab === 'mine' && (
          <motion.div key="mine" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col gap-3 px-4 py-4 pb-10">
            {mine.length === 0 ? (
              query ? (
                <div className="text-center py-12">
                  <p className="font-semibold text-[15px]" style={{ color:'#1A1A2E' }}>No communities found for "{query}"</p>
                  <button onClick={() => setQuery('')} className="text-[13px] mt-2 underline" style={{ color:'#5B4FCF' }}>Clear search</button>
                </div>
              ) : (
                <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                  className="flex flex-col items-center gap-4 text-center py-12">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                    <Users size={28} style={{ color:'#5B4FCF' }} />
                  </div>
                  <div>
                    <p className="font-display text-[17px] font-semibold" style={{ color:'#1A1A2E' }}>No communities yet</p>
                    <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>Explore communities and find your people</p>
                  </div>
                  <button onClick={() => setTab('explore')}
                    className="text-white rounded-full px-6 py-3 text-[14px] font-bold hover:opacity-90"
                    style={{ background:'#5B4FCF' }}>Explore Communities</button>
                </motion.div>
              )
            ) : (
              mine.map((c, i) => <MyCommunityCard key={c.id} community={c} idx={i} />)
            )}
          </motion.div>
        )}

        {/* EXPLORE */}
        {tab === 'explore' && (
          <motion.div key="explore" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            {/* Filter pills */}
            <div className="flex gap-2 px-4 mt-3 overflow-x-auto scroll-hide pb-1">
              {COMMUNITY_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                  style={filter===cat
                    ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                    : { background:'white', borderColor:'#E5E7EB', color:'#6B7280' }}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 px-4 py-4 pb-10">
              {/* Discover banner */}
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                className="rounded-[20px] p-5 flex items-center gap-4 mb-1"
                style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-[15px]">Find your people. Grow together.</p>
                  <p className="text-[12px] mt-0.5" style={{ color:'rgba(255,255,255,0.7)' }}>Join a community and never walk alone.</p>
                </div>
              </motion.div>
              {filtered.map((c, i) => (
                <ExploreCard key={c.id} community={c} onToggleJoin={toggleJoin} idx={i} />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}