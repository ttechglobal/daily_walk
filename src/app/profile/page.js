'use client'

// ── src/app/profile/page.js ──
// 4 tabs: Profile | Journey | My Posts | Saved
// My Posts: fetched from Supabase via getUserPosts()
// Saved Posts: fetched from Supabase via getSavedPosts()
// All colours use app Tailwind class system (bg-white, text-text-primary etc.)
//
// FIX: On mount, ProfileView fetches the real username from the profiles table
//      and patches both state and localStorage. Hero now shows username correctly
//      instead of falling back to 'Friend'.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Info, Shield, LogOut, ChevronRight,
  Lightbulb, Trash2, PenLine, Heart, MessageCircle,
  Sun, Moon, Sparkles, UserCog, Bookmark, Loader2,
} from 'lucide-react'
import { useLocalStorage }              from '../../hooks/useLocalStorage'
import { ToastContainer, showToast }    from '../../components/Toast'
import NotificationSettings             from '../../components/NotificationSettings'
import CharacterPicker                  from '../../components/CharacterPicker'
import Onboarding                       from '../../components/Onboarding'
import EditUsername                     from '../../components/EditUsername'
import { useDarkMode }                  from '../../contexts/DarkModeContext'
import { getCharacterById }             from '../../lib/characters'
import { getSavedPosts, getUserPosts }  from '../../lib/supabase/communities'
import { createClient }                 from '../../lib/supabase/client'
import {
  initials, avatarColor, formatTimestamp,
  lastSevenDays, todayStr,
} from '../../lib/constants'

const DAY_LABELS = ['M','T','W','T','F','S','S']

// ─────────────────────────────────────────────
//  Week strip
// ─────────────────────────────────────────────
function WeekStrip({ checkedSet, today, weekDays }) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-3">This Week</p>
      <div className="flex items-center justify-between">
        {weekDays.map((d, i) => {
          const isChecked = checkedSet.has(d)
          const isToday   = d === today
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold text-text-muted">{DAY_LABELS[i]}</span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                style={{
                  background: isChecked ? '#5B4FCF' : 'transparent',
                  color:  isChecked ? 'white' : isToday ? '#5B4FCF' : '#9CA3AF',
                  border: !isChecked ? `2px solid ${isToday ? '#5B4FCF' : '#F0EDE8'}` : 'none',
                }}>
                {isChecked && isToday  && '✓'}
                {isChecked && !isToday && <span style={{ fontSize: 16 }}>·</span>}
                {!isChecked && isToday && <span style={{ fontSize: 10 }}>now</span>}
                {!isChecked && !isToday && <span style={{ fontSize: 10 }}>{new Date(d).getDate()}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Journey tab
// ─────────────────────────────────────────────
function JourneyTab({ checkins, streak, user }) {
  const [subTab,  setSubTab]  = useState('logs')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])

  const today      = todayStr()
  const weekDays   = lastSevenDays()
  const checkedSet = new Set((checkins || []).map(c => c.date))

  function deleteNugget(id) {
    setNuggets(prev => (prev || []).filter(n => n.id !== id))
    showToast('Nugget removed')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Streak card */}
      <div className="rounded-[20px] p-5 text-white streak-gradient">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={22} className="text-amber flame-flicker" />
              <span className="font-extrabold text-[28px] text-amber">{streak?.current || 0}</span>
              <span className="font-semibold text-white/80 text-[16px]">-day streak</span>
            </div>
            <p className="text-white/70 text-[13px]">
              {checkins?.length || 0} total · Since {user?.joinedAt || 'today'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">Longest</span>
            <span className="font-bold text-[22px] text-white">{streak?.longest || 0}</span>
          </div>
        </div>
      </div>

      <WeekStrip checkedSet={checkedSet} today={today} weekDays={weekDays} />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-full bg-purple-light mt-2">
        {[{k:'logs',l:'Logs'},{k:'nuggets',l:'Nuggets'}].map(t => (
          <button key={t.k} onClick={() => setSubTab(t.k)}
            className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all min-h-[36px]"
            style={subTab === t.k ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
            {subTab === t.k && (
              <motion.div layoutId="journey-subtab"
                className="absolute inset-0 bg-white rounded-full shadow-card"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
            )}
            <span className="relative z-10">{t.l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'logs' && (
          <motion.div key="logs"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3">
            {!checkins?.length ? (
              <div className="text-center py-10">
                <p className="font-semibold text-[15px] text-text-primary">No check-ins yet</p>
                <p className="text-[13px] text-text-muted mt-1">Start your streak by checking in on the home screen</p>
              </div>
            ) : [...(checkins || [])].reverse().map(c => (
              <div key={c.date || c.id} className="bg-white rounded-[16px] p-4 shadow-card flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px] text-purple">{c.date}</span>
                  {c.passage && <span className="text-[12px] font-semibold text-text-muted">{c.passage}</span>}
                </div>
                {c.reflection && (
                  <p className="text-[13px] text-text-primary leading-relaxed italic">"{c.reflection}"</p>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {subTab === 'nuggets' && (
          <motion.div key="nuggets"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3">
            {!(nuggets||[]).length ? (
              <div className="text-center py-10">
                <p className="font-semibold text-[15px] text-text-primary">No nuggets yet</p>
                <p className="text-[13px] text-text-muted mt-1">Tap + on the home screen to save insights</p>
              </div>
            ) : (nuggets||[]).map(n => (
              <div key={n.id} className="bg-white rounded-[16px] p-4 shadow-card flex gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-light">
                  <Lightbulb size={13} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] leading-relaxed text-text-primary">{n.text}</p>
                  {n.source && <p className="text-[12px] mt-1 font-semibold text-purple">{n.source}</p>}
                  <p className="text-[11px] mt-1 text-text-muted">{formatTimestamp(n.createdAt)}</p>
                </div>
                <button onClick={() => deleteNugget(n.id)}
                  className="w-7 h-7 rounded-full bg-warm-outer flex items-center justify-center flex-shrink-0">
                  <Trash2 size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Post card (minimal, for profile lists)
// ─────────────────────────────────────────────
function MiniPostCard({ post }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = (post.content || '').length > 200
  return (
    <div className="bg-white rounded-[16px] p-4 shadow-card flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {post.communityName && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-light text-purple">
            {post.communityName}
          </span>
        )}
        <p className="text-[11px] text-text-muted ml-auto">{formatTimestamp(post.createdAt)}</p>
      </div>
      {post.passage && <p className="font-bold text-[13px] text-purple">{post.passage}</p>}
      <p className="text-[14px] leading-relaxed text-text-primary">
        {isLong && !expanded ? `${post.content.slice(0, 200)}…` : post.content}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(v => !v)} className="text-[12px] font-bold text-purple text-left">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-text-muted">
          <Heart size={13} /><span className="text-[12px]">{post.like_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <MessageCircle size={13} /><span className="text-[12px]">{post.comment_count || 0}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  My Posts tab — from Supabase
// ─────────────────────────────────────────────
function MyPostsTab() {
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserPosts().then(data => { setPosts(data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 size={22} className="text-purple animate-spin" />
    </div>
  )

  if (!posts.length) return (
    <div className="text-center py-14 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-warm-outer">
        <PenLine size={22} className="text-text-muted" />
      </div>
      <p className="font-semibold text-[15px] text-text-primary">No posts yet</p>
      <p className="text-[13px] text-text-muted">Your posts across all communities will appear here</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {posts.map(post => <MiniPostCard key={post.id} post={post} />)}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Saved Posts tab — from Supabase
// ─────────────────────────────────────────────
function SavedPostsTab() {
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSavedPosts().then(data => { setPosts(data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 size={22} className="text-purple animate-spin" />
    </div>
  )

  if (!posts.length) return (
    <div className="text-center py-14 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-warm-outer">
        <Bookmark size={22} className="text-text-muted" />
      </div>
      <p className="font-semibold text-[15px] text-text-primary">No saved posts yet</p>
      <p className="text-[13px] text-text-muted">Tap the bookmark icon on any post to save it here</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {posts.map(post => (
        <div key={post.id || post.savedAt}>
          <MiniPostCard post={post} />
          {post.savedAt && (
            <p className="text-[11px] text-text-muted px-1 mt-1">
              Saved {formatTimestamp(post.savedAt)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Settings row
// ─────────────────────────────────────────────
function SettingsRow({ icon: Icon, iconBg, iconClass, label, sub, danger, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-[18px] shadow-card active:scale-[0.98] transition-all min-h-[56px]">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={17} className={iconClass} />
        </div>
        <div className="text-left">
          <p className={`font-bold text-[14px] ${danger ? 'text-red-500' : 'text-text-primary'}`}>{label}</p>
          {sub && <p className="text-[12px] mt-0.5 text-text-muted">{sub}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Dark mode toggle row
// ─────────────────────────────────────────────
function DarkModeRow({ dark, onToggle }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-[18px] shadow-card min-h-[56px]">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-light">
        {dark ? <Sun size={17} className="text-purple" /> : <Moon size={17} className="text-purple" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] text-text-primary">Dark Mode</p>
        <p className="text-[12px] mt-0.5 text-text-muted">
          {dark ? 'On — tap to switch to light' : 'Off — tap to switch to dark'}
        </p>
      </div>
      <button onClick={onToggle}
        className="relative flex-shrink-0 transition-all active:scale-95"
        style={{ width: 44, height: 26, minWidth: 44 }}>
        <div className="absolute inset-0 rounded-full transition-all"
          style={{ background: dark ? '#5B4FCF' : '#D1D5DB' }} />
        <div className="absolute top-0.5 rounded-full bg-white shadow-sm"
          style={{ width: 22, height: 22, left: dark ? 20 : 2, transition: 'left 0.2s ease' }} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Companion row
// ─────────────────────────────────────────────
function CompanionRow({ companion, onTap }) {
  return (
    <button onClick={onTap}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-[18px] shadow-card active:scale-[0.98] transition-all min-h-[68px]"
      style={{ border: `2px solid ${companion.accentColor}28` }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[22px]"
        style={{ background: `${companion.accentColor}18` }}>
        {companion.placeholderEmoji}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-bold text-[14px] text-text-primary">Change Your Bible Companion</p>
        <p className="text-[12px] mt-0.5 leading-snug text-text-muted">
          Currently <span style={{ color: companion.accentColor, fontWeight: 700 }}>{companion.name}</span>
          {' '}— tap to switch
        </p>
      </div>
      <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
    </button>
  )
}

// ─────────────────────────────────────────────
//  Profile view
// ─────────────────────────────────────────────
function ProfileView({ user, streak, checkins }) {
  const { dark, toggle: toggleDark } = useDarkMode()
  const [mainTab,    setMainTab]    = useState('profile')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, setUser]      = useLocalStorage('dw_user',                null)
  const [, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [, setCheckins2] = useLocalStorage('dw_checkins',            [])
  const [, setStreak]    = useLocalStorage('dw_streak',              null)

  // ── FIX: Pull real username from Supabase on mount ──
  // localStorage dw_user.name can be stale or missing the username.
  // We fetch the profiles row and patch the displayed user object
  // AND keep localStorage up to date so other pages benefit immediately.
  const [liveUser, setLiveUser] = useState(user)

  useEffect(() => {
    const sb = createClient()
    if (!sb) return
    sb.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      const { data: profile } = await sb.from('profiles')
        .select('username, full_name, avatar_url, companion_id')
        .eq('id', data.user.id)
        .maybeSingle()
      if (!profile?.username) return
      // Merge fetched data into the local user object
      const patched = {
        ...(user || {}),
        id:          data.user.id,
        username:    profile.username,
        name:        profile.full_name || profile.username,
        companionId: profile.companion_id || user?.companionId || 'david',
      }
      setLiveUser(patched)
      try {
        const stored = JSON.parse(localStorage.getItem('dw_user') || '{}')
        localStorage.setItem('dw_user', JSON.stringify({ ...stored, ...patched }))
      } catch {}
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const companion = getCharacterById(liveUser?.companionId || 'david')
  // Use username first for initials/colour so the avatar matches the displayed name
  const displayName = liveUser?.username || liveUser?.name || 'Friend'
  const ini = initials(displayName)
  const bg  = avatarColor(displayName)

  async function handleSignOut() {
    if (!confirm('Sign out?')) return
    const sb = createClient()
    await sb?.auth.signOut()
    setOnboarded(false); setUser(null); setCheckins2([]); setStreak(null)
    try { window.localStorage.clear() } catch {}
    window.location.href = '/'
  }

  function handleCompanionConfirm(id) {
    setLiveUser(prev => ({ ...(prev || {}), companionId: id }))
    setUser(prev => ({ ...(prev || {}), companionId: id }))
    setPickerOpen(false)
    showToast(`${getCharacterById(id).name} is your companion now 🙌`)
  }

  // ── Compact 4-tab bar ──
  const TABS = [
    { k: 'profile', l: 'Profile' },
    { k: 'journey', l: 'Journey' },
    { k: 'posts',   l: 'Posts'   },
    { k: 'saved',   l: 'Saved'   },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* Hero */}
      <div className="px-5 pt-12 pb-6 flex flex-col items-center gap-4 streak-gradient">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-[22px] font-bold border-4"
          style={{ background: bg, borderColor: 'rgba(255,255,255,0.3)' }}>
          {ini}
        </div>
        <div className="text-center">
          {/* FIX: username → full_name → 'Friend'. Never 'Friend' when a username exists. */}
          <h1 className="font-display text-[22px] font-bold text-white">
            {liveUser?.username || liveUser?.name || 'Friend'}
          </h1>
          {/* Editable username */}
          <div className="mt-1">
            <EditUsername />
          </div>
          <p className="text-white/60 text-[13px] mt-1">
            Member since {liveUser?.joinedAt || 'today'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center w-full rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          {[
            { l: 'Streak',  v: streak?.current || 0 },
            { l: 'Total',   v: checkins?.length || 0 },
            { l: 'Longest', v: streak?.longest  || 0 },
          ].map((s, i) => (
            <div key={s.l} className="flex-1 flex flex-col items-center py-3"
              style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
              <span className="font-extrabold text-[22px] text-white">{s.v}</span>
              <span className="text-white/60 text-[11px] font-semibold">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compact tab bar — same pattern as Communities compact tabs */}
      <div className="px-4 pt-3 sticky top-0 z-20 bg-warm-bg">
        <div className="flex gap-0.5 p-1 rounded-full bg-purple-light">
          {TABS.map(tab => (
            <button key={tab.k} onClick={() => setMainTab(tab.k)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all min-h-[36px]"
              style={mainTab === tab.k ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
              {mainTab === tab.k && (
                <motion.div layoutId="profile-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
              )}
              <span className="relative z-10">{tab.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — pb-24 clears nav */}
      <div className="flex-1 pb-24">
        <AnimatePresence mode="wait">

          {/* Profile tab */}
          {mainTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4 flex flex-col gap-4">

              {liveUser?.goal && (
                <div className="bg-white rounded-[16px] p-4 shadow-card">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1">Spiritual Goal</p>
                  <p className="font-display text-[14px] leading-relaxed italic text-text-primary">"{liveUser.goal}"</p>
                </div>
              )}

              {/* Companion */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Bible Companion</p>
                <CompanionRow companion={companion} onTap={() => setPickerOpen(true)} />
              </div>

              {/* Notifications */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Notifications</p>
                <NotificationSettings />
              </div>

              {/* Appearance */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Appearance</p>
                <DarkModeRow dark={dark} onToggle={toggleDark} />
              </div>

              {/* More */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">More</p>
                <div className="flex flex-col gap-2">
                  <SettingsRow icon={Shield} iconBg="bg-sage-light" iconClass="text-sage"
                    label="Privacy" sub="Who can see your posts"
                    onClick={() => showToast('Coming soon')} />
                  <SettingsRow icon={Info} iconBg="bg-purple-light" iconClass="text-purple"
                    label="About Daily Walk"
                    onClick={() => showToast('v1.0.0 — Built with ♥')} />
                  <SettingsRow icon={LogOut} iconBg="bg-red-100" iconClass="text-red-500"
                    label="Sign out" danger onClick={handleSignOut} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Journey */}
          {mainTab === 'journey' && (
            <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <JourneyTab checkins={checkins} streak={streak} user={liveUser} />
            </motion.div>
          )}

          {/* My Posts — from Supabase */}
          {mainTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <MyPostsTab />
            </motion.div>
          )}

          {/* Saved — from Supabase */}
          {mainTab === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <SavedPostsTab />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <CharacterPicker currentId={liveUser?.companionId || 'david'}
            onConfirm={handleCompanionConfirm} onClose={() => setPickerOpen(false)} />
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────
export default function ProfileScreen() {
  const [onboarded, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [user,      setUser]      = useLocalStorage('dw_user',                null)
  const [streak]                  = useLocalStorage('dw_streak',               null)
  const [checkins]                = useLocalStorage('dw_checkins',             [])
  const [,,hydrated]              = useLocalStorage('dw_onboarding_complete',  false)

  if (!hydrated) return null
  if (!onboarded) return <Onboarding onComplete={d => { setUser(d); setOnboarded(true) }} />
  return <ProfileView user={user} streak={streak} checkins={checkins} />
}