'use client'

// ── /plans — My Plans page (Part 2) ──

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BookOpen, Search, Users, Map,
  MoreVertical, Gauge, BookMarked, ChevronRight, Trash2, RotateCcw
} from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { useCheckin as _useCheckin } from '../../hooks/useCheckin'
import { getPlanProgress, fmtDate, markDayComplete, writePlans, readPlans } from '../../lib/plans'
import { todayStr } from '../../lib/constants'

const TYPE_STYLES = {
  book:      { bg: '#EDE9FF', color: '#5B4FCF', label: 'Book'      },
  topic:     { bg: '#E8F4ED', color: '#4A7C5F', label: 'Topic'     },
  character: { bg: '#FFF4DC', color: '#B07000', label: 'Character' },
}

function TypeBadge({ type }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.book
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ProgressBar({ pct }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E5E0' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: '#5B4FCF' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  )
}

// ── Active plan card ──
function ActivePlanCard({ plan, onMarkDone, onDelete, idx }) {
  const router   = useRouter()
  const [menu, setMenu] = useState(false)
  const pct      = getPlanProgress(plan)
  const today    = todayStr()
  const todayDay = plan.days?.[plan.currentDay - 1]
  const todayDone = todayDay?.completedAt?.startsWith(today)

  function handleMarkDone() {
    onMarkDone(plan.id, plan.currentDay)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="bg-white rounded-[20px] overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-[16px] leading-snug" style={{ color: '#1A1A2E' }}>
              {plan.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TypeBadge type={plan.type} />
            <button onClick={() => setMenu(v => !v)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: '#9CA3AF' }}>
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold" style={{ color: '#6B7280' }}>
            Day {plan.currentDay} of {plan.totalDays}
          </span>
          <span className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} />

        {/* Pace */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <Gauge size={12} style={{ color: '#9CA3AF' }} />
          <span className="text-[12px]" style={{ color: '#6B7280' }}>{plan.pace}</span>
          <button className="text-[12px] font-bold underline underline-offset-1 ml-1" style={{ color: '#5B4FCF' }}
            onClick={() => showToast('Pace adjustment coming soon')}>
            Adjust
          </button>
        </div>

        {/* Today's passage */}
        {todayDay && (
          <button
            onClick={() => router.push(`/plans/${plan.id}/day/${plan.currentDay}`)}
            className="w-full mt-3 flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors"
            style={{ background: '#FAF8F5' }}
          >
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Today</p>
              <p className="text-[14px] font-bold" style={{ color: '#5B4FCF' }}>{todayDay.passage}</p>
              {todayDay.title && <p className="text-[12px]" style={{ color: '#6B7280' }}>{todayDay.title}</p>}
            </div>
            <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-5 py-4">
        {todayDone ? (
          <div className="flex-1 flex items-center justify-center py-3 rounded-pill text-[13px] font-bold" style={{ background: '#E8F4ED', color: '#4A7C5F' }}>
            Completed today ✓
          </div>
        ) : (
          <button onClick={handleMarkDone}
            className="flex-1 py-3 rounded-pill text-[13px] font-bold text-white transition-all active:scale-[0.97]"
            style={{ background: '#4A7C5F' }}>
            Done for today ✓
          </button>
        )}
        <button
          onClick={() => router.push(`/plans/${plan.id}/day/${plan.currentDay}`)}
          className="flex-1 py-3 rounded-pill text-[13px] font-bold border-2 transition-all active:scale-[0.97]"
          style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}>
          Open reader →
        </button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-8 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden min-w-[160px]"
          >
            {[
              { label: 'Pause plan',   onClick: () => { showToast('Plan paused'); setMenu(false) } },
              { label: 'Adjust pace',  onClick: () => { showToast('Pace adjustment coming soon'); setMenu(false) } },
              { label: 'Delete plan',  onClick: () => { onDelete(plan.id); setMenu(false) }, red: true },
            ].map((item, i) => (
              <button key={i} onClick={item.onClick}
                className={`w-full text-left px-4 py-3 text-[13px] font-semibold hover:bg-gray-50 transition-colors ${i < 2 ? 'border-b border-gray-100' : ''}`}
                style={{ color: item.red ? '#EF4444' : '#1A1A2E' }}>
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Completed plan card ──
function CompletedPlanCard({ plan, onRestart, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="bg-white rounded-[20px] p-5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', opacity: 0.85 }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-display font-semibold text-[16px]" style={{ color: '#6B7280' }}>{plan.name}</p>
        <TypeBadge type={plan.type} />
      </div>
      <p className="text-[12px] mb-3" style={{ color: '#9CA3AF' }}>
        Completed {fmtDate(plan.days.find(d => d.completedAt)?.completedAt || plan.createdAt)}
      </p>
      <ProgressBar pct={100} />
      <button onClick={() => onRestart(plan.id)}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-pill border-2 text-[13px] font-bold transition-all active:scale-[0.97]"
        style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}>
        <RotateCcw size={14} /> Start again
      </button>
    </motion.div>
  )
}

// ── Empty state ──
function EmptyState() {
  const router = useRouter()
  const options = [
    { icon: BookOpen, label: 'Book',      sub: 'Read any Bible book',    type: 'book'      },
    { icon: Search,   label: 'Topic',     sub: 'Search any theme',       type: 'topic'     },
    { icon: Users,    label: 'Character', sub: 'Study a Bible figure',   type: 'character' },
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 py-10 px-2">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#EDE9FF' }}>
        <Map size={28} style={{ color: '#5B4FCF' }} />
      </div>
      <div className="text-center">
        <p className="font-display text-[18px] font-semibold" style={{ color: '#1A1A2E' }}>No active plans</p>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: '#6B7280' }}>
          Choose how you want to read — a book, a topic, or a Bible character
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 w-full">
        {options.map(opt => (
          <button
            key={opt.type}
            onClick={() => router.push(`/plans/create?type=${opt.type}`)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-[16px] transition-all active:scale-[0.97] hover:shadow-md"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#EDE9FF' }}>
              <opt.icon size={20} style={{ color: '#5B4FCF' }} />
            </div>
            <p className="font-bold text-[13px]" style={{ color: '#1A1A2E' }}>{opt.label}</p>
            <p className="text-[11px] text-center leading-snug" style={{ color: '#6B7280' }}>{opt.sub}</p>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default function PlansPage() {
  const [tab, setTab]       = useState('active')
  const [plans, setPlans]   = useLocalStorage('dw_plans', [])
  const [, , hydrated]      = useLocalStorage('dw_plans', [])
  const { performCheckin, isCheckedInToday } = _useCheckin()

  function handleMarkDone(planId, dayNumber) {
    markDayComplete(planId, dayNumber, '')
    setPlans(readPlans())
    if (!isCheckedInToday) performCheckin({ passage: '', reflection: '' })
    showToast('Day complete!')
  }

  function handleDelete(planId) {
    if (!confirm('Delete this plan?')) return
    const updated = (plans || []).filter(p => p.id !== planId)
    setPlans(updated)
    showToast('Plan deleted')
  }

  function handleRestart(planId) {
    const updated = (plans || []).map(p => {
      if (p.id !== planId) return p
      return {
        ...p,
        status: 'active',
        currentDay: 1,
        days: p.days.map(d => ({ ...d, completedAt: null, reflection: '' })),
      }
    })
    setPlans(updated)
    showToast('Plan restarted!')
  }

  if (!hydrated) return null

  const active    = (plans || []).filter(p => p.status === 'active')
  const completed = (plans || []).filter(p => p.status === 'completed')

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#FAF8F5' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold" style={{ color: '#1A1A2E' }}>My Plans</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>Your personal Bible study, your pace</p>
        </div>
        <Link href="/plans/create"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold border-2 transition-all hover:opacity-80"
          style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}>
          <Plus size={13} /> New Plan
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{ background: '#EDE9FF' }}>
          {[{ key: 'active', label: 'Active' }, { key: 'completed', label: 'Completed' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
              style={tab === t.key ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
              {tab === t.key && (
                <motion.div layoutId="plans-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-4 px-4 py-4 pb-28 relative">
            {active.length === 0 ? (
              <EmptyState />
            ) : (
              active.map((plan, i) => (
                <ActivePlanCard key={plan.id} plan={plan} idx={i}
                  onMarkDone={handleMarkDone} onDelete={handleDelete} />
              ))
            )}
          </motion.div>
        )}
        {tab === 'completed' && (
          <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-4 px-4 py-4 pb-28">
            {completed.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center py-12">
                <BookMarked size={36} style={{ color: '#E8E5E0' }} />
                <p className="font-display text-[17px] font-semibold" style={{ color: '#1A1A2E' }}>No completed plans yet</p>
                <p className="text-[13px]" style={{ color: '#6B7280' }}>Keep going!</p>
              </div>
            ) : (
              completed.map((plan, i) => (
                <CompletedPlanCard key={plan.id} plan={plan} idx={i} onRestart={handleRestart} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}