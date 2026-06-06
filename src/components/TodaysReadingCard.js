'use client'

// ── src/components/TodaysReadingCard.js ──
// Dynamic home card — v2.
// Shows today's reading slice from the user's active plan.
// Tabs: Reading | Notes
// Mark as Read: prominent CTA, logs completion, notifies group members.
// Multi-plan toggle if user has more than one active plan.
//
// Data flow:
//   1. getActivePlanForHome() → returns up to 5 active plans with content
//   2. getSliceForDay() → O(1) slice for currentDay
//   3. Notes: local-first via plan-notes.js
//   4. Mark as Read: markDayComplete() → notifyReadComplete()

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, PenLine, RotateCcw,
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useAuthContext } from '../contexts/AuthContext'
import {
  getActivePlanForHome, markDayComplete, notifyReadComplete,
} from '../lib/supabase/plans'
import {
  getSliceForDay, formatSliceReference, getCompletionPct,
} from '../lib/plan-schedule'
import { getNote, saveNote } from '../lib/plan-notes'
import { showToast } from './Toast'

// ─────────────────────────────────────────────
//  Debounce helper (for note autosave)
// ─────────────────────────────────────────────
function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

// ─────────────────────────────────────────────
//  TodaysReadingCard
// ─────────────────────────────────────────────
export default function TodaysReadingCard() {
  const { t }              = useTheme()
  const { user }           = useAuthContext()
  const router             = useRouter()

  // Plan state
  const [plans,       setPlans]       = useState([])
  const [planIdx,     setPlanIdx]     = useState(0) // which plan is shown
  const [loading,     setLoading]     = useState(true)

  // Reading state
  const [todayDone,   setTodayDone]   = useState(false)
  const [marking,     setMarking]     = useState(false)

  // Notes state
  const [activeTab,   setActiveTab]   = useState('reading') // 'reading' | 'notes'
  const [noteText,    setNoteText]    = useState('')
  const [noteSaved,   setNoteSaved]   = useState(true)

  // ── Load plans ──
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getActivePlanForHome(user.id)
      .then(rows => {
        setPlans(rows || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user?.id])

  const activePlan = plans[planIdx] || null

  // ── Derive today's slice ──
  const frequency = activePlan
    ? { unit: activePlan.frequencyUnit || 'chapter', count: activePlan.frequencyCount || 1 }
    : null
  const todaySlice = activePlan && frequency
    ? getSliceForDay(activePlan.content, frequency, activePlan.currentDay)
    : null
  const reference = formatSliceReference(todaySlice)
  const pct       = activePlan
    ? getCompletionPct(activePlan.currentDay, activePlan.personalDays)
    : 0

  // ── Check if today is already done ──
  useEffect(() => {
    if (!user?.id || !activePlan) return
    const { createClient } = require('../lib/supabase/client')
    const sb = createClient()
    if (!sb) return
    sb.from('daily_completions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', activePlan.planId)
      .eq('user_id', user.id)
      .eq('day_number', activePlan.currentDay)
      .then(({ count }) => setTodayDone((count || 0) > 0))
  }, [user?.id, activePlan?.planId, activePlan?.currentDay])

  // ── Load note for this day ──
  useEffect(() => {
    if (!user?.id || !activePlan) return
    getNote(user.id, activePlan.planId, activePlan.currentDay)
      .then(text => { setNoteText(text); setNoteSaved(true) })
  }, [user?.id, activePlan?.planId, activePlan?.currentDay])

  // ── Autosave note ──
  const persistNote = useCallback((text) => {
    if (!user?.id || !activePlan) return
    saveNote(user.id, activePlan.planId, activePlan.currentDay, text)
    setNoteSaved(true)
  }, [user?.id, activePlan?.planId, activePlan?.currentDay])

  const debouncedSave = useDebounce(persistNote, 800)

  function handleNoteChange(e) {
    setNoteText(e.target.value)
    setNoteSaved(false)
    debouncedSave(e.target.value)
  }

  // ── Mark as read ──
  async function handleMarkRead() {
    if (!activePlan || todayDone || marking) return
    setMarking(true)
    try {
      await markDayComplete(activePlan.planId, activePlan.currentDay)
      setTodayDone(true)
      // Notify group members (fire and forget)
      if (activePlan.memberCount > 1 && user) {
        notifyReadComplete(
          activePlan.planId, activePlan.planName,
          user.user_metadata?.name || user.email?.split('@')[0] || 'Someone',
          activePlan.currentDay
        ).catch(() => null)
      }
      showToast('Day complete! 🙌')
      // Optimistically advance currentDay in UI
      setPlans(prev => prev.map((p, i) =>
        i === planIdx
          ? { ...p, currentDay: Math.min(p.currentDay + 1, p.personalDays || 9999) }
          : p
      ))
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to track progress' : 'Something went wrong')
    } finally {
      setMarking(false)
    }
  }

  // ─────────────────────────────────────────────
  //  Render: no user
  // ─────────────────────────────────────────────
  if (!user) {
    return (
      <GuestCard t={t} router={router} />
    )
  }

  // ─────────────────────────────────────────────
  //  Render: loading
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-4 rounded-[22px] overflow-hidden"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, minHeight: 200 }}>
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 size={22} className="animate-spin" style={{ color: '#5B4FCF' }} />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: no active plan
  // ─────────────────────────────────────────────
  if (!activePlan || !todaySlice) {
    return <NoPlanCard t={t} router={router} />
  }

  // ─────────────────────────────────────────────
  //  Render: active plan card
  // ─────────────────────────────────────────────
  return (
    <div className="mx-4">
      {/* Multi-plan toggle */}
      {plans.length > 1 && (
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[12px] font-semibold" style={{ color: t.textMuted }}>
            {planIdx + 1} of {plans.length} plans
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => { setPlanIdx(i => Math.max(0, i - 1)); setActiveTab('reading') }}
              disabled={planIdx === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: t.bgMuted }}>
              <ChevronLeft size={14} style={{ color: t.text }} />
            </button>
            <button
              onClick={() => { setPlanIdx(i => Math.min(plans.length - 1, i + 1)); setActiveTab('reading') }}
              disabled={planIdx === plans.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: t.bgMuted }}>
              <ChevronRight size={14} style={{ color: t.text }} />
            </button>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[22px] overflow-hidden"
        style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3"
          style={{ background: 'linear-gradient(135deg,#5B4FCF18,#3D319008)' }}
        >
          {/* Plan name + day */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                style={{ color: '#5B4FCF' }}>
                Day {activePlan.currentDay}
                {activePlan.personalDays ? ` of ${activePlan.personalDays}` : ''}
              </p>
              <p className="font-bold text-[16px] leading-snug truncate"
                style={{ color: t.text }}>
                {activePlan.planName}
              </p>
            </div>
            {/* Progress ring (simple) */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <div className="w-8 h-8 relative flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90">
                  <circle cx="16" cy="16" r="13" fill="none" stroke={t.bgMuted} strokeWidth="3"/>
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#5B4FCF" strokeWidth="3"
                    strokeDasharray={`${(pct / 100) * 81.7} 81.7`}
                    strokeLinecap="round"/>
                </svg>
                <span className="text-[8px] font-bold relative z-10" style={{ color: '#5B4FCF' }}>
                  {pct}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#5B4FCF,#7C6FCD)' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: t.border }}>
          {[
            { key: 'reading', label: 'Reading', icon: BookOpen },
            { key: 'notes',   label: 'Notes',   icon: PenLine  },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold transition-all"
              style={{
                color:       activeTab === key ? '#5B4FCF' : t.textMuted,
                borderBottom: activeTab === key ? '2px solid #5B4FCF' : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'reading' ? (
            <motion.div
              key="reading"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-4"
            >
              {/* Reference */}
              <p className="text-[12px] font-bold uppercase tracking-wider mb-2"
                style={{ color: t.textMuted }}>
                {reference}
              </p>

              {/* Verses / chapters */}
              <div className="flex flex-col gap-2 mb-4">
                {todaySlice.map((item, i) => (
                  <div key={i}>
                    {item.verse != null && (
                      <span className="text-[11px] font-bold mr-1.5" style={{ color: '#5B4FCF' }}>
                        {item.verse}
                      </span>
                    )}
                    <span className="text-[15px] leading-relaxed" style={{ color: t.text }}>
                      {item.text || item.reference}
                    </span>
                  </div>
                ))}
              </div>

              {/* Go to Bible reader */}
              <button
                onClick={() => {
                  const first = todaySlice[0]
                  router.push(`/read?book=${encodeURIComponent(first.book)}&chapter=${first.chapter}`)
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold mb-4"
                style={{ background: t.bgMuted, color: t.textMuted }}
              >
                <BookOpen size={14} />
                Open in Bible reader
              </button>

              {/* MARK AS READ — prominent */}
              {todayDone ? (
                <div
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-[16px]"
                  style={{ background: '#E8F4ED' }}
                >
                  <CheckCircle2 size={20} style={{ color: '#4A7C5F' }} />
                  <span className="font-bold text-[15px]" style={{ color: '#4A7C5F' }}>
                    Done for today
                  </span>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleMarkRead}
                  disabled={marking}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-[16px] text-white font-bold text-[16px] disabled:opacity-60 transition-all"
                  style={{ background: 'linear-gradient(135deg,#4A7C5F,#3A6B4F)' }}
                >
                  {marking
                    ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
                    : <><CheckCircle2 size={20} /> Mark as Read</>
                  }
                </motion.button>
              )}

              {/* View full plan */}
              <button
                onClick={() => router.push(`/plans/${activePlan.planId}`)}
                className="w-full flex items-center justify-center gap-1 mt-3 py-1.5 text-[12px] font-semibold"
                style={{ color: t.textFaint }}
              >
                View full plan <ChevronRight size={12} />
              </button>
            </motion.div>

          ) : (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold" style={{ color: t.text }}>
                  Day {activePlan.currentDay} — {reference}
                </p>
                <span className="text-[11px]" style={{ color: t.textFaint }}>
                  {noteSaved ? '✓ Saved' : 'Saving…'}
                </span>
              </div>

              <textarea
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Write your reflections, insights, or prayers for today's reading…"
                rows={6}
                className="w-full resize-none rounded-[14px] px-4 py-3 text-[14px] leading-relaxed focus:outline-none transition-all"
                style={{
                  background:   t.bgInput,
                  border:       `1.5px solid ${t.borderInput}`,
                  color:        t.text,
                }}
              />

              <p className="text-[11px]" style={{ color: t.textFaint }}>
                Notes are saved privately on this device and synced to your account.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function GuestCard({ t, router }) {
  return (
    <div className="mx-4 rounded-[22px] overflow-hidden px-5 py-6"
      style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
      <p className="font-bold text-[18px] text-white mb-1">Start your daily walk</p>
      <p className="text-white/70 text-[14px] mb-4">
        Sign in to track your Bible reading and build a daily habit.
      </p>
      <button
        onClick={() => router.push('/auth')}
        className="px-5 py-2.5 rounded-full bg-white font-bold text-[14px]"
        style={{ color: '#5B4FCF' }}>
        Get started
      </button>
    </div>
  )
}

function NoPlanCard({ t, router }) {
  return (
    <div className="mx-4 rounded-[22px] px-5 py-6 flex flex-col gap-3"
      style={{ background: t.bgCard, border: `1.5px dashed ${t.border}` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
        style={{ background: '#EDE9FF' }}>
        <BookOpen size={20} style={{ color: '#5B4FCF' }} />
      </div>
      <div>
        <p className="font-bold text-[16px] mb-0.5" style={{ color: t.text }}>
          No active reading plan
        </p>
        <p className="text-[13px]" style={{ color: t.textMuted }}>
          Pick a plan and start building your daily reading habit.
        </p>
      </div>
      <button
        onClick={() => router.push('/plans')}
        className="self-start px-4 py-2.5 rounded-full text-white font-bold text-[13px]"
        style={{ background: '#5B4FCF' }}>
        Browse plans →
      </button>
    </div>
  )
}