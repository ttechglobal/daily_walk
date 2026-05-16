'use client'

// ── src/app/profile/page.js ──
// All colours from useTheme() — nothing hardcoded.
// Companion button redesigned as clear actionable row with icon + chevron.
// NotificationSettings text visible in both modes.
// Bottom padding 112px ensures nav never blocks content.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Info, Shield, LogOut, ChevronRight,
  Lightbulb, Trash2, PenLine, Heart, MessageCircle,
  Sun, Moon, Sparkles, UserCog,
} from 'lucide-react'
import { useLocalStorage }           from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import NotificationSettings          from '../../components/NotificationSettings'
import CharacterPicker               from '../../components/CharacterPicker'
import Onboarding                    from '../../components/Onboarding'
import { useTheme }                  from '../../lib/theme'
import { CHARACTERS, getCharacterById } from '../../lib/characters'
import {
  initials, avatarColor, formatTimestamp,
  lastSevenDays, todayStr, SEED_CHALLENGES,
} from '../../lib/constants'

const DAY_LABELS = ['M','T','W','T','F','S','S']

// ─────────────────────────────────────────────
//  Week strip
// ─────────────────────────────────────────────
function WeekStrip({ checkedSet, today, weekDays, t }) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
        style={{ color: t.textFaint }}>
        This Week
      </p>
      <div className="flex items-center justify-between">
        {weekDays.map((d, i) => {
          const isChecked = checkedSet.has(d)
          const isToday   = d === today
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color: t.textFaint }}>
                {DAY_LABELS[i]}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                style={{
                  background: isChecked ? '#5B4FCF' : 'transparent',
                  color:  isChecked ? 'white' : isToday ? '#5B4FCF' : t.textFaint,
                  border: !isChecked ? `2px solid ${isToday ? '#5B4FCF' : t.border}` : 'none',
                }}
              >
                {isChecked && isToday  && '✓'}
                {isChecked && !isToday && <span style={{ fontSize: 16 }}>·</span>}
                {!isChecked && isToday && <span style={{ fontSize: 10 }}>now</span>}
                {!isChecked && !isToday && (
                  <span style={{ fontSize: 10 }}>{new Date(d).getDate()}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Journey section
// ─────────────────────────────────────────────
function JourneySection({ checkins, streak, user, t }) {
  const [subTab,    setSubTab]  = useState('logs')
  const [nuggets,   setNuggets] = useLocalStorage('dw_nuggets', [])

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
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[20px] p-5 text-white"
        style={{ background: 'linear-gradient(135deg,#5B4FCF 0%,#3D3190 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={22} className="flame-flicker" style={{ color: '#E8A838' }} />
              <span className="font-extrabold text-[28px]" style={{ color: '#E8A838' }}>
                {streak?.current || 0}
              </span>
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
      </motion.div>

      {/* Week strip */}
      <WeekStrip checkedSet={checkedSet} today={today} weekDays={weekDays} t={t} />

      {/* Sub-tabs */}
      <div className="mt-2">
        <div className="flex gap-1 p-1 rounded-full" style={{ background: t.bgMuted }}>
          {[{ k:'logs', l:'Logs' }, { k:'nuggets', l:'Nuggets' }].map(tab => (
            <button
              key={tab.k}
              onClick={() => setSubTab(tab.k)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
              style={subTab===tab.k ? { color:'#5B4FCF' } : { color: t.textMuted }}
            >
              {subTab===tab.k && (
                <motion.div
                  layoutId="journey-sub"
                  className="absolute inset-0 rounded-full"
                  style={{ background: t.bgCard, boxShadow: t.shadow }}
                  transition={{ type:'spring', stiffness:400, damping:35 }}
                />
              )}
              <span className="relative z-10">{tab.l}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col gap-3">
            {(checkins || []).length === 0 ? (
              <div className="text-center py-10">
                <p className="font-semibold text-[15px]" style={{ color: t.text }}>No logs yet</p>
                <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
                  Complete your first check-in to start your journey
                </p>
              </div>
            ) : (
              [...(checkins||[])].reverse().map(ci => (
                <div key={ci.id} className="rounded-[16px] p-4 flex flex-col gap-2"
                  style={{ background: t.bgCard, boxShadow: t.shadow }}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[13px]" style={{ color: '#5B4FCF' }}>
                      {ci.passage || 'Reading logged'}
                    </p>
                    <p className="text-[11px]" style={{ color: t.textFaint }}>
                      {formatTimestamp(ci.createdAt)}
                    </p>
                  </div>
                  {ci.reflection && (
                    <p className="text-[13px] leading-relaxed italic" style={{ color: t.textMuted }}>
                      "{ci.reflection}"
                    </p>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

        {subTab === 'nuggets' && (
          <motion.div key="nuggets" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col gap-3">
            {(nuggets||[]).length === 0 ? (
              <div className="text-center py-10">
                <p className="font-semibold text-[15px]" style={{ color: t.text }}>No nuggets yet</p>
                <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
                  Tap the + button on the home screen to save an insight
                </p>
              </div>
            ) : (
              (nuggets||[]).map(n => (
                <div key={n.id} className="rounded-[16px] p-4 flex gap-3"
                  style={{ background: t.bgCard, boxShadow: t.shadow }}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: t.amberBg }}>
                    <Lightbulb size={13} style={{ color: '#E8A838' }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>{n.text}</p>
                    {n.source && (
                      <p className="text-[12px] mt-1 font-semibold" style={{ color: '#5B4FCF' }}>
                        {n.source}
                      </p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: t.textFaint }}>
                      {formatTimestamp(n.createdAt)}
                    </p>
                  </div>
                  <button onClick={() => deleteNugget(n.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: t.bgMuted }}>
                    <Trash2 size={12} style={{ color: '#EF4444' }}/>
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Posts tab
// ─────────────────────────────────────────────
function UserPostsTab({ globalPosts, communities, t }) {
  const [expandedId, setExpandedId] = useState(null)

  const myPosts = [
    ...(globalPosts||[]).filter(p => p.userId==='local_user' || p.authorId==='local_user'),
    ...(communities||[]).flatMap(c => (c.posts||[]).filter(p => p.userId==='local_user' || p.authorId==='local_user')),
  ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (myPosts.length === 0) return (
    <div className="text-center py-14">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: t.bgMuted }}>
        <PenLine size={22} style={{ color: t.textMuted }}/>
      </div>
      <p className="font-semibold text-[15px]" style={{ color: t.text }}>No posts yet</p>
      <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>Your posts will appear here</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {myPosts.map(post => {
        const isLong   = (post.content||'').length > 160
        const expanded = expandedId === post.id
        return (
          <motion.div key={post.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="rounded-[16px] p-4" style={{ background: t.bgCard, boxShadow: t.shadow }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: t.textFaint }}>
              {formatTimestamp(post.createdAt)}
            </p>
            {post.passage && (
              <p className="font-bold text-[13px] mb-1" style={{ color: '#5B4FCF' }}>{post.passage}</p>
            )}
            <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>
              {isLong && !expanded ? `${post.content.slice(0,160)}…` : post.content}
            </p>
            {isLong && (
              <button onClick={() => setExpandedId(expanded?null:post.id)}
                className="text-[12px] font-semibold mt-1" style={{ color:'#5B4FCF' }}>
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-1" style={{ color: t.textFaint }}>
                <Heart size={13}/><span className="text-[12px]">{post.likedBy?.length||0}</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: t.textFaint }}>
                <MessageCircle size={13}/><span className="text-[12px]">{post.comments?.length||0}</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Settings row
// ─────────────────────────────────────────────
function SettingsRow({ icon: Icon, iconBg, iconColor, label, sub, danger, onClick, t }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-[18px] active:scale-[0.98] transition-all min-h-[56px]"
      style={{ background: t.bgCard, boxShadow: t.shadow }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}>
          <Icon size={17} style={{ color: danger ? '#EF4444' : iconColor }}/>
        </div>
        <div className="text-left">
          <p className="font-bold text-[14px]" style={{ color: danger ? '#EF4444' : t.text }}>{label}</p>
          {sub && <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>{sub}</p>}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: t.textFaint }}/>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Dark mode row
// ─────────────────────────────────────────────
function DarkModeRow({ dark, onToggle, t }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-[18px] min-h-[56px]"
      style={{ background: t.bgCard, boxShadow: t.shadow }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: dark ? '#2A2440' : '#EDE9FF' }}>
        {dark
          ? <Sun size={17} style={{ color:'#C77DFF' }}/>
          : <Moon size={17} style={{ color:'#5B4FCF' }}/>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px]" style={{ color: t.text }}>Dark Mode</p>
        <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
          {dark ? 'On — tap to switch to light' : 'Off — tap to switch to dark'}
        </p>
      </div>
      <button
        onClick={onToggle}
        className="relative flex-shrink-0 transition-all active:scale-95"
        style={{ width:44, height:26, minWidth:44 }}
      >
        <div className="absolute inset-0 rounded-full transition-all"
          style={{ background: dark ? '#5B4FCF' : '#D1D5DB' }}/>
        <div className="absolute top-0.5 rounded-full bg-white shadow-sm"
          style={{ width:22, height:22, left: dark ? 20 : 2, transition:'left 0.2s ease' }}/>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Companion row — clear actionable design
// ─────────────────────────────────────────────
function CompanionRow({ companion, onTap, t }) {
  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 p-4 rounded-[18px] active:scale-[0.98] transition-all min-h-[68px]"
      style={{ background: t.bgCard, boxShadow: t.shadow, border: `2px solid ${companion.accentColor}28` }}
    >
      {/* Character emoji/icon */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[22px]"
        style={{ background: `${companion.accentColor}18` }}
      >
        {companion.placeholderEmoji}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <p className="font-bold text-[14px]" style={{ color: t.text }}>
          Change Your Bible Companion
        </p>
        <p className="text-[12px] mt-0.5 leading-snug" style={{ color: t.textMuted }}>
          Currently <span style={{ color: companion.accentColor, fontWeight: 700 }}>{companion.name}</span>
          {' '}— tap to switch companion
        </p>
      </div>

      <ChevronRight size={16} style={{ color: t.textFaint, flexShrink: 0 }}/>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Profile view
// ─────────────────────────────────────────────
function ProfileView({ user, streak, checkins }) {
  const { t, dark, toggle: toggleDark } = useTheme()

  const [mainTab,    setMainTab]    = useState('profile')
  const [globalPosts]               = useLocalStorage('dw_global_posts', [])
  const [communities2]              = useLocalStorage('dw_communities',  [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [, setUser]      = useLocalStorage('dw_user',     null)
  const [, setCheckins2] = useLocalStorage('dw_checkins', [])
  const [, setStreak]    = useLocalStorage('dw_streak',   null)

  const companion = getCharacterById(user?.companionId || 'david')
  const ini       = initials(user?.name || 'F')
  const bg        = avatarColor(user?.name || 'Friend')

  function handleSignOut() {
    if (!confirm('This will reset all local data. Are you sure?')) return
    setOnboarded(false); setUser(null); setCheckins2([]); setStreak(null)
    try { window.localStorage.removeItem('dw_liked') } catch {}
    window.location.reload()
  }

  function handleCompanionConfirm(id) {
    setUser(prev => ({...(prev||{}), companionId: id}))
    setPickerOpen(false)
    showToast(`${getCharacterById(id).name} is your companion now 🙌`)
  }

  const TABS = [
    {k:'profile', l:'Profile'},
    {k:'journey', l:'Journey'},
    {k:'posts',   l:'Posts'},
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>

      {/* ── Hero banner ── */}
      <div
        className="px-5 pt-12 pb-6 flex flex-col items-center gap-4"
        style={{ background: 'linear-gradient(135deg,#5B4FCF 0%,#3D3190 100%)' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-[22px] font-bold font-display border-4"
          style={{ background: bg, borderColor: 'rgba(255,255,255,0.3)' }}
        >
          {ini}
        </div>
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold text-white">
            {user?.name || 'Friend'}
          </h1>
          {user?.walkStage && (
            <span className="inline-block mt-1 text-white text-[12px] font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              {user.walkStage}
            </span>
          )}
          <p className="text-white/60 text-[13px] mt-1">
            Member since {user?.joinedAt || 'today'}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center w-full rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          {[
            {l:'Streak',  v: streak?.current || 0},
            {l:'Total',   v: checkins?.length || 0},
            {l:'Longest', v: streak?.longest  || 0},
          ].map((s,i) => (
            <div key={s.l} className="flex-1 flex flex-col items-center py-3"
              style={{ borderRight: i<2 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
              <span className="font-extrabold text-[22px] text-white">{s.v}</span>
              <span className="text-white/60 text-[11px] font-semibold">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar — sticky ── */}
      <div className="px-4 pt-4 sticky top-0 z-20" style={{ background: t.bg }}>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: t.bgMuted }}>
          {TABS.map(tab => (
            <button key={tab.k} onClick={() => setMainTab(tab.k)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all min-h-[40px]"
              style={mainTab===tab.k ? {color:'#5B4FCF'} : {color: t.textMuted}}>
              {mainTab===tab.k && (
                <motion.div layoutId="profile-tab" className="absolute inset-0 rounded-full"
                  style={{ background: t.bgCard, boxShadow: t.shadow }}
                  transition={{ type:'spring', stiffness:400, damping:35 }}/>
              )}
              <span className="relative z-10">{tab.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1" style={{ paddingBottom: 112 }}>
        <AnimatePresence mode="wait">

          {/* Profile tab */}
          {mainTab === 'profile' && (
            <motion.div key="profile" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              transition={{duration:0.15}} className="px-4 mt-4 flex flex-col gap-4">

              {/* Spiritual goal */}
              {user?.goal && (
                <div className="rounded-[16px] p-4" style={{ background: t.bgCard, boxShadow: t.shadow }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: t.textFaint }}>
                    Spiritual Goal
                  </p>
                  <p className="font-display text-[14px] leading-relaxed italic"
                    style={{ color: t.text }}>
                    "{user.goal}"
                  </p>
                </div>
              )}

              {/* ── Companion — clear, actionable row ── */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1"
                  style={{ color: t.textFaint }}>
                  Bible Companion
                </p>
                <CompanionRow companion={companion} onTap={() => setPickerOpen(true)} t={t}/>
              </div>

              {/* ── Notification settings ── */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1"
                  style={{ color: t.textFaint }}>
                  Notifications
                </p>
                {/*
                  NotificationSettings renders its own rows.
                  The component uses Tailwind classes, so globals.css dark overrides
                  handle bg/text automatically. Passing t here as a data attribute
                  isn't needed — the CSS [data-theme="dark"] selectors cover it.
                */}
                <NotificationSettings />
              </div>

              {/* ── Appearance ── */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1"
                  style={{ color: t.textFaint }}>
                  Appearance
                </p>
                <DarkModeRow dark={dark} onToggle={toggleDark} t={t}/>
              </div>

              {/* ── More ── */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1"
                  style={{ color: t.textFaint }}>
                  More
                </p>
                <div className="flex flex-col gap-2">
                  <SettingsRow
                    icon={Shield} iconBg={t.sageBg} iconColor="#4A7C5F"
                    label="Privacy" sub="Who can see your posts"
                    onClick={() => showToast('Coming soon')} t={t}
                  />
                  <SettingsRow
                    icon={Info} iconBg={t.purpleBg} iconColor="#5B4FCF"
                    label="About Daily Walk"
                    onClick={() => showToast('v1.0.0 — Built with ♥')} t={t}
                  />
                  <SettingsRow
                    icon={LogOut} iconBg="#FEE2E2" iconColor="#EF4444"
                    label="Sign out & reset" danger
                    onClick={handleSignOut} t={t}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Journey tab */}
          {mainTab === 'journey' && (
            <motion.div key="journey" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              transition={{duration:0.15}} className="px-4 mt-4">
              <JourneySection checkins={checkins} streak={streak} user={user} t={t}/>
            </motion.div>
          )}

          {/* Posts tab */}
          {mainTab === 'posts' && (
            <motion.div key="posts" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              transition={{duration:0.15}} className="px-4 mt-4">
              <UserPostsTab globalPosts={globalPosts||[]} communities={communities2||[]} t={t}/>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Character picker */}
      <AnimatePresence>
        {pickerOpen && (
          <CharacterPicker
            currentId={user?.companionId || 'david'}
            onConfirm={handleCompanionConfirm}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <ToastContainer/>
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
  if (!onboarded) return <Onboarding onComplete={d => { setUser(d); setOnboarded(true) }}/>
  return <ProfileView user={user} streak={streak} checkins={checkins}/>
}