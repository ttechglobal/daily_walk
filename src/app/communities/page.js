'use client'

// ── src/app/communities/page.js ──
// For You | My Communities | Explore
// Fixed header + tabs. All data from Supabase (new schema: posts, memberships, etc.)
// Dark mode via useTheme(). Skeleton loaders. Optimistic join/leave.
// Auth gate on all write actions via useAuthGate().

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Plus, Users, Compass, ChevronRight, Check, Bookmark, Share2 } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { useAuthGate } from '../../components/AuthGate'
import { ToastContainer, showToast } from '../../components/Toast'
import {
  getCommunities, getJoinedCommunities, getForYouFeed,
  joinCommunity, leaveCommunity, subscribeToNewPosts,
  getAuthUser,
} from '../../lib/supabase/communities'
import PostCard from '../../components/communities/PostCard'
import PostSkeleton from '../../components/communities/PostSkeleton'
import CommunitySkeleton from '../../components/communities/CommunitySkeleton'

const CATEGORIES = ['All','Bible Study','Prayer','Mental Health','Youth','Worship','General']

// ─────────────────────────────────────────────
//  Empty states
// ─────────────────────────────────────────────
function EmptyFeed({ onExplore, t }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: t.purpleBg }}>
        <span style={{ fontSize: 36 }}>🌱</span>
      </div>
      <div>
        <p className="font-bold text-[18px]" style={{ color: t.text }}>
          Your feed is quiet
        </p>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
          Join communities to see posts from believers here
        </p>
      </div>
      <button onClick={onExplore}
        className="px-6 py-3.5 rounded-full text-white font-bold text-[14px]"
        style={{ background: '#5B4FCF' }}>
        Explore Communities
      </button>
    </div>
  )
}

function EmptyMine({ onExplore, t }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: t.purpleBg }}>
        <Users size={36} style={{ color: '#5B4FCF' }} />
      </div>
      <div>
        <p className="font-bold text-[18px]" style={{ color: t.text }}>
          No communities yet
        </p>
        <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
          Find your people and grow together in faith
        </p>
      </div>
      <button onClick={onExplore}
        className="px-6 py-3.5 rounded-full text-white font-bold text-[14px]"
        style={{ background: '#5B4FCF' }}>
        Explore Communities
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  My Community row
// ─────────────────────────────────────────────
function MyCommunityRow({ community, t, onPress }) {
  const color = '#5B4FCF'
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onPress(community)}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[18px] text-left min-h-[64px]"
      style={{ background: t.bgCard, boxShadow: t.shadow }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, #3D3190)` }}>
        {(community.name || 'C')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] truncate" style={{ color: t.text }}>
          {community.name}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
          {community.member_count?.toLocaleString() || 0} members
        </p>
      </div>
      <ChevronRight size={18} style={{ color: t.textFaint, flexShrink: 0 }} />
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Explore community card
// ─────────────────────────────────────────────
function ExploreCard({ community, onJoin, joining, t }) {
  const router = useRouter()
  const color  = '#5B4FCF'
  const joined = community.joined

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] overflow-hidden"
      style={{ background: t.bgCard, boxShadow: t.shadow }}
    >
      {/* Banner */}
      <button
        className="w-full text-left"
        onClick={() => router.push(`/community/${community.slug || community.id}`)}
      >
        <div className="h-[80px] flex items-end px-4 pb-3 relative"
          style={{ background: `linear-gradient(135deg, ${color}, #3D3190)` }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>
          <span className="relative z-10 text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
            {community.category || 'General'}
          </span>
        </div>
        <div className="px-4 pt-3 pb-1">
          <p className="font-bold text-[15px]" style={{ color: t.text }}>{community.name}</p>
          {community.description && (
            <p className="text-[13px] mt-1 line-clamp-2 leading-relaxed" style={{ color: t.textMuted }}>
              {community.description}
            </p>
          )}
        </div>
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Users size={13} style={{ color: t.textFaint }} />
          <span className="text-[12px]" style={{ color: t.textMuted }}>
            {community.member_count?.toLocaleString() || 0} members
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onJoin(community) }}
          disabled={joining === community.id}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 min-h-[36px]"
          style={joined
            ? { background: t.sageBg, color: '#4A7C5F' }
            : { background: '#5B4FCF', color: 'white' }
          }
        >
          {joined && <Check size={13} />}
          {joining === community.id ? '…' : joined ? 'Joined' : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function CommunitiesPage() {
  const router = useRouter()
  const { t }  = useTheme()
  const { requireAuth } = useAuthGate()

  const [tab,    setTab]    = useState('foryou')
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')

  // Data
  const [feedPosts,     setFeedPosts]     = useState([])
  const [myCommunities, setMyCommunities] = useState([])
  const [allCommunities,setAllCommunities] = useState([])
  const [authUser,      setAuthUser]      = useState(null)

  // Loading
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [mineLoading,    setMineLoading]    = useState(true)
  const [exploreLoading, setExploreLoading] = useState(true)

  // Actions
  const [joining, setJoining] = useState(null)

  // Resolve auth
  useEffect(() => {
    getAuthUser().then(setAuthUser)
  }, [])

  // Load For You feed
  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    try {
      const posts = await getForYouFeed(40)
      setFeedPosts(posts)
    } catch (e) { console.warn(e.message) }
    setFeedLoading(false)
  }, [])

  // Load My Communities
  const loadMine = useCallback(async () => {
    setMineLoading(true)
    try {
      const comms = await getJoinedCommunities()
      setMyCommunities(comms)
    } catch (e) { console.warn(e.message) }
    setMineLoading(false)
  }, [])

  // Load All (Explore)
  const loadAll = useCallback(async () => {
    setExploreLoading(true)
    try {
      const comms = await getCommunities()
      setAllCommunities(comms)
    } catch (e) { console.warn(e.message) }
    setExploreLoading(false)
  }, [])

  useEffect(() => { loadFeed(); loadMine(); loadAll() }, []) // eslint-disable-line

  // Reload on tab switch
  useEffect(() => {
    if (tab === 'foryou')  loadFeed()
    if (tab === 'mine')    loadMine()
    if (tab === 'explore') loadAll()
  }, [tab]) // eslint-disable-line

  // Real-time new posts (for currently viewed community feed posts)
  // When we add real-time to a specific community page, it's in CommunityBySlug.
  // The For You feed reloads on tab focus.

  async function handleJoin(community) {
    if (!authUser) {
      requireAuth('join')
      return
    }
    if (joining) return
    setJoining(community.id)
    const wasJoined = community.joined
    // Optimistic
    setAllCommunities(prev => prev.map(c =>
      c.id === community.id ? { ...c, joined: !wasJoined, member_count: (c.member_count||0) + (wasJoined?-1:1) } : c
    ))
    try {
      if (wasJoined) {
        await leaveCommunity(community.id)
        showToast('Left community')
        setMyCommunities(prev => prev.filter(c => c.id !== community.id))
      } else {
        await joinCommunity(community.id)
        showToast(`Joined ${community.name} 🙌`)
        loadMine()
        loadFeed()
      }
    } catch {
      // Revert
      setAllCommunities(prev => prev.map(c =>
        c.id === community.id ? { ...c, joined: wasJoined, member_count: (c.member_count||0) + (wasJoined?1:-1) } : c
      ))
      showToast('Something went wrong — please try again')
    }
    setJoining(null)
  }

  // Filter for explore
  const filteredExplore = useMemo(() => {
    let list = allCommunities.filter(c => c.visibility !== 'private' || c.joined)
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
    { key: 'foryou',  label: 'For You'        },
    { key: 'mine',    label: 'My Communities'  },
    { key: 'explore', label: 'Explore'         },
  ]

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', background: t.bg }}>
      <ToastContainer />

      {/* ── FIXED HEADER ── */}
      <header className="flex-shrink-0" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}>
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h1 className="font-display font-bold text-[22px]" style={{ color: t.text }}>
            Communities
          </h1>
          <button
            onClick={() => authUser
              ? router.push('/communities/create')
              : requireAuth('community')
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold border-2 min-h-[36px]"
            style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}
          >
            <Plus size={14} /> Create
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search communities…"
              className="w-full pl-9 pr-9 py-2.5 rounded-full text-[14px] focus:outline-none border"
              style={{ background: t.bgMuted, color: t.text, borderColor: t.border }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: t.border }}>
                <X size={11} style={{ color: t.textMuted }} />
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b" style={{ borderColor: t.border }}>
          {TABS.map(tab_ => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className="relative flex-1 py-3 text-[13px] font-bold transition-colors min-h-[44px]"
              style={{ color: tab === tab_.key ? '#5B4FCF' : t.textMuted }}>
              {tab_.label}
              {tab === tab_.key && (
                <motion.div layoutId="comm-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#5B4FCF' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 96 }}>
        <AnimatePresence mode="wait">

          {/* FOR YOU */}
          {tab === 'foryou' && (
            <motion.div key="fy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-4 pt-4">
              {feedLoading
                ? [1,2,3].map(i => <PostSkeleton key={i} t={t}/>)
                : feedPosts.length === 0
                  ? <EmptyFeed onExplore={() => setTab('explore')} t={t}/>
                  : feedPosts.map((post, i) => (
                      <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}>
                        <PostCard
                          post={post}
                          t={t}
                          authUser={authUser}
                          showCommunity
                          requireAuth={requireAuth}
                          onLikeOptimistic={nowLiked => {
                            setFeedPosts(prev => prev.map(p => p.id !== post.id ? p : {
                              ...p, liked: nowLiked, like_count: Math.max(0, (p.like_count||0) + (nowLiked?1:-1)),
                            }))
                          }}
                        />
                      </motion.div>
                    ))
              }
            </motion.div>
          )}

          {/* MY COMMUNITIES */}
          {tab === 'mine' && (
            <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2.5 px-4 pt-4">
              {mineLoading
                ? [1,2,3].map(i => <CommunitySkeleton key={i} t={t}/>)
                : filteredMine.length === 0
                  ? <EmptyMine onExplore={() => setTab('explore')} t={t}/>
                  : filteredMine.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}>
                        <MyCommunityRow
                          community={c} t={t}
                          onPress={c => router.push(`/community/${c.slug || c.id}`)}
                        />
                      </motion.div>
                    ))
              }
            </motion.div>
          )}

          {/* EXPLORE */}
          {tab === 'explore' && (
            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Category filter */}
              <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scroll-hide">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilter(cat)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all min-h-[36px]"
                    style={filter === cat
                      ? { background: '#5B4FCF', borderColor: '#5B4FCF', color: 'white' }
                      : { background: t.bgCard, borderColor: t.borderInput, color: t.textMuted }
                    }>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 px-4 pb-10">
                {exploreLoading
                  ? [1,2,3].map(i => <CommunitySkeleton key={i} t={t}/>)
                  : filteredExplore.length === 0
                    ? (
                      <div className="text-center py-16">
                        <p className="font-semibold text-[15px]" style={{ color: t.text }}>
                          {query ? `No results for "${query}"` : 'No communities found'}
                        </p>
                        {query && (
                          <button onClick={() => setQuery('')} className="text-[13px] mt-2 underline"
                            style={{ color: '#5B4FCF' }}>
                            Clear search
                          </button>
                        )}
                      </div>
                    )
                    : filteredExplore.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}>
                          <ExploreCard community={c} t={t} onJoin={handleJoin} joining={joining}/>
                        </motion.div>
                      ))
                }
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}