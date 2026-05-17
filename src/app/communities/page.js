'use client'

// ── src/app/communities/page.js ──
// Uses exact same visual language as Home and Profile:
//   • Cards: bg-white rounded-[20px] shadow-card
//   • Tab bar: same pill style as Profile tab
//   • Buttons: rounded-pill, border-purple, bg-purple
//   • Search: same input style as Profile inputs (rounded-input border-gray-200)
//   • Dark mode: Tailwind class-based — globals.css handles bg-white automatically

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Plus, Users, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useAuthGate }               from '../../components/AuthGate'
import { ToastContainer, showToast } from '../../components/Toast'
import {
  getCommunities, getJoinedCommunities, getForYouFeed,
  joinCommunity, leaveCommunity, getAuthUser,
} from '../../lib/supabase/communities'
import PostCard          from '../../components/communities/PostCard'
import PostSkeleton      from '../../components/communities/PostSkeleton'
import CommunitySkeleton from '../../components/communities/CommunitySkeleton'

const CATEGORIES = ['All','Bible Study','Prayer','Mental Health','Youth','Worship','General']

// ─────────────────────────────────────────────
//  Skeleton for explore cards — matches card shape
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

// ─────────────────────────────────────────────
//  Empty states — same tone as app's existing empties
// ─────────────────────────────────────────────
function EmptyFeed({ onExplore }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-light">
        <span style={{ fontSize: 36 }}>🌱</span>
      </div>
      <div>
        <p className="font-display font-semibold text-[18px] text-text-primary">Your feed is quiet</p>
        <p className="text-[14px] text-text-muted mt-2 leading-relaxed">
          Join communities to see posts from other believers here
        </p>
      </div>
      <button onClick={onExplore}
        className="px-7 py-3.5 rounded-pill bg-purple text-white font-bold text-[14px] active:scale-95 transition-all shadow-purple">
        Explore Communities
      </button>
    </div>
  )
}

function EmptyMine({ onExplore }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-light">
        <Users size={36} className="text-purple" />
      </div>
      <div>
        <p className="font-display font-semibold text-[18px] text-text-primary">No communities yet</p>
        <p className="text-[14px] text-text-muted mt-2">Find your people and grow together in faith</p>
      </div>
      <button onClick={onExplore}
        className="px-7 py-3.5 rounded-pill bg-purple text-white font-bold text-[14px] active:scale-95 transition-all shadow-purple">
        Explore Communities
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  My Community row — same as SettingsRow in Profile
// ─────────────────────────────────────────────
function MyCommunityRow({ community, onPress }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => onPress(community)}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-[20px] shadow-card text-left min-h-[64px] active:opacity-80 transition-opacity">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0 bg-purple">
        {(community.name || 'C')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] text-text-primary truncate">{community.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Users size={12} className="text-text-muted" />
          <span className="text-[12px] text-text-muted">
            {(community.member_count || 0).toLocaleString()} members
          </span>
        </div>
      </div>
      <ChevronRight size={17} className="text-text-muted flex-shrink-0" />
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Explore community card — same card DNA as everywhere
// ─────────────────────────────────────────────
function ExploreCard({ community, onJoin, joiningId }) {
  const router  = useRouter()
  const joined  = community.joined
  const loading = joiningId === community.id

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card">
      {/* Tappable content area */}
      <button
        className="w-full text-left block active:opacity-75 transition-opacity"
        onClick={() => router.push(`/community/${community.slug || community.id}`)}
      >
        {/* Colour header — same gradient as streak card */}
        <div className="h-[72px] flex items-end px-4 pb-3 relative"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <span className="relative z-10 text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
            {community.category || 'General'}
          </span>
        </div>

        <div className="px-4 pt-3 pb-1">
          {/* Name — text-text-primary font-bold, same as card titles everywhere */}
          <p className="font-bold text-[16px] text-text-primary leading-snug truncate">
            {community.name}
          </p>
          {community.description && (
            <p className="text-[13px] text-text-muted mt-1 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
              {community.description}
            </p>
          )}
        </div>
      </button>

      {/* Footer — member count + join button */}
      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={13} className="text-text-muted flex-shrink-0" />
          <span className="text-[12px] text-text-muted">
            {(community.member_count || 0).toLocaleString()} members
          </span>
        </div>

        {/* Join button — same pill as all buttons, min 44px, 80px wide */}
        <button
          onClick={e => { e.stopPropagation(); onJoin(community) }}
          disabled={loading}
          className={`flex items-center justify-center gap-1.5 rounded-pill font-bold text-[13px] transition-all active:scale-95 disabled:opacity-60 flex-shrink-0 ${
            joined
              ? 'border-2 border-gray-200 text-text-muted bg-transparent'
              : 'bg-purple text-white shadow-purple'
          }`}
          style={{ height: 44, minWidth: 80, paddingLeft: 16, paddingRight: 16 }}
        >
          {loading
            ? <Loader2 size={15} className="animate-spin" />
            : joined
              ? <><Check size={13} strokeWidth={3} /> Joined</>
              : 'Join'
          }
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

  const [feedPosts,      setFeedPosts]      = useState([])
  const [myCommunities,  setMyCommunities]  = useState([])
  const [allCommunities, setAllCommunities] = useState([])
  const [authUser,       setAuthUser]       = useState(null)
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [mineLoading,    setMineLoading]    = useState(true)
  const [exploreLoading, setExploreLoading] = useState(true)
  const [joiningId,      setJoiningId]      = useState(null)

  useEffect(() => { getAuthUser().then(setAuthUser) }, [])

  const loadFeed    = useCallback(async () => { setFeedLoading(true);    try { setFeedPosts(await getForYouFeed(40)) }    catch {} setFeedLoading(false)    }, [])
  const loadMine    = useCallback(async () => { setMineLoading(true);    try { setMyCommunities(await getJoinedCommunities()) } catch {} setMineLoading(false) }, [])
  const loadAll     = useCallback(async () => { setExploreLoading(true); try { setAllCommunities(await getCommunities()) }  catch {} setExploreLoading(false) }, [])

  useEffect(() => { loadFeed(); loadMine(); loadAll() }, []) // eslint-disable-line
  useEffect(() => {
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
      else           { await joinCommunity(community.id);  showToast(`Joined ${community.name} 🙌`); loadMine(); loadFeed() }
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
    { key: 'foryou',  label: 'For You'        },
    { key: 'mine',    label: 'My Communities'  },
    { key: 'explore', label: 'Explore'         },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <ToastContainer />

      {/* ── Header — same as Profile header ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="font-display text-[24px] font-bold text-text-primary">Communities</h1>
        <button
          onClick={() => authUser ? router.push('/communities/create') : requireAuth('community')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-pill text-[13px] font-bold border-2 border-purple text-purple min-h-[40px] hover:opacity-80 transition-opacity">
          <Plus size={13} /> Create
        </button>
      </div>

      {/* Search — same as Profile inputs */}
      <div className="px-4 pb-3">
        <div className="relative" style={{ minHeight: 44 }}>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search communities…"
            className="w-full bg-white border border-gray-200 rounded-pill pl-9 pr-9 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
            style={{ height: 44 }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-warm-outer flex items-center justify-center">
              <X size={11} className="text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar — same pill style as Profile */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 p-1 rounded-full bg-purple-light">
          {TABS.map(tab_ => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all min-h-[40px]"
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

      {/* Content — pb-24 clears nav */}
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
                        transition={{ delay: i * 0.04 }}>
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
                        transition={{ delay: i * 0.04 }}>
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
              {/* Category pills — same style as tags in app */}
              <div className="flex gap-2 px-4 pt-2 pb-3 overflow-x-auto scroll-hide">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilter(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-pill text-[12px] font-bold border-2 transition-all min-h-[36px] ${
                      filter === cat
                        ? 'bg-purple border-purple text-white'
                        : 'bg-white border-gray-200 text-text-muted'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Responsive grid — 1 col mobile, 2 tablet, 3 desktop */}
              <div className="px-4 pb-10">
                {exploreLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1,2,3,4,5,6].map(i => <ExploreCardSkeleton key={i} />)}
                  </div>
                ) : filteredExplore.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-16 text-center px-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-warm-outer">
                      <Users size={28} className="text-text-muted" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-[17px] text-text-primary">
                        {query ? 'No communities found' : 'No communities yet'}
                      </p>
                      <p className="text-[13px] text-text-muted mt-1">
                        {query ? 'Try a different search term' : 'Be the first to create one'}
                      </p>
                    </div>
                    {query && (
                      <button onClick={() => setQuery('')}
                        className="text-[13px] font-semibold text-purple underline">
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredExplore.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}>
                        <ExploreCard community={c} onJoin={handleJoin} joiningId={joiningId} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}