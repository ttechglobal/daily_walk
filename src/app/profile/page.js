'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Info, Shield, LogOut, ChevronRight,
  Lightbulb, Trash2, PenLine, Heart, MessageCircle,
  Sun, Moon, Bookmark, Loader2,
} from 'lucide-react'
import { useLocalStorage }             from '../../hooks/useLocalStorage'
import { ToastContainer, showToast }   from '../../components/Toast'
import NotificationSettings            from '../../components/NotificationSettings'
import CharacterPicker                 from '../../components/CharacterPicker'
import Onboarding                      from '../../components/Onboarding'
import EditUsername                    from '../../components/EditUsername'
import { useDarkMode }                 from '../../contexts/DarkModeContext'
import { getCharacterById }            from '../../lib/characters'
import { getSavedPosts, getUserPosts } from '../../lib/supabase/communities'
import { createClient }                from '../../lib/supabase/client'
import {
  initials, avatarColor, formatTimestamp,
  lastSevenDays, todayStr,
} from '../../lib/constants'

const DAY_LABELS = ['M','T','W','T','F','S','S']

// ─────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <div className="px-5 pt-12 pb-6 flex flex-col items-center gap-4 streak-gradient">
        <div className="w-20 h-20 rounded-full bg-white/30 animate-pulse" />
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="h-6 w-36 rounded-full bg-white/30 animate-pulse" />
          <div className="h-4 w-28 rounded-full bg-white/20 animate-pulse" />
        </div>
        <div className="flex items-center w-full rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          {[0,1,2].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center py-3 gap-1.5"
              style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
              <div className="h-6 w-8 rounded-full bg-white/30 animate-pulse" />
              <div className="h-3 w-12 rounded-full bg-white/20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-3"><div className="h-9 rounded-full bg-purple-light animate-pulse" /></div>
      <div className="px-4 mt-4 flex flex-col gap-3">
        {[80,68,56,56,56].map((h,i) => (
          <div key={i} className="rounded-[18px] bg-white shadow-card animate-pulse" style={{ height: h }} />
        ))}
      </div>
    </div>
  )
}

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
function JourneyTab({ checkins, streak, joinedAt }) {
  const [subTab,  setSubTab]  = useState('logs')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])
  const today      = todayStr()
  const weekDays   = lastSevenDays()
  const checkedSet = new Set((checkins || []).map(c => c.date))

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] p-5 text-white streak-gradient">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={22} className="text-amber flame-flicker" />
              <span className="font-extrabold text-[28px] text-amber">{streak?.current || 0}</span>
              <span className="font-semibold text-white/80 text-[16px]">-day streak</span>
            </div>
            <p className="text-white/70 text-[13px]">{checkins?.length || 0} total · Since {joinedAt || 'today'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">Longest</span>
            <span className="font-bold text-[22px] text-white">{streak?.longest || 0}</span>
          </div>
        </div>
      </div>

      <WeekStrip checkedSet={checkedSet} today={today} weekDays={weekDays} />

      <div className="flex gap-1 p-1 rounded-full bg-purple-light mt-2">
        {[{k:'logs',l:'Logs'},{k:'nuggets',l:'Nuggets'}].map(t => (
          <button key={t.k} onClick={() => setSubTab(t.k)}
            className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all min-h-[36px]"
            style={subTab === t.k ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
            {subTab === t.k && (
              <motion.div layoutId="journey-subtab" className="absolute inset-0 bg-white rounded-full shadow-card"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
            )}
            <span className="relative z-10">{t.l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="flex flex-col gap-3">
            {!checkins?.length
              ? <div className="text-center py-10"><p className="font-semibold text-[15px] text-text-primary">No check-ins yet</p><p className="text-[13px] text-text-muted mt-1">Start your streak by checking in on the home screen</p></div>
              : [...(checkins||[])].reverse().map(c => (
                  <div key={c.date||c.id} className="bg-white rounded-[16px] p-4 shadow-card flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-purple">{c.date}</span>
                      {c.passage && <span className="text-[12px] font-semibold text-text-muted">{c.passage}</span>}
                    </div>
                    {c.reflection && <p className="text-[13px] text-text-primary leading-relaxed italic">"{c.reflection}"</p>}
                  </div>
                ))
            }
          </motion.div>
        )}
        {subTab === 'nuggets' && (
          <motion.div key="nuggets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="flex flex-col gap-3">
            {!(nuggets||[]).length
              ? <div className="text-center py-10"><p className="font-semibold text-[15px] text-text-primary">No nuggets yet</p><p className="text-[13px] text-text-muted mt-1">Tap + on the home screen to save insights</p></div>
              : (nuggets||[]).map(n => (
                  <div key={n.id} className="bg-white rounded-[16px] p-4 shadow-card flex gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-light">
                      <Lightbulb size={13} className="text-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-relaxed text-text-primary">{n.text}</p>
                      {n.source && <p className="text-[12px] mt-1 font-semibold text-purple">{n.source}</p>}
                      <p className="text-[11px] mt-1 text-text-muted">{formatTimestamp(n.createdAt)}</p>
                    </div>
                    <button onClick={() => setNuggets(prev => (prev||[]).filter(x => x.id !== n.id))}
                      className="w-7 h-7 rounded-full bg-warm-outer flex items-center justify-center flex-shrink-0">
                      <Trash2 size={12} className="text-red-500" />
                    </button>
                  </div>
                ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Posts / Saved tabs
// ─────────────────────────────────────────────
function PostsTab({ fetcher, emptyIcon: Icon, emptyTitle, emptySub }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetcher()
      .then(d => { setItems(d || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, []) // eslint-disable-line

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={22} className="text-purple animate-spin" /></div>
  if (error)   return <p className="text-center text-[13px] text-text-muted py-10">Couldn't load — try refreshing.</p>
  if (!items.length) return (
    <div className="text-center py-14 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-warm-outer">
        <Icon size={22} className="text-text-muted" />
      </div>
      <p className="font-semibold text-[15px] text-text-primary">{emptyTitle}</p>
      <p className="text-[13px] text-text-muted">{emptySub}</p>
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      {items.map(post => (
        <div key={post.id || post.savedAt} className="bg-white rounded-[16px] p-4 shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {post.communityName && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-light text-purple">
                {post.communityName}
              </span>
            )}
            <p className="text-[11px] text-text-muted ml-auto">{formatTimestamp(post.createdAt)}</p>
          </div>
          {post.passage && <p className="font-bold text-[13px] text-purple">{post.passage}</p>}
          <p className="text-[14px] leading-relaxed text-text-primary">{post.content}</p>
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-text-muted"><Heart size={13}/><span className="text-[12px]">{post.like_count||0}</span></div>
            <div className="flex items-center gap-1 text-text-muted"><MessageCircle size={13}/><span className="text-[12px]">{post.comment_count||0}</span></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Settings rows
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
      <button onClick={onToggle} className="relative flex-shrink-0" style={{ width: 44, height: 26 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: dark ? '#5B4FCF' : '#D1D5DB' }} />
        <div className="absolute top-0.5 rounded-full bg-white shadow-sm"
          style={{ width: 22, height: 22, left: dark ? 20 : 2, transition: 'left 0.2s ease' }} />
      </button>
    </div>
  )
}

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
function ProfileView({ authUser, lsUser, streak, checkins, onSignOut }) {
  const { dark, toggle: toggleDark } = useDarkMode()
  const [mainTab,     setMainTab]     = useState('profile')
  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [profile,     setProfile]     = useState(null)
  const [companionId, setCompanionId] = useState(lsUser?.companionId || 'david')

  useEffect(() => {
    if (!authUser?.id) return
    const sb = createClient()
    if (!sb) return

    // Use ONLY columns that exist in the actual profiles table:
    // joined_at (not created_at), display_name exists alongside full_name
    sb.from('profiles')
      .select('username, full_name, display_name, avatar_url, companion_id, spiritual_goal, joined_at')
      .eq('id', authUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[ProfileView] profile fetch error:', error.message, error.code)
          return
        }
        if (data) {
          setProfile(data)
          setCompanionId(data.companion_id || lsUser?.companionId || 'david')
          try {
            const stored = JSON.parse(localStorage.getItem('dw_user') || '{}')
            localStorage.setItem('dw_user', JSON.stringify({
              ...stored,
              id:       authUser.id,
              username: data.username    || stored.username || '',
              name:     data.full_name   || data.display_name || data.username || stored.name || '',
              email:    authUser.email   || stored.email    || '',
            }))
          } catch {}
        }
      })
      .catch(e => console.error('[ProfileView] profile fetch exception:', e.message))
  }, [authUser?.id]) // eslint-disable-line

  const companion   = getCharacterById(companionId)

  // Display name: full_name → display_name → username → email prefix
  const displayName = (
    profile?.full_name    ||
    profile?.display_name ||
    profile?.username     ||
    lsUser?.username      ||
    lsUser?.name          ||
    authUser?.email?.split('@')[0] ||
    ''
  )

  // joined_at is the correct column name (not created_at)
  const joinedAt = lsUser?.joinedAt || (
    profile?.joined_at
      ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'today'
  )

  const ini = initials(displayName || 'U')
  const bg  = avatarColor(displayName || 'User')

  function handleCompanionConfirm(id) {
    setCompanionId(id); setPickerOpen(false)
    showToast(`${getCharacterById(id).name} is your companion now 🙌`)
    const sb = createClient()
    if (sb && authUser?.id) {
      sb.from('profiles').update({ companion_id: id }).eq('id', authUser.id).catch(() => null)
    }
    try {
      const s = JSON.parse(localStorage.getItem('dw_user') || '{}')
      localStorage.setItem('dw_user', JSON.stringify({ ...s, companionId: id }))
    } catch {}
  }

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
          <h1 className="font-display text-[22px] font-bold text-white">{displayName || '…'}</h1>
          <div className="mt-1"><EditUsername /></div>
          <p className="text-white/60 text-[13px] mt-1">Member since {joinedAt}</p>
        </div>
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

      {/* Tab bar */}
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

      {/* Content */}
      <div className="flex-1 pb-24">
        <AnimatePresence mode="wait">

          {mainTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4 flex flex-col gap-4">

              {(profile?.spiritual_goal || lsUser?.goal) && (
                <div className="bg-white rounded-[16px] p-4 shadow-card">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1">Spiritual Goal</p>
                  <p className="font-display text-[14px] leading-relaxed italic text-text-primary">
                    "{profile?.spiritual_goal || lsUser?.goal}"
                  </p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Bible Companion</p>
                <CompanionRow companion={companion} onTap={() => setPickerOpen(true)} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Notifications</p>
                <NotificationSettings />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">Appearance</p>
                <DarkModeRow dark={dark} onToggle={toggleDark} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 px-1">More</p>
                <div className="flex flex-col gap-2">
                  <SettingsRow icon={Shield} iconBg="bg-sage-light" iconClass="text-sage"
                    label="Privacy" sub="Who can see your posts" onClick={() => showToast('Coming soon')} />
                  <SettingsRow icon={Info} iconBg="bg-purple-light" iconClass="text-purple"
                    label="About Daily Walk" onClick={() => showToast('v1.0.0 — Built with ♥')} />
                  <SettingsRow icon={LogOut} iconBg="bg-red-100" iconClass="text-red-500"
                    label="Sign out" danger onClick={onSignOut} />
                </div>
              </div>
            </motion.div>
          )}

          {mainTab === 'journey' && (
            <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <JourneyTab checkins={checkins} streak={streak} joinedAt={joinedAt} />
            </motion.div>
          )}

          {mainTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <PostsTab fetcher={getUserPosts} emptyIcon={PenLine}
                emptyTitle="No posts yet" emptySub="Your posts across all communities will appear here" />
            </motion.div>
          )}

          {mainTab === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="px-4 mt-4">
              <PostsTab fetcher={getSavedPosts} emptyIcon={Bookmark}
                emptyTitle="No saved posts yet" emptySub="Tap the bookmark icon on any post to save it here" />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <CharacterPicker currentId={companionId}
            onConfirm={handleCompanionConfirm} onClose={() => setPickerOpen(false)} />
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main export
//  mounted pattern eliminates hydration mismatch
//  authUser check bypasses the onboarding localStorage gate
// ─────────────────────────────────────────────
export default function ProfileScreen() {
  const [mounted,     setMounted]     = useState(false)
  const [authUser,    setAuthUser]    = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [onboarded, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [lsUser,    setLsUser]    = useLocalStorage('dw_user',                null)
  const [streak]                  = useLocalStorage('dw_streak',               null)
  const [checkins]                = useLocalStorage('dw_checkins',             [])

  useEffect(() => {
    setMounted(true)
    const sb = createClient()
    if (!sb) { setAuthChecked(true); return }
    sb.auth.getUser()
      .then(({ data: { user } }) => { setAuthUser(user || null); setAuthChecked(true) })
      .catch(() => { setAuthUser(null); setAuthChecked(true) })
  }, [])

  async function handleSignOut() {
    if (!confirm('Sign out?')) return
    const sb = createClient()
    await sb?.auth.signOut()
    try {
      ['dw_user','dw_onboarding_complete','dw_streak','dw_checkins','dw_plans','dw_nuggets']
        .forEach(k => localStorage.removeItem(k))
    } catch {}
    window.location.href = '/'
  }

  // Server + first client paint: null (prevents hydration mismatch)
  if (!mounted) return null

  // Auth resolving: show skeleton
  if (!authChecked) return <ProfileSkeleton />

  // Authenticated: always show profile
  if (authUser) {
    return <ProfileView authUser={authUser} lsUser={lsUser} streak={streak}
      checkins={checkins} onSignOut={handleSignOut} />
  }

  // Guest
  if (!onboarded) return <Onboarding onComplete={d => { setLsUser(d); setOnboarded(true) }} />
  return <ProfileView authUser={null} lsUser={lsUser} streak={streak}
    checkins={checkins} onSignOut={() => { window.location.href = '/' }} />
}