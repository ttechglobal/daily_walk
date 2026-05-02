'use client'

// ── Profile page — Journey moved here as a tab (Update 3) ──
// Tabs: Profile | Journey
// Journey tab contains: streak card, week strip, logs, nuggets (from old journey page).

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Info, Shield, LogOut, ChevronRight, BookOpen, Lightbulb, Trash2, Share2, Lock } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import NotificationSettings from '../../components/NotificationSettings'
import { initials, avatarColor, formatDateLabel, formatTimestamp, lastSevenDays, todayStr, SEED_CHALLENGES } from '../../lib/constants'

const WALK_STAGES = ['Just starting', 'Growing', 'Recommitting', 'Consistent']
const DAY_LABELS  = ['M','T','W','T','F','S','S']

// ──────────────────────────────────────────────
//  Onboarding
// ──────────────────────────────────────────────
function ProgressDots({ step, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{ width: i+1===step ? 24 : 8, background: i+1===step ? '#5B4FCF' : '#EDE9FF' }}
          className="h-2 rounded-full" />
      ))}
    </div>
  )
}

function PillOption({ label, selected, onSelect }) {
  return (
    <button onClick={onSelect}
      className={`px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all ${
        selected ? 'text-white border-purple' : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'
      }`}
      style={selected ? { background: '#5B4FCF', borderColor: '#5B4FCF' } : {}}>
      {label}
    </button>
  )
}

function Onboarding({ onComplete }) {
  const [step,  setStep]  = useState(1)
  const [name,  setName]  = useState('')
  const [stage, setStage] = useState('')
  const [goal,  setGoal]  = useState('')

  function finish() {
    onComplete({ name: name.trim() || 'Friend', walkStage: stage, goal: goal.trim(),
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) })
  }

  const ic = "w-full border border-gray-200 rounded-input px-4 py-3.5 text-[15px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg px-5 py-8">
      <ProgressDots step={step} total={3} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} className="flex flex-col flex-1 mt-10 gap-6">
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                <Flame size={36} className="flame-flicker" style={{ color:'#5B4FCF' }} />
              </div>
              <h1 className="font-display text-[26px] font-bold text-text-primary text-center">Welcome to Daily Walk</h1>
              <p className="text-text-muted text-[14px] text-center leading-relaxed">Your daily devotion, together.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-text-primary text-[14px]">What should we call you? <span className="font-normal text-text-muted">(optional)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name or nickname" className={ic} />
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <button onClick={() => setStep(2)} className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 transition-all active:scale-[0.97]" style={{ background:'#5B4FCF' }}>Continue →</button>
              <button onClick={finish} className="text-text-muted text-[13px] font-semibold text-center underline underline-offset-2 hover:text-text-primary">Skip onboarding</button>
            </div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} className="flex flex-col flex-1 mt-10 gap-6">
            <div>
              <h2 className="font-display text-[22px] font-bold text-text-primary">Tell us about you</h2>
              <p className="text-text-muted text-[14px] mt-1">Helps us personalise your experience.</p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="font-bold text-text-primary text-[14px]">Where are you in your walk with God?</label>
              <div className="flex flex-wrap gap-2">{WALK_STAGES.map(s => <PillOption key={s} label={s} selected={stage===s} onSelect={() => setStage(s)} />)}</div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-text-primary text-[14px]">Biggest spiritual goal?</label>
              <textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Read the whole Bible this year..." rows={3}
                className={`${ic} resize-none`} />
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <button onClick={() => setStep(3)} className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 transition-all active:scale-[0.97]" style={{ background:'#5B4FCF' }}>Continue →</button>
              <button onClick={() => setStep(1)} className="text-text-muted text-[13px] font-semibold text-center hover:text-text-primary">← Back</button>
            </div>
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} className="flex flex-col flex-1 mt-10 gap-6">
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background:'#EDE9FF' }}>☁️</div>
              <h2 className="font-display text-[22px] font-bold text-text-primary text-center">Save your progress</h2>
              <p className="text-text-muted text-[13px] text-center leading-relaxed">Create a free account to back up your streak.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-text-primary text-[13px]">Email</label>
                <input type="email" placeholder="you@example.com" className={ic} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-text-primary text-[13px]">Password</label>
                <input type="password" placeholder="Choose a password" className={ic} />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <button onClick={() => { showToast('Account creation coming soon'); setTimeout(finish, 600) }}
                className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 transition-all" style={{ background:'#5B4FCF' }}>Create account</button>
              <button onClick={finish} className="text-text-muted text-[13px] font-semibold text-center underline underline-offset-2 hover:text-text-primary">Skip for now</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}

// ──────────────────────────────────────────────
//  Journey tab content (moved from /journey)
// ──────────────────────────────────────────────
function WeekStrip({ checkedSet, today, weekDays }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }} className="mt-4">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">This Week</p>
      <div className="flex items-center justify-between">
        {weekDays.map((d, i) => {
          const isChecked = checkedSet.has(d)
          const isToday   = d === today
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-text-muted font-semibold">{DAY_LABELS[i]}</span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                isChecked ? 'text-white' : isToday ? 'border-2 border-purple text-purple' : 'border-2 border-gray-200 text-text-muted'
              }`} style={isChecked ? { background:'#5B4FCF' } : {}}>
                {isChecked && !isToday && <span className="text-[16px]">·</span>}
                {isToday && isChecked  && <span className="text-white text-[16px]">✓</span>}
                {isToday && !isChecked && <span className="text-[10px] font-bold">now</span>}
                {!isToday && !isChecked && <span className="text-[10px]">{new Date(d).getDate()}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function LogsTab({ checkins }) {
  const [challenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const logs = [...(checkins || [])].reverse()

  function getChallengeTitle(challengeId) {
    return (challenges || []).find(c => c.id === challengeId)?.title || null
  }

  if (logs.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center mt-4">
        <BookOpen size={36} style={{ color:'#EDE9FF' }} />
        <p className="font-display text-[17px] font-semibold text-text-primary">No check-ins yet</p>
        <p className="text-text-muted text-[13px]">Tap "I read my Bible today" to log your first one.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {logs.map((entry, idx) => {
        const ct = entry.challengeId ? getChallengeTitle(entry.challengeId) : null
        return (
          <motion.div key={entry.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.04 }} className="card p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">{formatDateLabel(entry.date)}</p>
              {ct && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[120px]" style={{ background:'#EDE9FF', color:'#5B4FCF' }}>{ct}</span>}
            </div>
            {entry.passage    && <p className="font-display font-semibold text-[15px] mb-1" style={{ color:'#5B4FCF' }}>{entry.passage}</p>}
            {entry.reflection && <p className="text-text-primary text-[13px] leading-relaxed">"{entry.reflection}"</p>}
          </motion.div>
        )
      })}
    </div>
  )
}

function NuggetsTab({ nuggets, setNuggets }) {
  function del(id) {
    if (!window.confirm('Delete this nugget?')) return
    setNuggets(prev => (prev||[]).filter(n => n.id !== id))
    showToast('Nugget deleted')
  }

  if (!nuggets || nuggets.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center mt-4">
        <Lightbulb size={36} style={{ color:'#E8A838' }} />
        <p className="font-display text-[17px] font-semibold text-text-primary">No nuggets yet</p>
        <p className="text-text-muted text-[13px] leading-relaxed">Use the + button or the Bible reader to save something that spoke to you.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {[...(nuggets||[])].reverse().map((n, idx) => (
        <motion.div key={n.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.04 }} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:'#FFF4DC' }}>
                <Lightbulb size={15} style={{ color:'#E8A838' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">{formatTimestamp(n.createdAt)}</p>
                  {n.source && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#FFF4DC', color:'#B07000' }}>From {n.source}</span>}
                </div>
                <p className="text-text-primary text-[14px] leading-relaxed">{n.text}</p>
              </div>
            </div>
            <button onClick={() => del(n.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function JourneySection({ checkins, streak, user }) {
  const [subTab, setSubTab] = useState('logs')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])
  const today      = todayStr()
  const weekDays   = lastSevenDays()
  const checkedSet = new Set((checkins||[]).map(c => c.date))

  return (
    <div className="flex flex-col">
      {/* Streak card */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        className="rounded-card p-5 text-white" style={{ background:'linear-gradient(135deg,#5B4FCF 0%,#3D3190 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={22} className="flame-flicker" style={{ color:'#E8A838' }} />
              <span className="font-extrabold text-[28px]" style={{ color:'#E8A838' }}>{streak?.current||0}</span>
              <span className="font-semibold text-white/80 text-[16px]">-day streak</span>
            </div>
            <p className="text-white/70 text-[13px]">{checkins?.length||0} total · Since {user?.joinedAt||'today'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">Longest</span>
            <span className="font-bold text-[22px] text-white">{streak?.longest||0}</span>
          </div>
        </div>
      </motion.div>

      <WeekStrip checkedSet={checkedSet} today={today} weekDays={weekDays} />

      {/* Sub-tabs: Logs | Nuggets */}
      <div className="mt-5">
        <div className="flex gap-2 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[{ key:'logs', label:'Logs' }, { key:'nuggets', label:'Nuggets' }].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${
                subTab === t.key ? 'bg-white shadow-card' : 'text-text-muted hover:text-text-primary'
              }`}
              style={subTab === t.key ? { color:'#5B4FCF' } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'logs' ? (
          <motion.div key="logs" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
            <LogsTab checkins={checkins} />
          </motion.div>
        ) : (
          <motion.div key="nuggets" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
            <NuggetsTab nuggets={nuggets} setNuggets={setNuggets} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup */}
      <div className="mt-5 mb-6 rounded-card p-5 flex flex-col gap-3" style={{ border:'2px dashed rgba(91,79,207,0.25)' }}>
        <p className="font-bold text-text-primary text-[15px]">Back up your journey</p>
        <p className="text-text-muted text-[13px] leading-relaxed">Create a free account to never lose your streak.</p>
        <button onClick={() => showToast('Account creation coming soon')}
          className="rounded-pill py-2.5 px-5 text-[14px] font-bold w-fit hover:opacity-90 transition-colors border-2 border-purple text-purple"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
          Create account →
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
//  Settings row
// ──────────────────────────────────────────────
function SettingsRow({ icon: Icon, iconBg, label, sub, danger, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={17} className={danger ? 'text-red-500' : 'text-text-primary'} />
        </div>
        <div className="text-left">
          <p className={`font-bold text-[14px] ${danger ? 'text-red-500' : 'text-text-primary'}`}>{label}</p>
          {sub && <p className="text-text-muted text-[12px]">{sub}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  )
}

// ──────────────────────────────────────────────
//  Profile view
// ──────────────────────────────────────────────
function ProfileView({ user, streak, checkins }) {
  const [mainTab, setMainTab] = useState('profile')
  const [, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [, setUser]      = useLocalStorage('dw_user', null)
  const [, setCheckins2] = useLocalStorage('dw_checkins', [])
  const [, setStreak]    = useLocalStorage('dw_streak', null)

  function handleSignOut() {
    if (confirm('Reset all data and restart onboarding?')) {
      setOnboarded(false); setUser(null); setCheckins2([]); setStreak(null)
      window.localStorage.removeItem('dw_liked')
      window.location.reload()
    }
  }

  const ini = initials(user?.name || 'F')
  const bg  = avatarColor(user?.name || 'Friend')

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      {/* Hero */}
      <div className="px-5 pt-10 pb-6 flex flex-col items-center gap-4 text-white"
        style={{ background:'linear-gradient(135deg,#5B4FCF 0%,#3D3190 100%)' }}>
        <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold font-display border-4 border-white/30"
          style={{ background: bg }}>
          {ini}
        </motion.div>
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold">{user?.name || 'Friend'}</h1>
          {user?.walkStage && <span className="inline-block mt-1 bg-white/20 text-white text-[12px] font-bold px-3 py-1 rounded-full">{user.walkStage}</span>}
          <p className="text-white/60 text-[13px] mt-1">Member since {user?.joinedAt || 'today'}</p>
        </div>
        <div className="flex items-center gap-0 bg-white/15 rounded-2xl overflow-hidden w-full">
          {[
            { label:'Streak',  value: streak?.current || 0 },
            { label:'Total',   value: checkins?.length || 0 },
            { label:'Longest', value: streak?.longest || 0 },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 flex flex-col items-center py-3 ${i<2?'border-r border-white/20':''}`}>
              <span className="font-extrabold text-[22px]">{s.value}</span>
              <span className="text-white/60 text-[11px] font-semibold">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main tabs: Profile | Journey */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[{ key:'profile', label:'Profile' }, { key:'journey', label:'Journey' }].map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${mainTab===t.key ? 'bg-white shadow-card' : 'text-text-muted hover:text-text-primary'}`}
              style={mainTab===t.key ? { color:'#5B4FCF' } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'profile' ? (
          <motion.div key="profile" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}
            className="px-4 mt-4">
            {user?.goal && (
              <div className="card p-4 mb-4">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">Spiritual Goal</p>
                <p className="text-text-primary text-[14px] leading-relaxed font-display italic">"{user.goal}"</p>
              </div>
            )}
            <NotificationSettings />
            <div className="mt-4 flex flex-col gap-3 mb-6">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">More</p>
              <SettingsRow icon={Shield} iconBg="bg-sage-light"   label="Privacy"        sub="Who can see your posts" onClick={() => showToast('Privacy settings coming soon')} />
              <SettingsRow icon={Info}   iconBg="bg-purple-light" label="About Daily Walk"                            onClick={() => showToast('v1.0.0 — Built with ♥')} />
              <SettingsRow icon={LogOut} iconBg="bg-red-50"       label="Sign out & reset" danger                     onClick={handleSignOut} />
            </div>
          </motion.div>
        ) : (
          <motion.div key="journey" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}
            className="px-4 mt-4">
            <JourneySection checkins={checkins} streak={streak} user={user} />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}

// ──────────────────────────────────────────────
//  Main export
// ──────────────────────────────────────────────
export default function ProfileScreen() {
  const [onboarded, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [user, setUser]           = useLocalStorage('dw_user', null)
  const [streak]                  = useLocalStorage('dw_streak', null)
  const [checkins]                = useLocalStorage('dw_checkins', [])
  const [, , hydrated]            = useLocalStorage('dw_onboarding_complete', false)

  function handleComplete(userData) { setUser(userData); setOnboarded(true) }

  if (!hydrated) return null
  if (!onboarded) return <Onboarding onComplete={handleComplete} />
  return <ProfileView user={user} streak={streak} checkins={checkins} />
}