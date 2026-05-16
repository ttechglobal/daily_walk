'use client'

// ── src/app/plans/page.js ──
// Active plan: tappable card opens today's reading in Bible reader.
// Showcase: colour + icon cards, NO images.
// Dark mode: full support via useDarkMode().
// Bottom padding: clears nav bar globally.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Layers, Users, ChevronRight,
  CheckCircle2, MoreVertical, Trash2, ArrowRight,
  Calendar, Gauge, Plus, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { ToastContainer, showToast } from '../../components/Toast'
import {
  readPlans, writePlans, getPlanProgress,
  advanceAllPlans, isPlanCompletedToday, markDayComplete,
} from '../../lib/plans'
import { todayStr } from '../../lib/constants'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'

// ─────────────────────────────────────────────
//  Helper — build Bible reader URL from passage string
// ─────────────────────────────────────────────
function buildReaderUrl(passage) {
  if (!passage) return '/read'
  // Parse "Book Chapter:Verse" or "Book Chapter"
  const match = passage.match(/^(.+?)\s+(\d+)(?::(\d+))?$/)
  if (!match) return `/read?book=${encodeURIComponent(passage)}`
  const [, book, chapter] = match
  return `/read?book=${encodeURIComponent(book.trim())}&chapter=${chapter}`
}

// ─────────────────────────────────────────────
//  Showcase data — colour + icon, NO images
// ─────────────────────────────────────────────
const SHOWCASE = [
  { name:"New Believer's Start", desc:'30 days of foundation for new Christians',    duration:30, icon:'🌱', color:'#4A7C5F', type:'topic'  },
  { name:'Peace Over Anxiety',   desc:'Replace fear with biblical peace',            duration:30, icon:'🕊️', color:'#7CB9E8', type:'topic'  },
  { name:'Gospel of John',       desc:'21 days through the life of Jesus',           duration:21, icon:'📗', color:'#5B4FCF', type:'book'   },
  { name:'Life of David',        desc:'A warrior, worshipper, man after God\'s heart',duration:40,icon:'👑', color:'#E8A838', type:'character'},
  { name:'Psalms & Worship',     desc:'A 21-day journey through praise and lament',  duration:21, icon:'🎶', color:'#C77DFF', type:'topic'  },
]

const TYPE_COLORS = {
  book:      { bg:'#EDE9FF', color:'#5B4FCF', label:'Book'      },
  topic:     { bg:'#E8F4ED', color:'#4A7C5F', label:'Topic'     },
  character: { bg:'#FFF4DC', color:'#B07000', label:'Character' },
}

// ─────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────
function ProgressBar({ pct, c }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{background: c.bgMuted}}>
      <motion.div className="h-full rounded-full" style={{background:'#5B4FCF'}}
        initial={{width:0}} animate={{width:`${Math.min(100,pct)}%`}}
        transition={{duration:0.7,ease:'easeOut'}}/>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Active plan card
// ─────────────────────────────────────────────
function ActivePlanCard({ plan, idx, c, dark, onMarkDone, onDelete }) {
  const router = useRouter()
  const [menu, setMenu] = useState(false)

  const pct       = getPlanProgress(plan)
  const today     = todayStr()
  const todayDay  = plan.days?.find(d => d.day === plan.currentDay)
  const todayDone = todayDay?.completedAt?.startsWith(today)
  const typeStyle = TYPE_COLORS[plan.type] || TYPE_COLORS.book

  const dayUrl    = `/plans/${plan.id}/day/${plan.currentDay}`

  function handleCardTap() {
    router.push(dayUrl)
  }

  function handleReadPassage(e) {
    e.stopPropagation()
    if (todayDay?.passage) {
      router.push(buildReaderUrl(todayDay.passage))
    }
  }

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay: idx*0.06}}
      className="rounded-[22px] overflow-hidden relative"
      style={{background: c.bgCard, boxShadow: c.shadowHeavy}}>

      {/* Colour top strip */}
      <div className="h-1.5" style={{background:'linear-gradient(90deg,#5B4FCF,#7C6FCD)'}}/>

      <div className="px-5 pt-4 pb-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[16px]" style={{color: c.text}}>{plan.name}</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{background: dark ? typeStyle.color + '22' : typeStyle.bg, color: typeStyle.color}}>
                {typeStyle.label}
              </span>
            </div>
            <p className="text-[12px] mt-0.5" style={{color: c.textMuted}}>
              Day {plan.currentDay} of {plan.totalDays} · {plan.pace}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={(e) => {e.stopPropagation(); setMenu(m=>!m)}}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{background: c.bgMuted}}>
              <MoreVertical size={15} style={{color: c.textMuted}}/>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{opacity:0,scale:0.92,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:-4}}
                  className="absolute right-0 top-10 rounded-[14px] z-20 py-1 min-w-[160px]"
                  style={{background: c.bgCard, boxShadow: c.shadowHeavy}}>
                  <button onClick={e=>{e.stopPropagation();setMenu(false);onDelete(plan.id)}}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[14px] font-semibold text-red-500">
                    <Trash2 size={14}/> Delete plan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[12px] font-semibold" style={{color: c.textMuted}}>Progress</span>
            <span className="text-[12px] font-bold" style={{color:'#5B4FCF'}}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} c={c}/>
        </div>

        {/* Today's passage — tappable block */}
        {todayDay && (
          <button onClick={handleCardTap}
            className="w-full px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98] mb-3"
            style={{background: c.bgCardAlt, border:`1.5px solid ${c.border}`}}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{color: c.textFaint}}>
                  Today — Day {plan.currentDay}
                </p>
                <p className="font-bold text-[15px]" style={{color:'#5B4FCF'}}>{todayDay.passage}</p>
                {todayDay.title && <p className="text-[12px] mt-0.5" style={{color: c.textMuted}}>{todayDay.title}</p>}
              </div>
              <div className="flex-shrink-0 ml-3">
                {todayDone
                  ? <CheckCircle2 size={20} style={{color:'#4A7C5F'}}/>
                  : <ChevronRight size={18} style={{color: c.textFaint}}/>
                }
              </div>
            </div>
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={handleCardTap}
            className="flex-1 py-3 rounded-full font-bold text-[13px] text-white transition-all active:scale-95"
            style={{background: todayDone ? '#4A7C5F' : '#5B4FCF'}}>
            {todayDone ? '✓ Review today →' : "Open today's reading →"}
          </button>
          {todayDay?.passage && !todayDone && (
            <button onClick={handleReadPassage}
              className="flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-[13px] transition-all active:scale-95"
              style={{background: c.bgCardAlt, color:'#5B4FCF'}}>
              <ExternalLink size={13}/> Read
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Showcase card — colour + icon, NO images
// ─────────────────────────────────────────────
function ShowcaseCard({ plan, c, dark, onTap }) {
  return (
    <motion.button whileTap={{scale:0.96}} onClick={() => onTap(plan)}
      className="flex-shrink-0 w-[172px] rounded-[18px] overflow-hidden text-left"
      style={{background: c.bgCard, boxShadow: c.shadow}}>
      {/* Colour header */}
      <div className="h-[84px] flex flex-col justify-between px-4 pt-4 pb-3 relative"
        style={{background:`linear-gradient(135deg,${plan.color},${plan.color}BB)`}}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',backgroundSize:'18px 18px'}}/>
        <span className="text-[30px] relative z-10">{plan.icon}</span>
        <span className="relative z-10 text-[10px] font-bold text-white/85 bg-white/20 px-2 py-0.5 rounded-full w-fit">
          {plan.duration} days
        </span>
      </div>
      {/* Body */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="font-bold text-[13px] leading-snug" style={{color: c.text}}>{plan.name}</p>
        <p className="text-[11px] mt-1 line-clamp-2 leading-relaxed" style={{color: c.textMuted}}>{plan.desc}</p>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Create row
// ─────────────────────────────────────────────
function CreateRow({ icon: Icon, title, desc, href, color, c }) {
  const router = useRouter()
  return (
    <motion.button whileTap={{scale:0.97}} onClick={() => router.push(href)}
      className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left w-full"
      style={{background: c.bgCard, boxShadow: c.shadow}}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{background:`${color}20`}}>
        <Icon size={20} style={{color}}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px]" style={{color: c.text}}>{title}</p>
        <p className="text-[12px] mt-0.5" style={{color: c.textMuted}}>{desc}</p>
      </div>
      <ChevronRight size={16} style={{color: c.textFaint, flexShrink:0}}/>
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function PlansPage() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [plans,    setPlans]    = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    advanceAllPlans()
    setPlans(readPlans())
    setHydrated(true)
  }, [])

  const activePlans    = plans.filter(p => p.status === 'active')
  const completedPlans = plans.filter(p => p.status === 'completed')

  function handleDelete(planId) {
    const updated = plans.map(p => p.id === planId ? {...p, status:'archived'} : p)
    writePlans(updated); setPlans(updated); showToast('Plan removed')
  }

  function handleMarkDone(planId, dayNum) {
    markDayComplete(planId, dayNum, '')
    setPlans(readPlans())
    showToast('Day complete! 🙌')
  }

  function handleShowcaseTap(plan) {
    router.push(`/plans/create?type=${plan.type}`)
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col" style={{minHeight:'100dvh', background: c.bg}}>
      <ToastContainer/>

      {/* ── Fixed header ── */}
      <header className="flex-shrink-0 px-5 pt-6 pb-4 border-b"
        style={{background: c.bg, borderColor: c.border, position:'sticky', top:0, zIndex:40}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-[24px]" style={{color: c.text}}>Reading Plans</h1>
            <p className="text-[13px] mt-0.5" style={{color: c.textMuted}}>
              {activePlans.length > 0
                ? `${activePlans.length} active plan${activePlans.length>1?'s':''}`
                : 'Build your daily reading habit'}
            </p>
          </div>
          <Link href="/plans/create"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold border-2 transition-all"
            style={{borderColor:'#5B4FCF',color:'#5B4FCF'}}>
            <Plus size={13}/> New Plan
          </Link>
        </div>
      </header>

      {/* ── Scrollable content — pb-28 clears bottom nav ── */}
      <div className="flex-1 overflow-y-auto" style={{paddingBottom:112}}>

        {/* Active plans */}
        {activePlans.length > 0 && (
          <div className="px-4 mt-5 flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{color: c.textFaint}}>Active</p>
            {activePlans.map((plan, i) => (
              <ActivePlanCard key={plan.id} plan={plan} idx={i} c={c} dark={dark}
                onMarkDone={handleMarkDone} onDelete={handleDelete}/>
            ))}
          </div>
        )}

        {/* Showcase */}
        <div className="mt-7">
          <div className="flex items-center justify-between px-4 mb-3">
            <div>
              <p className="font-bold text-[16px]" style={{color: c.text}}>
                {activePlans.length > 0 ? 'More plans to explore' : "What's possible"}
              </p>
              <p className="text-[12px] mt-0.5" style={{color: c.textMuted}}>
                Plans already built into the app
              </p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scroll-hide">
            {SHOWCASE.map((plan, i) => (
              <motion.div key={i} initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}>
                <ShowcaseCard plan={plan} c={c} dark={dark} onTap={handleShowcaseTap}/>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Create your plan */}
        <div className="px-4 mt-7">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{color: c.textFaint}}>Create a plan</p>
          <div className="flex flex-col gap-2.5">
            <CreateRow icon={BookOpen} title="Read a Bible Book"
              desc="Pick any book and read at your own pace"
              href="/plans/create?type=book" color="#5B4FCF" c={c}/>
            <CreateRow icon={Layers} title="Study a Topic"
              desc="30-day curated plans on faith, peace, and identity"
              href="/plans/create?type=topic" color="#4A7C5F" c={c}/>
            <CreateRow icon={Users} title="Study a Character"
              desc="Walk through a Bible figure's life day by day"
              href="/plans/create?type=character" color="#E8A838" c={c}/>
          </div>
        </div>

        {/* Completed */}
        {completedPlans.length > 0 && (
          <div className="px-4 mt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{color: c.textFaint}}>Completed</p>
            <div className="flex flex-col gap-2">
              {completedPlans.map(plan => (
                <div key={plan.id} className="rounded-[16px] px-4 py-3.5 flex items-center gap-3"
                  style={{background: c.bgCard, boxShadow: c.shadow}}>
                  <CheckCircle2 size={18} style={{color:'#4A7C5F',flexShrink:0}}/>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate" style={{color: c.text}}>{plan.name}</p>
                    <p className="text-[12px]" style={{color: c.textMuted}}>Completed · {plan.totalDays} days</p>
                  </div>
                  <span className="text-[18px]">🏆</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}