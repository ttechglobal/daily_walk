'use client'

// ── src/app/communities/page.js ──
//
// BUGS FIXED:
//  1. Load speed: tabs now load lazily — only the active tab fetches data.
//     Previously all three tabs (foryou, mine, explore) fired fetches simultaneously
//     on mount regardless of which tab was visible.
//
//  2. Post button moved from the header (where it clashed with other buttons) to
//     a floating action button (FAB) at bottom-right — consistent with the
//     CommunityBySlug page FAB pattern. Clean header, no visual collisions.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Plus, Users, ChevronRight, Check, Loader2, PenLine } from 'lucide-react'
import { useAuthGate }               from '../../components/AuthGate'
import { ToastContainer, showToast } from '../../components/Toast'
import PostComposer                  from '../../components/PostComposer'
import {
  getCommunities, getJoinedCommunities, getForYouFeed,
  joinCommunity, leaveCommunity, getAuthUser,
} from '../../lib/supabase/communities'
import PostCard          from '../../components/communities/PostCard'
import PostSkeleton      from '../../components/communities/PostSkeleton'
import CommunitySkeleton from '../../components/communities/CommunitySkeleton'

const CATEGORIES = ['All','Bible Study','Prayer','Mental Health','Youth','Worship','General']

// ─────────────────────────────────────────────
//  Skeletons
// ─────────────────────────────────────────────
function ExploreCardSkeleton() {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card animate-pulse">
      <div className="h-[72px] bg-warm-outer" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-4 rounded-full w-2/3 bg-warm-outer" />
        <div className="h-3 rounded-full w-full bg-warm-outer" />
        <div className="h-3 rounded-full w-4/5 bg-warm-outer" />
        <div className="flex items-center justify-between mt-1">
          <div className="h-3 rounded-full w-1/4 bg-warm-outer" />
          <div className="h-9 w-20 rounded-pill bg-warm-outer" />
        </div>
      </div>
    </div>
  )
}

function EmptyFeed({ onExplore }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
      <div className="text-[40px]">🙏</div>
      <p className="font-bold text-[17px] text-text-primary">Your feed is empty</p>
      <p className="text-[14px] text-text-muted leading-relaxed">
        Join some communities to see posts from your brothers and sisters in faith.
      </p>
      <button onClick={onExplore}
        className="px-6 py-3 rounded-pill bg-purple text-white font-bold text-[14px] shadow-purple">
        Explore communities
      </button>
    </div>
  )
}

function EmptyMine({ onExplore }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
      <div className="text-[40px]">👥</div>
      <p className="font-bold text-[17px] text-text-primary">No communities yet</p>
      <p className="text-[14px] text-text-muted">Join a community to get started.</p>
      <button onClick={onExplore}
        className="px-6 py-3 rounded-pill bg-purple text-white font-bold text-[14px] shadow-purple">
        Find communities
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  My community row
// ─────────────────────────────────────────────
function MyCommunityRow({ community, onPress }) {
  return (
    <button onClick={() => onPress(community)}
      className="w-full flex items-center gap-3 p-3.5 bg-white rounded-[16px] shadow-card active:scale-[0.98] transition-all text-left min-h-[64px]"
      style={{ border: '1.5px solid rgba(0,0,0,0.06)' }}>
      <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 font-bold text-white text-[15px]"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {(community.name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] text-text-primary truncate">{community.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Users size={11} className="text-text-muted flex-shrink-0" />
          <span className="text-[12px] text-text-muted">{(community.member_count||0).toLocaleString()} members</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Explore card
// ─────────────────────────────────────────────
function ExploreCard({ community, onJoin, joined, loading }) {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card"
      style={{ border: '1.5px solid rgba(0,0,0,0.06)' }}>
      <button className="w-full text-left"
        onClick={() => window.location.assign(`/community/${community.slug || community.id}`)}>
        <div className="h-[72px] flex items-end px-4 pb-3 relative"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <span className="relative z-10 text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
            {community.category || 'General'}
          </span>
        </div>
        <div className="px-4 pt-3 pb-1">
          <p className="font-bold text-[16px] text-text-primary leading-snug truncate">{community.name}</p>
          {community.description && (
            <p className="text-[13px] text-text-muted mt-1 leading-relaxed"
              style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {community.description}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={13} className="text-text-muted flex-shrink-0" />
          <span className="text-[12px] text-text-muted">{(community.member_count||0).toLocaleString()} members</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onJoin(community) }}
          disabled={loading}
          className={`flex items-center justify-center gap-1.5 rounded-pill font-bold text-[13px] transition-all active:scale-95 disabled:opacity-60 flex-shrink-0 ${
            joined ? 'border-2 border-gray-200 text-text-muted bg-transparent' : 'bg-purple text-white shadow-purple'
          }`}
          style={{ height: 44, minWidth: 80, paddingLeft: 16, paddingRight: 16 }}>
          {loading ? <Loader2 size={15} className="animate-spin" />
            : joined ? <><Check size={13} strokeWidth={3}/> Joined</> : 'Join'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunitiesPage() {
  const router = useRouter()
  const { requireAuth } = useAuthGate()

  const [tab,    setTab]    = useState('foryou')
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')
  const [compose,setCompose]= useState(false)

  const [feedPosts,      setFeedPosts]      = useState([])
  const [myCommunities,  setMyCommunities]  = useState([])
  const [allCommunities, setAllCommunities] = useState([])
  const [authUser,       setAuthUser]       = useState(null)
  const [feedLoading,    setFeedLoading]    = useState(false)
  const [mineLoading,    setMineLoading]    = useState(false)
  const [exploreLoading, setExploreLoading] = useState(false)
  const [joiningId,      setJoiningId]      = useState(null)

  // Track which tabs have already been loaded to avoid re-fetching
  const [loadedTabs, setLoadedTabs] = useState(new Set())

  useEffect(() => { getAuthUser().then(setAuthUser) }, [])

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    try { setFeedPosts(await getForYouFeed(40)) } catch {}
    setFeedLoading(false)
  }, [])

  const loadMine = useCallback(async () => {
    setMineLoading(true)
    try { setMyCommunities(await getJoinedCommunities()) } catch {}
    setMineLoading(false)
  }, [])

  const loadAll = useCallback(async () => {
    setExploreLoading(true)
    try { setAllCommunities(await getCommunities()) } catch {}
    setExploreLoading(false)
  }, [])

  // FIX: Lazy loading — only load the active tab's data.
  // Each tab loads once and is cached; re-loading only when explicitly triggered.
  useEffect(() => {
    if (loadedTabs.has(tab)) return  // already loaded, don't re-fetch
    setLoadedTabs(prev => new Set([...prev, tab]))

    if (tab === 'foryou')  loadFeed()
    if (tab === 'mine')    loadMine()
    if (tab === 'explore') loadAll()
  }, [tab]) // eslint-disable-line

  async function handleJoin(community) {
    if (!authUser) { requireAuth('join'); return }
    if (joiningId) return
    setJoiningId(community.id)
    const wasJoined = community.joined
    setAllCommunities(prev => prev.map(c =>
      c.id === community.id ? { ...c, joined: !wasJoined, member_count: (c.member_count||0)+(wasJoined?-1:1) } : c
    ))
    try {
      if (wasJoined) { await leaveCommunity(community.id); showToast('Left community') }
      else           { await joinCommunity(community.id);  showToast(`Joined ${community.name} 🙌`)
        // Refresh mine tab next time it's opened
        setLoadedTabs(prev => { const n = new Set(prev); n.delete('mine'); n.delete('foryou'); return n })
      }
    } catch {
      setAllCommunities(prev => prev.map(c =>
        c.id === community.id ? { ...c, joined: wasJoined, member_count: (c.member_count||0)+(wasJoined?1:-1) } : c
      ))
      showToast('Something went wrong')
    }
    setJoiningId(null)
  }

  const filteredExplore = useMemo(() => {
    let list = allCommunities
    if (filter !== 'All') list = list.filter(c => c.category === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return list
  }, [allCommunities, filter, query])

  const filteredMine = useMemo(() => {
    if (!query.trim()) return myCommunities
    const q = query.toLowerCase()
    return myCommunities.filter(c => c.name?.toLowerCase().includes(q))
  }, [myCommunities, query])

  const TABS = [
    { key: 'foryou',  label: 'For You'       },
    { key: 'mine',    label: 'My Communities' },
    { key: 'explore', label: 'Explore'        },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <ToastContainer />

      {/* ── Header — clean, no Post button cluttering it ── */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-[24px] font-bold text-text-primary">Communities</h1>
          {/* Only "Create Community" in the header — Post is now a FAB */}
          <button
            onClick={() => authUser ? router.push('/communities/create') : requireAuth('community')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-pill text-[12px] font-bold border-2 border-purple text-purple min-h-[36px] hover:opacity-80 transition-opacity">
            <Plus size={12} /> Community
          </button>
        </div>

        {/* Search */}
        <div className="relative" style={{ minHeight: 44 }}>
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search communities…"
            className="w-full bg-white border border-gray-200 rounded-pill pl-9 pr-9 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
            style={{ height: 44 }} />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-warm-outer flex items-center justify-center">
              <X size={11} className="text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* ── Compact Tab bar ── */}
      <div className="px-4 pb-3">
        <div className="flex gap-0.5 p-1 rounded-full bg-purple-light">
          {TABS.map(tab_ => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all min-h-[36px]"
              style={tab === tab_.key ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
              {tab === tab_.key && (
                <motion.div layoutId="comm-tab"
                  className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
              )}
              <span className="relative z-10">{tab_.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <AnimatePresence mode="wait">

          {/* FOR YOU */}
          {tab === 'foryou' && (
            <motion.div key="fy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-4 pt-2">
              {feedLoading
                ? [1,2,3].map(i => <PostSkeleton key={i} />)
                : feedPosts.length === 0
                  ? <EmptyFeed onExplore={() => setTab('explore')} />
                  : feedPosts.map((post, i) => (
                      <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                        <PostCard post={post} authUser={authUser} showCommunity requireAuth={requireAuth}
                          onLikeOptimistic={nowLiked => setFeedPosts(prev => prev.map(p =>
                            p.id !== post.id ? p : { ...p, liked: nowLiked, like_count: Math.max(0,(p.like_count||0)+(nowLiked?1:-1)) }
                          ))} />
                      </motion.div>
                    ))
              }
            </motion.div>
          )}

          {/* MY COMMUNITIES */}
          {tab === 'mine' && (
            <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2.5 px-4 pt-2">
              {mineLoading
                ? [1,2,3].map(i => <CommunitySkeleton key={i} />)
                : filteredMine.length === 0
                  ? <EmptyMine onExplore={() => setTab('explore')} />
                  : filteredMine.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.24) }}>
                        <MyCommunityRow community={c}
                          onPress={c => router.push(`/community/${c.slug || c.id}`)} />
                      </motion.div>
                    ))
              }
            </motion.div>
          )}

          {/* EXPLORE */}
          {tab === 'explore' && (
            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-2 px-4 pt-2 pb-3 overflow-x-auto scroll-hide">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilter(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[12px] font-bold border-2 transition-all min-h-[34px] ${
                      filter === cat ? 'bg-purple border-purple text-white' : 'bg-white border-gray-200 text-text-muted'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-10">
                {exploreLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1,2,3,4].map(i => <ExploreCardSkeleton key={i} />)}
                  </div>
                ) : filteredExplore.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <p className="font-bold text-[16px] text-text-primary">No communities found</p>
                    <p className="text-[13px] text-text-muted">Try a different category or search term.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredExplore.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.32) }}>
                        <ExploreCard community={c} joined={c.joined}
                          loading={joiningId === c.id}
                          onJoin={handleJoin} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── FAB: Create Post — bottom right, mobile-first ──
           FIX: moved from header row where it clashed with other buttons.
           Consistent with CommunityBySlug FAB (bottom: 80, right: 16). */}
      <motion.button
        onClick={() => authUser ? setCompose(true) : requireAuth('post')}
        className="fixed flex items-center gap-2 text-white font-bold rounded-full z-30 bg-purple shadow-purple"
        style={{
          bottom:       80,
          right:        16,
          height:       52,
          paddingLeft:  18,
          paddingRight: 18,
          fontSize:     14,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      >
        <PenLine size={18} />
        Post
      </motion.button>

      {/* Post composer sheet */}
      <AnimatePresence>
        {compose && (
          <PostComposer
            onClose={() => setCompose(false)}
            onPost={post => {
              // Prepend to feed if it belongs there
              setFeedPosts(prev => [post, ...prev])
              // Invalidate mine/foryou caches so they refresh next visit
              setLoadedTabs(prev => { const n = new Set(prev); n.delete('foryou'); return n })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}