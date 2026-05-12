'use client'

// ── /communities — Update 2: full implementation ──
// My Communities tab: coloured avatar, last activity, chevron
// Explore tab: filter pills, discover banner, avatar stack, join button
// All transitions via Framer Motion

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, ChevronRight, Sparkles } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { SEED_COMMUNITIES, COMMUNITY_CATEGORIES, initials } from '../../lib/constants'

// Category → colour map (Update 2 spec)
const CATEGORY_COLORS = {
  'Bible Study':   '#5B4FCF',
  'Prayer':        '#4A7C5F',
  'Mental Health': '#7CB9E8',
  'Youth':         '#E8A838',
  'Worship':       '#C77DFF',
  'General':       '#888780',
}

// Small pill badge for category
function CatBadge({ category }) {
  const color = CATEGORY_COLORS[category] || '#888780'
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {category}
    </span>
  )
}

// ── My Communities card ──
function MyCommunityCard({ community, idx }) {
  const router = useRouter()
  const color  = CATEGORY_COLORS[community.category] || '#888780'
  const letter = community.name[0].toUpperCase()

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={() => router.push(`/communities/${community.id}`)}
      className="w-full bg-white rounded-[16px] shadow-card p-4 flex items-center gap-3 text-left hover:shadow-card-hover transition-all active:scale-[0.98]"
    >
      {/* Coloured avatar circle */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-display font-bold text-[18px] flex-shrink-0"
        style={{ background: color }}
      >
        {letter}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-[15px] truncate" style={{ color: '#1A1A2E' }}>
            {community.name}
          </p>
          <CatBadge category={community.category} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" style={{ color: '#6B7280' }}>
            <Users size={11} />
            <span className="text-[12px]">{community.memberCount + 1}</span>
          </div>
          <span className="text-[11px]" style={{ color: '#6B7280' }}>·</span>
          <span className="text-[12px]" style={{ color: '#6B7280' }}>Active recently</span>
        </div>
      </div>

      <ChevronRight size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
    </motion.button>
  )
}

// ── Mini avatar stack for Explore cards ──
function AvatarStack({ count, name }) {
  const colors = ['#5B4FCF', '#4A7C5F', '#E8A838']
  const display = Math.min(3, count)
  return (
    <div className="flex items-center">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
          style={{ background: colors[i], marginLeft: i > 0 ? -8 : 0, zIndex: display - i }}
        >
          {name[0]}
        </div>
      ))}
      {count > 3 && (
        <span className="text-[11px] font-semibold ml-1.5" style={{ color: '#6B7280' }}>
          +{count - 3}
        </span>
      )}
    </div>
  )
}

// ── Explore card ──
function ExploreCard({ community, onToggleJoin, idx }) {
  const router = useRouter()
  const color  = CATEGORY_COLORS[community.category] || '#888780'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="bg-white rounded-[20px] shadow-card overflow-hidden"
    >
      {/* Subtle top accent */}
      <div className="h-1 w-full" style={{ background: color }} />

      <button
        className="w-full text-left px-4 pt-4 pb-2"
        onClick={() => router.push(`/communities/${community.id}`)}
      >
        <p className="font-display text-[17px] font-semibold leading-snug mb-1" style={{ color: '#1A1A2E' }}>
          {community.name}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <CatBadge category={community.category} />
          <div className="flex items-center gap-1" style={{ color: '#6B7280' }}>
            <Users size={11} />
            <span className="text-[12px]">{community.memberCount + (community.joined ? 1 : 0)}</span>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: '#6B7280' }}>
          {community.description}
        </p>
      </button>

      {/* Bottom row: avatar stack + join button */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <AvatarStack count={Math.min(community.memberCount, 8)} name={community.name} />
        <button
          onClick={() => onToggleJoin(community.id)}
          className="rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-95"
          style={
            community.joined
              ? { background: '#E8F4ED', color: '#4A7C5F' }
              : { background: '#5B4FCF', color: 'white' }
          }
        >
          {community.joined ? 'Joined ✓' : 'Join'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Discover banner ──
function DiscoverBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] p-5 flex items-center gap-4 mb-1"
      style={{ background: 'linear-gradient(135deg, #5B4FCF, #3D3190)' }}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Sparkles size={20} className="text-white" />
      </div>
      <div>
        <p className="font-bold text-white text-[15px] leading-snug">
          Find your people. Grow together.
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Join a community and never walk alone.
        </p>
      </div>
    </motion.div>
  )
}

export default function CommunitiesPage() {
  const [tab,         setTab]         = useState('mine')
  const [filter,      setFilter]      = useState('All')
  const [communities, setCommunities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [, , hydrated]                = useLocalStorage('dw_communities', SEED_COMMUNITIES)

  function toggleJoin(id) {
    const c = (communities || []).find(x => x.id === id)
    setCommunities(prev => (prev || []).map(x =>
      x.id !== id ? x : { ...x, joined: !x.joined, memberCount: x.memberCount + (x.joined ? -1 : 1) }
    ))
    showToast(c?.joined ? 'Left community' : 'Joined!')
  }

  if (!hydrated) return null

  const mine     = (communities || []).filter(c => c.joined)
  // Private communities never appear in Explore — only in My Communities
  const publicOnly = (communities || []).filter(c => c.visibility !== 'private' || c.joined)
  const filtered = filter === 'All'
    ? publicOnly
    : publicOnly.filter(c => c.category === filter)

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold" style={{ color: '#1A1A2E' }}>Communities</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>Grow together with other believers</p>
        </div>
        <Link
          href="/communities/create"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold border-2 transition-all hover:bg-purple-light"
          style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}
        >
          <Plus size={13} /> Create
        </Link>
      </div>

      {/* ── Tab switcher ── */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background: '#EDE9FF' }}>
          {[
            { key: 'mine',    label: 'My Communities' },
            { key: 'explore', label: 'Explore'        },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
              style={tab === t.key ? { color: '#5B4FCF' } : { color: '#6B7280' }}
            >
              {tab === t.key && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* MY COMMUNITIES */}
        {tab === 'mine' && (
          <motion.div
            key="mine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3 px-4 py-4 pb-10"
          >
            {mine.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-12"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: '#EDE9FF' }}
                >
                  <Users size={28} style={{ color: '#5B4FCF' }} />
                </div>
                <div>
                  <p className="font-display text-[17px] font-semibold" style={{ color: '#1A1A2E' }}>
                    You haven't joined any communities yet
                  </p>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: '#6B7280' }}>
                    Explore communities and find your people
                  </p>
                </div>
                <button
                  onClick={() => setTab('explore')}
                  className="text-white rounded-full px-6 py-3 text-[14px] font-bold hover:opacity-90 transition-all"
                  style={{ background: '#5B4FCF' }}
                >
                  Explore Communities
                </button>
              </motion.div>
            ) : (
              mine.map((c, i) => (
                <MyCommunityCard key={c.id} community={c} idx={i} />
              ))
            )}
          </motion.div>
        )}

        {/* EXPLORE */}
        {tab === 'explore' && (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Filter pills — horizontally scrollable */}
            <div className="flex gap-2 px-4 mt-3 overflow-x-auto scroll-hide pb-1">
              {COMMUNITY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                  style={
                    filter === cat
                      ? { background: '#5B4FCF', borderColor: '#5B4FCF', color: 'white' }
                      : { background: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 px-4 py-4 pb-10">
              {/* Discover banner */}
              <DiscoverBanner />

              {/* Community cards */}
              {filtered.map((c, i) => (
                <ExploreCard
                  key={c.id}
                  community={c}
                  onToggleJoin={toggleJoin}
                  idx={i}
                />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}