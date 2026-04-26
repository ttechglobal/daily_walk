'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Bell, Info, Shield, LogOut, ChevronRight } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { initials, avatarColor, todayStr } from '../../lib/constants'

const WALK_STAGES = ['Just starting', 'Growing', 'Recommitting', 'Consistent']

// ── Progress dots ──
function ProgressDots({ step, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i + 1 === step ? 24 : 8,
            background: i + 1 === step ? '#5B4FCF' : '#EDE9FF',
          }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  )
}

// ── Pill option button ──
function PillOption({ label, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`
        px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all
        ${selected
          ? 'bg-purple text-white border-purple'
          : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'}
      `}
    >
      {label}
    </button>
  )
}

// ── Onboarding flow ──
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [name,  setName]  = useState('')
  const [stage, setStage] = useState('')
  const [goal,  setGoal]  = useState('')

  function finishOnboarding() {
    onComplete({
      name: name.trim() || 'Friend',
      walkStage: stage,
      goal: goal.trim(),
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg px-5 py-8">
      <ProgressDots step={step} total={3} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col flex-1 mt-10 gap-6"
          >
            {/* Logo */}
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-20 h-20 rounded-3xl bg-purple-light flex items-center justify-center">
                <Flame size={36} className="text-purple flame-flicker" />
              </div>
              <h1 className="font-display text-[26px] font-bold text-text-primary text-center">
                Welcome to Daily Walk
              </h1>
              <p className="text-text-muted text-[14px] text-center leading-relaxed">
                Your daily devotion, together.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-ui font-bold text-text-primary text-[14px]">
                What should we call you?{' '}
                <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name or nickname"
                className="
                  w-full border border-gray-200 rounded-input
                  px-4 py-3.5 text-[15px] text-text-primary
                  focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20
                  transition-all placeholder:text-text-muted
                "
              />
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark transition-all active:scale-[0.97]"
              >
                Continue →
              </button>
              <button
                onClick={finishOnboarding}
                className="text-text-muted text-[13px] font-semibold text-center underline underline-offset-2 hover:text-text-primary"
              >
                Skip onboarding
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col flex-1 mt-10 gap-6"
          >
            <div>
              <h2 className="font-display text-[22px] font-bold text-text-primary">
                Tell us about you
              </h2>
              <p className="text-text-muted text-[14px] mt-1">
                This helps us personalise your experience.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-ui font-bold text-text-primary text-[14px]">
                Where are you in your walk with God?
              </label>
              <div className="flex flex-wrap gap-2">
                {WALK_STAGES.map(s => (
                  <PillOption
                    key={s}
                    label={s}
                    selected={stage === s}
                    onSelect={() => setStage(s)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-ui font-bold text-text-primary text-[14px]">
                What's your biggest spiritual goal?
              </label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Read the whole Bible this year, be more prayerful..."
                rows={3}
                className="
                  w-full border border-gray-200 rounded-input resize-none
                  px-4 py-3 text-[15px] text-text-primary
                  focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20
                  transition-all placeholder:text-text-muted
                "
              />
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button
                onClick={() => setStep(3)}
                className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark transition-all active:scale-[0.97]"
              >
                Continue →
              </button>
              <button
                onClick={() => setStep(1)}
                className="text-text-muted text-[13px] font-semibold text-center hover:text-text-primary"
              >
                ← Back
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col flex-1 mt-10 gap-6"
          >
            <div className="flex flex-col items-center gap-2 mb-2">
              <span className="text-5xl">☁️</span>
              <h2 className="font-display text-[22px] font-bold text-text-primary text-center">
                Save your progress
              </h2>
              <p className="text-text-muted text-[13px] text-center leading-relaxed">
                Create a free account to back up your streak and logs — so you never lose your journey.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-ui font-bold text-text-primary text-[13px]">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-input px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-ui font-bold text-text-primary text-[13px]">Password</label>
                <input
                  type="password"
                  placeholder="Choose a password"
                  className="w-full border border-gray-200 rounded-input px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button
                onClick={() => { showToast('Account creation coming soon ✨'); setTimeout(finishOnboarding, 600) }}
                className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark transition-all"
              >
                Create account
              </button>
              <button
                onClick={finishOnboarding}
                className="text-text-muted text-[13px] font-semibold text-center underline underline-offset-2 hover:text-text-primary"
              >
                Skip for now — I'll use it without an account
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}

// ── Settings row ──
function SettingsRow({ icon: Icon, iconBg, label, sub, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={17} className={danger ? 'text-red-500' : 'text-text-primary'} />
        </div>
        <div className="text-left">
          <p className={`font-ui font-bold text-[14px] ${danger ? 'text-red-500' : 'text-text-primary'}`}>{label}</p>
          {sub && <p className="text-text-muted text-[12px]">{sub}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  )
}

// ── Profile view (post-onboarding) ──
function ProfileView({ user, streak, checkins }) {
  const [, setOnboarded] = useLocalStorage('dw_onboarding_complete', false)
  const [, setUser]      = useLocalStorage('dw_user', null)
  const [, setCheckins2] = useLocalStorage('dw_checkins', [])
  const [, setStreak]    = useLocalStorage('dw_streak', null)

  function handleSignOut() {
    if (confirm('Reset all data and restart onboarding?')) {
      setOnboarded(false)
      setUser(null)
      setCheckins2([])
      setStreak(null)
      window.localStorage.removeItem('dw_liked')
      window.location.reload()
    }
  }

  const ini = initials(user?.name || 'F')
  const bg  = avatarColor(user?.name || 'Friend')

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      {/* ── HERO ── */}
      <div className="streak-gradient px-5 pt-10 pb-8 flex flex-col items-center gap-4 text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold font-display border-4 border-white/30"
          style={{ background: bg }}
        >
          {ini}
        </motion.div>

        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold">{user?.name || 'Friend'}</h1>
          {user?.walkStage && (
            <span className="inline-block mt-1 bg-white/20 text-white text-[12px] font-bold px-3 py-1 rounded-full">
              {user.walkStage}
            </span>
          )}
          <p className="text-white/60 text-[13px] mt-1">
            Member since {user?.joinedAt || 'April 2026'}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-0 bg-white/15 rounded-2xl overflow-hidden w-full">
          {[
            { label: 'Streak', value: streak?.current || 0, icon: '🔥' },
            { label: 'Total', value: checkins?.length || 0, icon: '📖' },
            { label: 'Longest', value: streak?.longest || 0, icon: '⚡' },
          ].map((stat, i) => (
            <div key={stat.label} className={`flex-1 flex flex-col items-center py-3 ${i < 2 ? 'border-r border-white/20' : ''}`}>
              <span className="font-ui font-extrabold text-[22px]">{stat.icon} {stat.value}</span>
              <span className="text-white/60 text-[11px] font-semibold">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── GOAL ── */}
      {user?.goal && (
        <div className="mx-4 mt-4 card p-4">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">Spiritual Goal</p>
          <p className="text-text-primary text-[14px] leading-relaxed font-display italic">"{user.goal}"</p>
        </div>
      )}

      {/* ── SETTINGS ── */}
      <div className="px-4 mt-5 flex flex-col gap-3 mb-6">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Settings</p>
        <SettingsRow
          icon={Bell} iconBg="bg-amber-light"
          label="Notifications" sub="Daily check-in reminders"
          onClick={() => showToast('Notifications coming soon 🔔')}
        />
        <SettingsRow
          icon={Shield} iconBg="bg-sage-light"
          label="Privacy" sub="Who can see your posts"
          onClick={() => showToast('Privacy settings coming soon')}
        />
        <SettingsRow
          icon={Info} iconBg="bg-purple-light"
          label="About Daily Walk"
          onClick={() => showToast('v1.0.0 — Built with ♥')}
        />
        <SettingsRow
          icon={LogOut} iconBg="bg-red-50"
          label="Sign out & reset" danger
          onClick={handleSignOut}
        />
      </div>

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

  function handleComplete(userData) {
    setUser(userData)
    setOnboarded(true)
  }

  if (!hydrated) return null

  if (!onboarded) {
    return <Onboarding onComplete={handleComplete} />
  }

  return <ProfileView user={user} streak={streak} checkins={checkins} />
}
