'use client'

// ── Journey screen — Update 3: empty states, no fake data ──
// Nuggets tab reads dw_nuggets. Logs tab reads dw_checkins.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Lock, BookOpen, Lightbulb, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { formatDateLabel, formatTimestamp, lastSevenDays, todayStr, SEED_CHALLENGES } from '../../lib/constants'

const DAY_LABELS = ['M','T','W','T','F','S','S']

function WeekStrip({ checkedSet, today, weekDays }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }} className="mx-4 mt-4">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">This Week</p>
      <div className="flex items-center justify-between">
        {weekDays.map((d, i) => {
          const isChecked = checkedSet.has(d)
          const isToday   = d === today
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-text-muted font-semibold">{DAY_LABELS[i]}</span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                isChecked ? 'bg-purple text-white' : isToday ? 'border-2 border-purple text-purple' : 'border-2 border-gray-200 text-text-muted'
              }`}>
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
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="card mx-4 p-10 flex flex-col items-center gap-3 text-center mt-4">
        <BookOpen size={36} className="text-purple-light" />
        <p className="font-display text-[17px] font-semibold text-text-primary">No check-ins yet</p>
        <p className="text-text-muted text-[13px] leading-relaxed">
          Tap "I read my Bible today" to log your first one.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 mt-4">
      {logs.map((entry, idx) => {
        const challengeTitle = entry.challengeId ? getChallengeTitle(entry.challengeId) : null
        return (
          <motion.div key={entry.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.04 }} className="card p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">{formatDateLabel(entry.date)}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {challengeTitle && (
                  <span className="text-[10px] font-bold text-purple bg-purple-light px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    {challengeTitle}
                  </span>
                )}
              </div>
            </div>
            {entry.passage    && <p className="font-display font-semibold text-purple text-[15px] mb-1">{entry.passage}</p>}
            {entry.reflection && <p className="text-text-primary text-[13px] leading-relaxed">"{entry.reflection}"</p>}
          </motion.div>
        )
      })}
    </div>
  )
}

function NuggetsTab({ nuggets, setNuggets }) {
  function deleteNugget(id) {
    if (!window.confirm('Delete this nugget?')) return
    setNuggets(prev => (prev || []).filter(n => n.id !== id))
    showToast('Nugget deleted')
  }

  if (!nuggets || nuggets.length === 0) {
    return (
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="card mx-4 p-10 flex flex-col items-center gap-3 text-center mt-4">
        <Lightbulb size={36} className="text-amber" />
        <p className="font-display text-[17px] font-semibold text-text-primary">No nuggets yet</p>
        <p className="text-text-muted text-[13px] leading-relaxed">
          Use the + button or the Bible reader to save something that spoke to you.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 mt-4">
      {[...(nuggets || [])].reverse().map((nugget, idx) => (
        <motion.div key={nugget.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, x:-20 }} transition={{ delay:idx*0.04 }} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-light flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb size={15} className="text-amber" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">
                    {formatTimestamp(nugget.createdAt)}
                  </p>
                  {nugget.source && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-light px-2 py-0.5 rounded-full">
                      From {nugget.source}
                    </span>
                  )}
                </div>
                <p className="text-text-primary text-[14px] leading-relaxed">{nugget.text}</p>
              </div>
            </div>
            <button onClick={() => deleteNugget(nugget.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              aria-label="Delete nugget">
              <Trash2 size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function JourneyScreen() {
  const [tab, setTab] = useState('logs')
  const [checkins]                 = useLocalStorage('dw_checkins', [])
  const [nuggets, setNuggets]      = useLocalStorage('dw_nuggets',  [])
  const [streak]                   = useLocalStorage('dw_streak', { current:0, longest:0, lastCheckinDate:null })
  const [user]                     = useLocalStorage('dw_user', null)
  const [, , hydrated]             = useLocalStorage('dw_checkins', [])

  const today      = todayStr()
  const weekDays   = lastSevenDays()
  const checkedSet = new Set((checkins || []).map(c => c.date))

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <div className="px-4 pt-6">
        <motion.h1 initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
          className="font-display text-[24px] font-bold text-text-primary">
          Your Journey
        </motion.h1>
        <p className="text-text-muted text-[13px] mt-0.5">Every day adds up</p>
      </div>

      {/* Streak card */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        className="mx-4 mt-5 streak-gradient rounded-card p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={22} className="text-amber flame-flicker" />
              <span className="font-extrabold text-[28px] text-amber">{streak?.current || 0}</span>
              <span className="font-semibold text-white/80 text-[16px]">-day streak</span>
            </div>
            <p className="text-white/70 text-[13px]">
              {checkins?.length || 0} total · Member since {user?.joinedAt || 'today'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">Longest</span>
            <span className="font-bold text-[22px] text-white">{streak?.longest || 0}</span>
          </div>
        </div>
      </motion.div>

      <WeekStrip checkedSet={checkedSet} today={today} weekDays={weekDays} />

      {/* Tabs */}
      <div className="px-4 mt-5">
        <div className="flex gap-2 bg-purple-light p-1 rounded-full">
          {[{ key:'logs', label:'Logs' }, { key:'nuggets', label:'Nuggets' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${
                tab === t.key ? 'bg-white text-purple shadow-card' : 'text-text-muted hover:text-text-primary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'logs' ? (
          <motion.div key="logs" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
            <LogsTab checkins={checkins} />
          </motion.div>
        ) : (
          <motion.div key="nuggets" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
            <NuggetsTab nuggets={nuggets} setNuggets={setNuggets} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup CTA */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
        className="mx-4 mt-5 mb-6 rounded-card border-2 border-dashed border-purple/25 p-5 flex flex-col gap-3">
        <p className="font-bold text-text-primary text-[15px]">Back up your journey</p>
        <p className="text-text-muted text-[13px] leading-relaxed">Create a free account to never lose your streak.</p>
        <button onClick={() => showToast('Account creation coming soon')}
          className="border-2 border-purple text-purple rounded-pill py-2.5 px-5 text-[14px] font-bold w-fit hover:bg-purple-light transition-colors">
          Create account →
        </button>
      </motion.div>

      <ToastContainer />
    </div>
  )
}