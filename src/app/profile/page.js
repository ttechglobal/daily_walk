'use client'

// ── Profile — Onboarding includes companion selection (step 2) ──
// Profile | Journey tabs. Character picker in settings.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Info, Shield, LogOut, ChevronRight, BookOpen, Lightbulb, Trash2, Share2, PenLine } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import NotificationSettings from '../../components/NotificationSettings'
import CharacterPicker from '../../components/CharacterPicker'
import { CHARACTERS, getCharacterById } from '../../lib/characters'
import {
  initials, avatarColor, formatDateLabel, formatTimestamp,
  lastSevenDays, todayStr, SEED_CHALLENGES
} from '../../lib/constants'

const WALK_STAGES   = ['Just starting', 'Growing', 'Recommitting', 'Consistent']
const DAY_LABELS    = ['M','T','W','T','F','S','S']

// ── Step dots ──
function StepDots({ step, total }) {
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

// ── Companion card (inline, for onboarding) ──
function CompanionCard({ character, selected, onSelect }) {
  const color = character.accentColor
  return (
    <button onClick={() => onSelect(character.id)}
      className="flex flex-col gap-2 p-3 rounded-[16px] transition-all text-left"
      style={{
        background: selected ? `${color}15` : 'white',
        border: `2px solid ${selected ? color : '#F0EDE8'}`,
        borderLeft: `4px solid ${color}`,
      }}>
      <div className="w-full h-[80px] rounded-[12px] flex flex-col items-center justify-center"
        style={{ background: `${color}18` }}>
        <span style={{ fontSize: 34 }}>{character.placeholderEmoji}</span>
      </div>
      <p className="font-display font-semibold text-[13px]" style={{ color: '#1A1A2E' }}>{character.name}</p>
      <p className="text-[11px] font-semibold" style={{ color }}>{character.title}</p>
      <p className="text-[10px] leading-snug line-clamp-2" style={{ color: '#9CA3AF' }}>
        "{character.signatureVerse}"
      </p>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Onboarding
// ─────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step,       setStep]       = useState(1)
  const [name,       setName]       = useState('')
  const [stage,      setStage]      = useState('')
  const [goal,       setGoal]       = useState('')
  const [companionId, setCompanionId] = useState('david')

  const ic = "w-full border border-gray-200 rounded-input px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"

  function finish() {
    onComplete({
      name: name.trim() || 'Friend',
      walkStage: stage,
      goal: goal.trim(),
      companionId,
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-8" style={{ background: '#FAF8F5' }}>
      <StepDots step={step} total={3} />
      <AnimatePresence mode="wait">

        {/* Step 1 — Name */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="flex flex-col flex-1 mt-10 gap-6">
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background:'#EDE9FF' }}>
                <Flame size={36} className="flame-flicker" style={{ color:'#5B4FCF' }} />
              </div>
              <h1 className="font-display text-[26px] font-bold text-center" style={{ color:'#1A1A2E' }}>
                Welcome to Daily Walk
              </h1>
              <p className="text-[14px] text-center leading-relaxed" style={{ color:'#6B7280' }}>
                Your daily devotion, together.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>
                What should we call you? <span className="font-normal" style={{ color:'#9CA3AF' }}>(optional)</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name or nickname" className={ic} style={{ color:'#1A1A2E' }} />
            </div>
            <div className="flex flex-col gap-3 mt-auto">
              <button onClick={() => setStep(2)}
                className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97]"
                style={{ background:'#5B4FCF' }}>Continue →</button>
              <button onClick={finish} className="text-[13px] font-semibold text-center underline underline-offset-2 hover:opacity-70"
                style={{ color:'#9CA3AF' }}>Skip onboarding</button>
            </div>
          </motion.div>
        )}

        {/* Step 2 — Choose companion */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="flex flex-col flex-1 mt-8 gap-5">
            <div>
              <h2 className="font-display text-[22px] font-bold" style={{ color:'#1A1A2E' }}>Choose your companion</h2>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color:'#6B7280' }}>
                They will walk with you and reflect your spiritual health
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto scroll-hide">
              {CHARACTERS.map(c => (
                <CompanionCard key={c.id} character={c} selected={companionId === c.id} onSelect={setCompanionId} />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setStep(3)}
                className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97]"
                style={{ background:'#5B4FCF' }}>Continue →</button>
              <button onClick={() => setStep(3)} className="text-[13px] font-semibold text-center" style={{ color:'#9CA3AF' }}>
                Skip — I'll choose later
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3 — Account */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="flex flex-col flex-1 mt-8 gap-6">
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background:'#EDE9FF' }}>☁️</div>
              <h2 className="font-display text-[22px] font-bold text-center" style={{ color:'#1A1A2E' }}>Save your progress</h2>
              <p className="text-[13px] text-center leading-relaxed" style={{ color:'#6B7280' }}>
                Create a free account to back up your streak.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>Email</label>
                <input type="email" placeholder="you@example.com" className={ic} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>Password</label>
                <input type="password" placeholder="Choose a password" className={ic} />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <button onClick={() => { showToast('Account creation coming soon'); setTimeout(finish, 600) }}
                className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90"
                style={{ background:'#5B4FCF' }}>Create account</button>
              <button onClick={finish} className="text-[13px] font-semibold text-center underline underline-offset-2 hover:opacity-70"
                style={{ color:'#9CA3AF' }}>Skip for now</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Journey section (embedded in Profile)
// ─────────────────────────────────────────────
function WeekStrip({ checkedSet, today, weekDays }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color:'#9CA3AF' }}>This Week</p>
      <div className="flex items-center justify-between">
        {weekDays.map((d, i) => {
          const isChecked = checkedSet.has(d), isToday = d === today
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color:'#9CA3AF' }}>{DAY_LABELS[i]}</span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                style={{
                  background: isChecked ? '#5B4FCF' : 'transparent',
                  color: isChecked ? 'white' : isToday ? '#5B4FCF' : '#9CA3AF',
                  border: !isChecked ? `2px solid ${isToday ? '#5B4FCF' : '#E8E5E0'}` : 'none',
                }}>
                {isChecked && !isToday && <span style={{ fontSize: 16 }}>·</span>}
                {isToday && isChecked  && '✓'}
                {isToday && !isChecked && <span style={{ fontSize: 10 }}>now</span>}
                {!isToday && !isChecked && <span style={{ fontSize: 10 }}>{new Date(d).getDate()}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function JourneySection({ checkins, streak, user }) {
  const [subTab, setSubTab]       = useState('logs')
  const [nuggets, setNuggets]     = useLocalStorage('dw_nuggets', [])
  const [challenges]              = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const today      = todayStr()
  const weekDays   = lastSevenDays()
  const checkedSet = new Set((checkins||[]).map(c => c.date))

  function getChallengeTitle(id) {
    return (challenges||[]).find(c => c.id === id)?.title || null
  }

  return (
    <div>
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

      {/* Logs / Nuggets tabs */}
      <div className="mt-5">
        <div className="flex gap-1 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[{k:'logs',l:'Logs'},{k:'nuggets',l:'Nuggets'}].map(t => (
            <button key={t.k} onClick={() => setSubTab(t.k)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
              style={subTab===t.k ? {color:'#5B4FCF'} : {color:'#6B7280'}}>
              {subTab===t.k && <motion.div layoutId="j-tab" className="absolute inset-0 bg-white rounded-full shadow-card" transition={{type:'spring',stiffness:400,damping:35}} />}
              <span className="relative z-10">{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'logs' && (
          <motion.div key="logs" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
            {!(checkins?.length) ? (
              <div className="flex flex-col items-center gap-3 text-center py-10">
                <BookOpen size={32} style={{color:'#E8E5E0'}} />
                <p className="font-display text-[16px] font-semibold" style={{color:'#1A1A2E'}}>No check-ins yet</p>
                <p className="text-[13px]" style={{color:'#9CA3AF'}}>Tap "I read my Bible today" to log your first one.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                {[...(checkins||[])].reverse().map((e, i) => {
                  const ct = e.challengeId ? getChallengeTitle(e.challengeId) : null
                  return (
                    <div key={e.id} className="bg-white rounded-[16px] p-4" style={{boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{color:'#9CA3AF'}}>{formatDateLabel(e.date)}</p>
                        {ct && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#EDE9FF',color:'#5B4FCF'}}>{ct}</span>}
                      </div>
                      {e.passage    && <p className="font-display font-semibold text-[14px] mb-0.5" style={{color:'#5B4FCF'}}>{e.passage}</p>}
                      {e.reflection && <p className="text-[13px] leading-relaxed" style={{color:'#1A1A2E'}}>"{e.reflection}"</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
        {subTab === 'nuggets' && (
          <motion.div key="nuggets" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
            {!(nuggets?.length) ? (
              <div className="flex flex-col items-center gap-3 text-center py-10">
                <Lightbulb size={32} style={{color:'#E8A838'}} />
                <p className="font-display text-[16px] font-semibold" style={{color:'#1A1A2E'}}>No nuggets yet</p>
                <p className="text-[13px]" style={{color:'#9CA3AF'}}>Use the + button or the Bible reader to save something that spoke to you.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                {[...(nuggets||[])].reverse().map(n => (
                  <div key={n.id} className="bg-white rounded-[16px] p-4 flex items-start gap-3" style={{boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#FFF4DC'}}>
                      <Lightbulb size={14} style={{color:'#E8A838'}} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{color:'#9CA3AF'}}>{formatTimestamp(n.createdAt)}</p>
                      {n.source && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1" style={{background:'#FFF4DC',color:'#B07000'}}>From {n.source}</span>}
                      <p className="text-[14px] leading-relaxed mt-1" style={{color:'#1A1A2E'}}>{n.text}</p>
                    </div>
                    <button onClick={() => { if (!confirm('Delete?')) return; setNuggets(prev => (prev||[]).filter(x=>x.id!==n.id)); showToast('Deleted') }}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors" style={{color:'#9CA3AF'}}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 mb-6 rounded-card p-5 flex flex-col gap-3" style={{border:'2px dashed rgba(91,79,207,0.2)'}}>
        <p className="font-bold text-[15px]" style={{color:'#1A1A2E'}}>Back up your journey</p>
        <p className="text-[13px] leading-relaxed" style={{color:'#6B7280'}}>Create a free account to never lose your streak.</p>
        <button onClick={() => showToast('Account creation coming soon')}
          className="rounded-pill py-2.5 px-5 text-[14px] font-bold w-fit border-2 hover:opacity-80 transition-colors"
          style={{borderColor:'#5B4FCF',color:'#5B4FCF'}}>
          Create account →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Profile view (post-onboarding)
// ─────────────────────────────────────────────
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

function ProfileView({ user, streak, checkins }) {
  const [mainTab,    setMainTab]    = useState('profile')
  const [globalPosts]    = useLocalStorage('dw_global_posts', [])
  const [communities2]   = useLocalStorage('dw_communities', [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [, setUser]      = useLocalStorage('dw_user', null)
  const [, setCheckins2] = useLocalStorage('dw_checkins', [])
  const [, setStreak]    = useLocalStorage('dw_streak', null)

  const companion   = getCharacterById(user?.companionId || 'david')

  function handleSignOut() {
    if (confirm('Reset all data?')) {
      setOnboarded(false); setUser(null); setCheckins2([]); setStreak(null)
      window.localStorage.removeItem('dw_liked')
      window.location.reload()
    }
  }

  function handleCompanionConfirm(id) {
    setUser(prev => ({ ...(prev || {}), companionId: id }))
    setPickerOpen(false)
    showToast(`${getCharacterById(id).name} is your companion now.`)
  }

  const ini = initials(user?.name || 'F')
  const bg  = avatarColor(user?.name || 'Friend')

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
      {/* Hero */}
      <div className="px-5 pt-10 pb-6 flex flex-col items-center gap-4 text-white"
        style={{ background:'linear-gradient(135deg,#5B4FCF 0%,#3D3190 100%)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold font-display border-4 border-white/30"
          style={{ background: bg }}>{ini}</div>
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold">{user?.name || 'Friend'}</h1>
          {user?.walkStage && <span className="inline-block mt-1 bg-white/20 text-white text-[12px] font-bold px-3 py-1 rounded-full">{user.walkStage}</span>}
          <p className="text-white/60 text-[13px] mt-1">Member since {user?.joinedAt || 'today'}</p>
          {/* Companion badge */}
          <button onClick={() => setPickerOpen(true)}
            className="mt-2 flex items-center gap-1.5 mx-auto bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-full">
            <span style={{ fontSize: 14 }}>{companion.placeholderEmoji}</span>
            <span className="text-[12px] font-semibold text-white">{companion.name}</span>
            <span className="text-white/60 text-[11px]">· tap to change</span>
          </button>
        </div>
        <div className="flex items-center gap-0 bg-white/15 rounded-2xl overflow-hidden w-full">
          {[{l:'Streak',v:streak?.current||0},{l:'Total',v:checkins?.length||0},{l:'Longest',v:streak?.longest||0}].map((s,i) => (
            <div key={s.l} className={`flex-1 flex flex-col items-center py-3 ${i<2?'border-r border-white/20':''}`}>
              <span className="font-extrabold text-[22px]">{s.v}</span>
              <span className="text-white/60 text-[11px] font-semibold">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile | Journey tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background:'#EDE9FF' }}>
          {[{k:'profile',l:'Profile'},{k:'journey',l:'Journey'}].map(t => (
            <button key={t.k} onClick={() => setMainTab(t.k)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
              style={mainTab===t.k?{color:'#5B4FCF'}:{color:'#6B7280'}}>
              {mainTab===t.k && <motion.div layoutId="profile-tab" className="absolute inset-0 bg-white rounded-full shadow-card" transition={{type:'spring',stiffness:400,damping:35}} />}
              <span className="relative z-10">{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'profile' && (
          <motion.div key="profile" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}} className="px-4 mt-4">
            {user?.goal && (
              <div className="card p-4 mb-4">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">Spiritual Goal</p>
                <p className="text-text-primary text-[14px] leading-relaxed font-display italic">"{user.goal}"</p>
              </div>
            )}
            <NotificationSettings />
            <div className="mt-4 flex flex-col gap-3 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color:'#9CA3AF' }}>More</p>
              <SettingsRow icon={Shield} iconBg="bg-sage-light"   label="Privacy"          sub="Who can see your posts"   onClick={() => showToast('Coming soon')} />
              <SettingsRow icon={Info}   iconBg="bg-purple-light" label="About Daily Walk"                                onClick={() => showToast('v1.0.0 — Built with ♥')} />
              <SettingsRow icon={LogOut} iconBg="bg-red-50"       label="Sign out & reset"  danger                        onClick={handleSignOut} />
            </div>
          </motion.div>
        )}
        {mainTab === 'journey' && (
          <motion.div key="journey" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}} className="px-4 mt-4">
            <JourneySection checkins={checkins} streak={streak} user={user} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character picker sheet */}
      <AnimatePresence>
        {pickerOpen && (
          <CharacterPicker
            currentId={user?.companionId || 'david'}
            onConfirm={handleCompanionConfirm}
            onClose={() => setPickerOpen(false)}
          />
        )}

        {/* Posts tab */}
        {mainTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}
            className="px-4 mt-4 pb-6">
            <UserPostsTab globalPosts={globalPosts || []} communities={communities2 || []} />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}

// ── Main export ──
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