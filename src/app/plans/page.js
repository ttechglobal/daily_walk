'use client'

// ── src/app/plans/page.js ──

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Layers, Users, ChevronRight,
  CheckCircle2, MoreVertical, Trash2,
  Plus, Share2,
} from 'lucide-react'
import Link from 'next/link'
import { ToastContainer, showToast } from '../../components/Toast'
import {
  readPlans, writePlans, getPlanProgress,
  advanceAllPlans, markDayComplete,
} from '../../lib/plans'
import { todayStr } from '../../lib/constants'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'

// ─────────────────────────────────────────────
//  Share plan — inline URL build, no require()
// ─────────────────────────────────────────────
async function sharePlan(plan) {
  // Build URL inline — avoids require() crash in client components
  const origin  = typeof window !== 'undefined' ? window.location.origin : ''
  const slug    = (plan.name || 'plan')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24)
  const shortId = (plan.id || '').slice(-8)
  const url     = `${origin}/plan/${slug}-${shortId}`

  // Store preview snapshot for landing page
  try {
    const preview = {
      name:    plan.name,
      desc:    plan.description || '',
      days:    plan.totalDays,
      type:    plan.type || 'topic',
      preview: (plan.days || []).slice(0, 3).map(d => ({
        day: d.day, passage: d.passage, title: d.title, focus: d.focus || '',
      })),
    }
    localStorage.setItem(`dw_plan_share_${shortId}`, JSON.stringify(preview))
  } catch {}

  const text = `I'm reading "${plan.name}" on Daily Walk. Join me and let's grow together in the Word! 📖`

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: plan.name, text, url })
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard!')
    }
  } catch {
    // User cancelled — silent
  }
}

const SHOWCASE = [
  { name: "New Believer's Start", desc: '30 days of foundation for new Christians',     duration: 30, icon: '🌱', color: '#4A7C5F', type: 'topic'    },
  { name: 'Peace Over Anxiety',   desc: 'Replace fear with biblical peace',             duration: 30, icon: '🕊️', color: '#7CB9E8', type: 'topic'    },
  { name: 'Gospel of John',       desc: '21 days through the life of Jesus',            duration: 21, icon: '📗', color: '#5B4FCF', type: 'book'     },
  { name: 'Life of David',        desc: "A warrior, worshipper, man after God's heart", duration: 40, icon: '👑', color: '#E8A838', type: 'character' },
  { name: 'Psalms & Worship',     desc: 'A 21-day journey through praise and lament',   duration: 21, icon: '🎶', color: '#C77DFF', type: 'topic'    },
]

const TYPE_COLORS = {
  book:      { bg: '#EDE9FF', color: '#5B4FCF', label: 'Book'      },
  topic:     { bg: '#E8F4ED', color: '#4A7C5F', label: 'Topic'     },
  character: { bg: '#FFF4DC', color: '#B07000', label: 'Character' },
}

function ProgressBar({ pct, c }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: c.bgMuted }}>
      <motion.div className="h-full rounded-full" style={{ background: '#5B4FCF' }}
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }} />
    </div>
  )
}

function ActivePlanCard({ plan, idx, c, dark, onDelete }) {
  const router = useRouter()
  const [menu, setMenu] = useState(false)

  const pct       = getPlanProgress(plan)
  const today     = todayStr()
  const todayDay  = plan.days?.find(d => d.day === plan.currentDay)
  const todayDone = todayDay?.completedAt?.startsWith(today)
  const typeStyle = TYPE_COLORS[plan.type] || TYPE_COLORS.book
  const dayUrl    = `/plans/${plan.id}/day/${plan.currentDay}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="rounded-[22px] overflow-hidden"
      style={{ background: c.bgCard, boxShadow: c.shadowHeavy }}
    >
      <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#5B4FCF,#7C6FCD)' }} />

      <div className="px-4 pt-4 pb-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-bold text-[16px] truncate" style={{ color: c.text }}>{plan.name}</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: dark ? typeStyle.color + '22' : typeStyle.bg, color: typeStyle.color }}>
                {typeStyle.label}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: c.textMuted }}>
              Day {plan.currentDay} of {plan.totalDays} · {plan.pace}
            </p>
          </div>
          {/* 3-dot menu */}
          <div className="relative flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: c.bgMuted }}>
              <MoreVertical size={15} style={{ color: c.textMuted }} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  className="absolute right-0 top-10 rounded-[14px] z-20 py-1"
                  style={{ minWidth: 170, background: c.bgCard, boxShadow: c.shadowHeavy }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenu(false); sharePlan(plan) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[14px] font-semibold"
                    style={{ color: c.text }}>
                    <Share2 size={14} style={{ color: '#5B4FCF' }} /> Share Plan
                  </button>
                  <div style={{ height: 1, background: c.border, marginLeft: 16, marginRight: 16 }} />
                  <button
                    onClick={e => { e.stopPropagation(); setMenu(false); onDelete(plan.id) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[14px] font-semibold text-red-500">
                    <Trash2 size={14} /> Delete plan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[12px] font-semibold" style={{ color: c.textMuted }}>Progress</span>
            <span className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} c={c} />
        </div>

        {/* Today's passage */}
        {todayDay && (
          <button onClick={() => router.push(dayUrl)}
            className="w-full px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98] mb-3"
            style={{ background: c.bgCardAlt, border: `1.5px solid ${c.border}` }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: c.textFaint }}>
                  Today — Day {plan.currentDay}
                </p>
                <p className="font-bold text-[15px] truncate" style={{ color: '#5B4FCF' }}>{todayDay.passage}</p>
                {todayDay.title && (
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: c.textMuted }}>{todayDay.title}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {todayDone
                  ? <CheckCircle2 size={20} style={{ color: '#4A7C5F' }} />
                  : <ChevronRight size={18} style={{ color: c.textFaint }} />
                }
              </div>
            </div>
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={() => router.push(dayUrl)}
            className="flex-1 py-3 rounded-full font-bold text-[13px] text-white transition-all active:scale-95 truncate"
            style={{ background: todayDone ? '#4A7C5F' : '#5B4FCF' }}>
            {todayDone ? '✓ Review today' : "Open today's reading →"}
          </button>
          <button
            onClick={() => sharePlan(plan)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-[13px] transition-all active:scale-95 flex-shrink-0"
            style={{ background: c.bgCardAlt, color: '#5B4FCF' }}>
            <Share2 size={13} /> Share
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function ShowcaseCard({ plan, c, onTap }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={() => onTap(plan)}
      className="flex-shrink-0 rounded-[18px] overflow-hidden text-left"
      style={{ width: 156, background: c.bgCard, boxShadow: c.shadow }}>
      <div className="h-[80px] flex flex-col justify-between px-3 pt-3 pb-2.5 relative"
        style={{ background: `linear-gradient(135deg,${plan.color},${plan.color}BB)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <span className="text-[28px] relative z-10">{plan.icon}</span>
        <span className="relative z-10 text-[10px] font-bold text-white/85 bg-white/20 px-2 py-0.5 rounded-full w-fit">
          {plan.duration} days
        </span>
      </div>
      <div className="px-3 pt-2.5 pb-3">
        <p className="font-bold text-[12px] leading-snug line-clamp-2" style={{ color: c.text }}>{plan.name}</p>
        <p className="text-[11px] mt-1 line-clamp-2 leading-relaxed" style={{ color: c.textMuted }}>{plan.desc}</p>
      </div>
    </motion.button>
  )
}

function CreateRow({ icon: Icon, title, desc, href, color, c }) {
  const router = useRouter()
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push(href)}
      className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left w-full"
      style={{ background: c.bgCard, boxShadow: c.shadow }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate" style={{ color: c.text }}>{title}</p>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: c.textMuted }}>{desc}</p>
      </div>
      <ChevronRight size={16} style={{ color: c.textFaint, flexShrink: 0 }} />
    </motion.button>
  )
}

export default function PlansPage() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [plans, setPlans]       = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    advanceAllPlans()
    setPlans(readPlans())
    setHydrated(true)
  }, [])

  const activePlans    = plans.filter(p => p.status === 'active')
  const completedPlans = plans.filter(p => p.status === 'completed')

  function handleDelete(planId) {
    const updated = plans.map(p => p.id === planId ? { ...p, status: 'archived' } : p)
    writePlans(updated); setPlans(updated); showToast('Plan removed')
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: c.bg, overflowX: 'hidden', maxWidth: '100vw' }}>
      <ToastContainer />

      {/* Header */}
      <header
        className="flex-shrink-0 px-4 pt-6 pb-4 border-b"
        style={{ background: c.bg, borderColor: c.border, position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-[24px] truncate" style={{ color: c.text }}>Reading Plans</h1>
            <p className="text-[13px] mt-0.5" style={{ color: c.textMuted }}>
              {activePlans.length > 0
                ? `${activePlans.length} active plan${activePlans.length > 1 ? 's' : ''}`
                : 'Build your daily reading habit'}
            </p>
          </div>
          <Link href="/plans/create"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold border-2 flex-shrink-0"
            style={{ borderColor: '#5B4FCF', color: '#5B4FCF' }}>
            <Plus size={13} /> New
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 112 }}>

        {/* Active plans */}
        {activePlans.length > 0 && (
          <div className="px-4 mt-5 flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textFaint }}>Active</p>
            {activePlans.map((plan, i) => (
              <ActivePlanCard key={plan.id} plan={plan} idx={i} c={c} dark={dark} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Showcase carousel */}
        <div className="mt-7">
          <div className="px-4 mb-3">
            <p className="font-bold text-[16px]" style={{ color: c.text }}>
              {activePlans.length > 0 ? 'More plans to explore' : "What's possible"}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>Plans already built into the app</p>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {SHOWCASE.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <ShowcaseCard plan={plan} c={c} onTap={p => router.push(`/plans/create?type=${p.type}`)} />
              </motion.div>
            ))}
            <div className="flex-shrink-0 w-4" aria-hidden />
          </div>
        </div>

        {/* Create */}
        <div className="px-4 mt-7">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: c.textFaint }}>Create a plan</p>
          <div className="flex flex-col gap-2.5">
            <CreateRow icon={BookOpen} title="Read a Bible Book" desc="Pick any book and read at your own pace" href="/plans/create?type=book" color="#5B4FCF" c={c} />
            <CreateRow icon={Layers} title="Study a Topic" desc="30-day curated plans on faith, peace, and identity" href="/plans/create?type=topic" color="#4A7C5F" c={c} />
            <CreateRow icon={Users} title="Study a Character" desc="Walk through a Bible figure's life day by day" href="/plans/create?type=character" color="#E8A838" c={c} />
          </div>
        </div>

        {/* Completed */}
        {completedPlans.length > 0 && (
          <div className="px-4 mt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: c.textFaint }}>Completed</p>
            <div className="flex flex-col gap-2">
              {completedPlans.map(plan => (
                <div key={plan.id} className="rounded-[16px] px-4 py-3.5 flex items-center gap-3"
                  style={{ background: c.bgCard, boxShadow: c.shadow }}>
                  <CheckCircle2 size={18} style={{ color: '#4A7C5F', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate" style={{ color: c.text }}>{plan.name}</p>
                    <p className="text-[12px]" style={{ color: c.textMuted }}>Completed · {plan.totalDays} days</p>
                  </div>
                  <span className="text-[18px] flex-shrink-0">🏆</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}