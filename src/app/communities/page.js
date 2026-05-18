'use client'

// ── src/app/communities/page.js ──
//
// FIX 7: Page load speed — removed duplicate data fetching.
//   Before: loadFeed/loadMine/loadAll fired on mount AND on tab change → 2× fetches.
//   After:  Initial mount loads all three in parallel. Tab change only refetches
//           the active tab's data if it hasn't loaded yet.
//
// FIX 8: Post button moved to FAB (floating action button) at bottom-right on mobile.
//   The old "Post" button in the header was visually clashing with the "Community"
//   button and the search bar. On mobile it now renders as a fixed FAB.
//   On desktop it stays in the header area where there is room.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, PenLine, Users, Loader2, Check } from 'lucide-react'
import { useAuthGate }               from '../../components/AuthGate'
import { ToastContainer, showToast } from '../../components/Toast'
import PostComposer                  from '../../components/PostComposer'
import PostCard                      from '../../components/communities/PostCard'
import PostSkeleton                  from '../../components/communities/PostSkeleton'
import {
  getCommunities, getJoinedCommunities, getForYouFeed,
  joinCommunity, leaveCommunity, getAuthUser,
} from '../../lib/supabase/communities'

const TABS = [
  { key: 'foryou',  label: 'For You'  },
  { key: 'mine',    label: 'My Feed'  },
  { key: 'explore', label: 'Explore'  },
]

// ─────────────────────────────────────────────
//  Community card
// ─────────────────────────────────────────────
function CommunityCard({ community, onJoin, joiningId }) {
  const loading = joiningId === community.id

  return (
    <div className="bg-white rounded-[18px] p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0 bg-purple">
          {(community.name || 'C')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-text-primary truncate">{community.name}</p>
          <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2">{community.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[12px] text-text-muted">
          <Users size={12} />
          <span>{(community.member_count || 0).toLocaleString()} members</span>
        </div>
        <button
          onClick={() => onJoin(community)}
          disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
            community.joined
              ? 'border-2 border-gray-200 text-text-muted bg-transparent'
              : 'bg-purple text-white shadow-purple'
          }`}
          style={{ height: 44, minWidth: 80, paddingLeft: 16, paddingRight: 16 }}>
          {loading ? <Loader2 size={15} className="animate-spin" />
            : community.joined ? <><Check size={13} strokeWidth={3}/> Joined</> : 'Join'}
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
  const [compose, setCompose] = useState(false)

  const [feedPosts,      setFeedPosts]      = useState([])
  const [myCommunities,  setMyCommunities]  = useState([])
  const [allCommunities, setAllCommunities] = useState([])
  const [authUser,       setAuthUser]       = useState(null)

  // Separate loading states per tab
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [mineLoading,    setMineLoading]    = useState(true)
  const [exploreLoading, setExploreLoading] = useState(true)
  const [joiningId,      setJoiningId]      = useState(null)

  // Track which tabs have already loaded so tab-switches don't re-fetch unnecessarily
  const loadedRef = useRef({ foryou: false, mine: false, explore: false })

  // ── Load auth user ──
  useEffect(() => { getAuthUser().then(setAuthUser) }, [])

  // ── Load data functions ──
  const loadFeed = useCallback(async (force = false) => {
    if (!force && loadedRef.current.foryou) return
    setFeedLoading(true)
    try { setFeedPosts(await getForYouFeed(40)) } catch {}
    setFeedLoading(false)
    loadedRef.current.foryou = true
  }, [])

  const loadMine = useCallback(async (force = false) => {
    if (!force && loadedRef.current.mine) return
    setMineLoading(true)
    try { setMyCommunities(await getJoinedCommunities()) } catch {}
    setMineLoading(false)
    loadedRef.current.mine = true
  }, [])

  const loadAll = useCallback(async (force = false) => {
    if (!force && loadedRef.current.explore) return
    setExploreLoading(true)
    try { setAllCommunities(await getCommunities()) } catch {}
    setExploreLoading(false)
    loadedRef.current.explore = true
  }, [])

  // ── Initial load — fire all three in parallel, don't block each other ──
  useEffect(() => {
    loadFeed()
    loadMine()
    loadAll()
  }, []) // eslint-disable-line

  // ── Tab change — only fetch if not already loaded ──
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
      c.id === community.id ? { ...c, joined: !wasJoined, member_count: (c.member_count || 0) + (wasJoined ? -1 : 1) } : c
    ))
    try {
      if (wasJoined) { await leaveCommunity(community.id); showToast('Left community') }
      else           { await joinCommunity(community.id);  showToast(`Joined ${community.name} 🙌`); loadMine(true); loadFeed(true) }
    } catch {
      // Rollback optimistic update
      setAllCommunities(prev => prev.map(c =>
        c.id === community.id ? { ...c, joined: wasJoined, member_count: (c.member_count || 0) + (wasJoined ? 1 : -1) } : c
      ))
      showToast('Something went wrong — please try again')
    } finally {
      setJoiningId(null)
    }
  }

  // ── Filtered explore list ──
  const filtered = query.trim()
    ? allCommunities.filter(c =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allCommunities

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-[22px] text-text-primary">Communities</h1>

          {/* Desktop: show both buttons in header. Mobile: only show "Community" here; Post moves to FAB. */}
          <div className="flex items-center gap-2">
            {/* Create Community button — visible on all sizes */}
            <button
              onClick={() => authUser ? router.push('/communities/create') : requireAuth('community')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-pill text-[12px] font-bold border-2 border-purple text-purple min-h-[36px] hover:opacity-80 transition-opacity">
              <Plus size={12} /> Community
            </button>

            {/* Post button — DESKTOP ONLY (hidden on mobile; FAB handles mobile) */}
            <button
              onClick={() => authUser ? setCompose(true) : requireAuth('post')}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-pill bg-purple text-white text-[12px] font-bold min-h-[36px] active:scale-95 transition-all shadow-purple">
              <PenLine size={12} /> Post
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative" style={{ minHeight: 44 }}>
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <AnimatePresence mode="wait">

          {/* FOR YOU */}
          {tab === 'foryou' && (
            <motion.div key="fy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-4 pt-2">
              {feedLoading
                ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                : feedPosts.length === 0
                  ? (
                    <div className="text-center py-16 flex flex-col items-center gap-3">
                      <span className="text-[40px]">🙏</span>
                      <p className="font-bold text-[16px] text-text-primary">Your feed is quiet</p>
                      <p className="text-[13px] text-text-muted max-w-[260px]">
                        Join some communities and their posts will appear here.
                      </p>
                      <button onClick={() => setTab('explore')}
                        className="mt-2 px-5 py-2.5 rounded-full bg-purple text-white text-[13px] font-bold">
                        Explore communities
                      </button>
                    </div>
                  )
                  : feedPosts.map(post => (
                    <PostCard key={post.id} post={post} authUser={authUser}
                      onRequireAuth={requireAuth}
                      onUpdate={updated => setFeedPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                      onDelete={id => setFeedPosts(prev => prev.filter(p => p.id !== id))}
                    />
                  ))
              }
            </motion.div>
          )}

          {/* MY FEED */}
          {tab === 'mine' && (
            <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-4 pt-2">
              {mineLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-[18px] animate-pulse bg-purple-light" />
                  ))
                : myCommunities.length === 0
                  ? (
                    <div className="text-center py-16 flex flex-col items-center gap-3">
                      <span className="text-[40px]">👥</span>
                      <p className="font-bold text-[16px] text-text-primary">No communities yet</p>
                      <p className="text-[13px] text-text-muted">Join communities to see them here.</p>
                      <button onClick={() => setTab('explore')}
                        className="mt-2 px-5 py-2.5 rounded-full bg-purple text-white text-[13px] font-bold">
                        Explore
                      </button>
                    </div>
                  )
                  : myCommunities.map(c => (
                    <button key={c.id}
                      onClick={() => router.push(`/community/${c.slug}`)}
                      className="flex items-center gap-3 bg-white rounded-[18px] p-4 shadow-card text-left active:scale-[0.98] transition-all">
                      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0 bg-purple">
                        {(c.name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] text-text-primary truncate">{c.name}</p>
                        <p className="text-[12px] text-text-muted mt-0.5 truncate">{c.description}</p>
                      </div>
                    </button>
                  ))
              }
            </motion.div>
          )}

          {/* EXPLORE */}
          {tab === 'explore' && (
            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-4 pt-2">
              {exploreLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-[18px] animate-pulse bg-purple-light" />
                  ))
                : filtered.length === 0
                  ? (
                    <div className="text-center py-16">
                      <p className="font-bold text-[16px] text-text-primary">No communities found</p>
                      <p className="text-[13px] text-text-muted mt-1">Try a different search term.</p>
                    </div>
                  )
                  : filtered.map(c => (
                    <div key={c.id} onClick={() => router.push(`/community/${c.slug}`)}
                      className="cursor-pointer active:scale-[0.98] transition-all">
                      <CommunityCard community={c} onJoin={handleJoin} joiningId={joiningId} />
                    </div>
                  ))
              }
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── MOBILE FAB — Post button ── */}
      {/* Fixed bottom-right, above the bottom nav (bottom: 80px to clear nav + safe area) */}
      <motion.button
        className="md:hidden fixed right-5 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-purple text-white font-bold text-[14px] shadow-purple"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => authUser ? setCompose(true) : requireAuth('post')}
      >
        <PenLine size={16} />
        Post
      </motion.button>

      {/* ── Post composer ── */}
      <AnimatePresence>
        {compose && (
          <PostComposer
            onClose={() => setCompose(false)}
            onPost={post => {
              setFeedPosts(prev => [post, ...prev])
              loadedRef.current.foryou = false // mark feed as stale so next tab visit refreshes
            }}
          />
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}