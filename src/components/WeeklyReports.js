'use client'

// ── src/components/WeeklyReport.js ──
// Weekly reading report shown as a bottom sheet.
// Data sources: checkins (localStorage / Supabase), streak, active plans.
//
// Props:
//   isOpen    — boolean
//   checkins  — array of { date: 'YYYY-MM-DD', passage?: string }
//   streak    — { current: number, longest: number }
//   plans     — array of active local plan objects
//   onClose   — () => void

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, BookOpen, TrendingUp, Calendar } from 'lucide-react'
import { useTheme } from '../lib/theme'

// ─────────────────────────────────────────────
//  Date helpers
// ─────────────────────────────────────────────
function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toDateStr(d))
  }
  return days
}

function getLast4Weeks() {
  const weeks = []
  for (let w = 3; w >= 0; w--) {
    const week = []
    for (let d = 6; d >= 0; d--) {
      const date = new Date()
      date.setDate(date.getDate() - (w * 7 + d))
      week.push(toDateStr(date))
    }
    week.reverse()
    weeks.push(week)
  }
  return weeks
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return ['S','M','T','W','T','F','S'][d.getDay()]
}

function weekLabel(weekDates) {
  const first = new Date(weekDates[0] + 'T12:00:00')
  return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPlanProgress(plan) {
  if (!plan?.totalDays || plan.totalDays === 0) return 0
  return Math.min(100, Math.round(((plan.currentDay - 1) / plan.totalDays) * 100))
}

// ─────────────────────────────────────────────
//  7-day dot grid row
// ─────────────────────────────────────────────
function WeekDots({ days, checkinSet, dark, compact = false }) {
  const size = compact ? 28 : 36

  return (
    <div className="flex gap-1.5 justify-between">
      {days.map(dateStr => {
        const isRead  = checkinSet.has(dateStr)
        const isToday = dateStr === toDateStr(new Date())

        return (
          <div key={dateStr} className="flex flex-col items-center gap-1">
            <div
              style={{
                width: size, height: size,
                borderRadius: '50%',
                background: isRead
                  ? 'linear-gradient(135deg, #5B4FCF, #3D3190)'
                  : (dark ? '#1E2035' : '#F0EDE8'),
                border: isToday && !isRead
                  ? '2px solid #5B4FCF'
                  : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}
            >
              {isRead && (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {!compact && (
              <span style={{ fontSize: 10, color: dark ? '#50546A' : '#9CA3AF', fontWeight: isToday ? 700 : 400 }}>
                {dayLabel(dateStr)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
//  4-week heat grid
// ─────────────────────────────────────────────
function MonthGrid({ weeks, checkinSet, dark }) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Day labels */}
      <div className="flex gap-1.5 justify-between px-0">
        {['S','M','T','W','T','F','S'].map((l, i) => (
          <span key={i} style={{ width: 22, textAlign: 'center', fontSize: 10, color: dark ? '#50546A' : '#9CA3AF' }}>
            {l}
          </span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1.5 justify-between items-center">
          {week.map(dateStr => {
            const isRead = checkinSet.has(dateStr)
            return (
              <div
                key={dateStr}
                style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: isRead
                    ? '#5B4FCF'
                    : (dark ? '#1E2035' : '#F0EDE8'),
                  opacity: isRead ? 1 : 0.6,
                }}
              />
            )
          })}
        </div>
      ))}
      {/* Week labels */}
      <div className="flex justify-between mt-0.5">
        {weeks.map((week, wi) => (
          <span key={wi} style={{ fontSize: 9, color: dark ? '#50546A' : '#9CA3AF' }}>
            {weekLabel(week)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Stat card
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent, dark }) {
  return (
    <div
      className="flex-1 flex flex-col gap-1 px-4 py-3 rounded-[16px]"
      style={{ background: dark ? '#1E2035' : '#F8F7FF', border: `1px solid ${dark ? '#252840' : '#E8E4FF'}` }}
    >
      <Icon size={16} style={{ color: accent || '#5B4FCF' }} />
      <p className="font-bold text-[20px] leading-tight" style={{ color: dark ? '#EAE6DE' : '#1A1A2E' }}>
        {value}
      </p>
      <p className="text-[11px] font-semibold" style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}>
        {label}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function WeeklyReport({ isOpen, checkins, streak, plans, onClose }) {
  const { t, dark } = useTheme()

  const checkinSet = useMemo(() => {
    const s = new Set()
    ;(checkins || []).forEach(c => {
      const d = c.date || c.checked_in_date || c.createdAt?.split('T')[0]
      if (d) s.add(d)
    })
    return s
  }, [checkins])

  const last7   = useMemo(() => getLast7Days(), [])
  const last4w  = useMemo(() => getLast4Weeks(), [])

  const daysThisWeek = last7.filter(d => checkinSet.has(d)).length
  const totalDays    = checkinSet.size

  const activePlans = (plans || []).filter(p => p.status === 'active')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140]"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="report-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[145] rounded-t-[28px] flex flex-col"
            style={{
              maxHeight: '88dvh',
              background: dark ? '#1C1C2A' : '#FFFFFF',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: dark ? '#252840' : '#E5E7EB' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <div>
                <p className="font-bold text-[18px]" style={{ color: dark ? '#EAE6DE' : '#1A1A2E' }}>
                  Weekly report
                </p>
                <p className="text-[12px]" style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}>
                  Your reading over the last 7 days
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: dark ? '#252840' : '#F0EDE8' }}
              >
                <X size={15} style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-5">

              {/* This week's dots */}
              <div className="rounded-[20px] p-4" style={{ background: dark ? '#1E1A3C' : '#F8F7FF', border: `1px solid ${dark ? '#2E2860' : '#E8E4FF'}` }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#5B4FCF' }}>
                  This week
                </p>
                <WeekDots days={last7} checkinSet={checkinSet} dark={dark} />
                <p className="mt-3 text-[13px] font-semibold" style={{ color: dark ? '#8A8FA8' : '#6B7280' }}>
                  {daysThisWeek === 7
                    ? '🔥 Perfect week — every single day!'
                    : daysThisWeek === 0
                    ? 'Start today — the week isn\'t over yet.'
                    : `${daysThisWeek} of 7 days read`}
                </p>
              </div>

              {/* Stat row */}
              <div className="flex gap-3">
                <StatCard
                  icon={Flame}
                  label="Current streak"
                  value={`${streak?.current || 0}d`}
                  accent="#E8A838"
                  dark={dark}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Best streak"
                  value={`${streak?.longest || 0}d`}
                  accent="#5B4FCF"
                  dark={dark}
                />
                <StatCard
                  icon={Calendar}
                  label="Total days"
                  value={totalDays}
                  accent="#4A7C5F"
                  dark={dark}
                />
              </div>

              {/* 4-week grid */}
              <div className="rounded-[20px] p-4" style={{ background: dark ? '#1A1A2E' : '#FAFAFA', border: `1px solid ${dark ? '#252840' : '#F0EDE8'}` }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}>
                  Last 4 weeks
                </p>
                <MonthGrid weeks={last4w} checkinSet={checkinSet} dark={dark} />
              </div>

              {/* Active plans progress */}
              {activePlans.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}>
                    Active plans
                  </p>
                  <div className="flex flex-col gap-2">
                    {activePlans.map(plan => {
                      const pct = getPlanProgress(plan)
                      return (
                        <div
                          key={plan.id}
                          className="rounded-[16px] p-4 flex items-center gap-3"
                          style={{ background: dark ? '#1A1A2E' : '#FFFFFF', border: `1px solid ${dark ? '#252840' : '#F0EDE8'}` }}
                        >
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                            style={{ background: dark ? '#2A244A' : '#EDE9FF' }}>
                            <BookOpen size={15} style={{ color: '#5B4FCF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[13px] truncate" style={{ color: dark ? '#EAE6DE' : '#1A1A2E' }}>
                              {plan.name}
                            </p>
                            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: dark ? '#252840' : '#F0EDE8' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5B4FCF, #3D3190)', transition: 'width 0.5s ease' }}
                              />
                            </div>
                            <p className="mt-1 text-[11px]" style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}>
                              Day {plan.currentDay} of {plan.totalDays} — {pct}%
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Grace note */}
              <p className="text-center text-[12px] leading-relaxed" style={{ color: dark ? '#50546A' : '#9CA3AF' }}>
                Every day you open the Word is a win. Keep walking.
              </p>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}