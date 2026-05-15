'use client'
import React from 'react'

// ── Home screen — sticky header, single FAB, proper plan completion ──

import { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  UserCircle, BookMarked, X, CheckCircle2, Check,
  PenLine, Lightbulb
} from 'lucide-react'
import { BibleIcon } from '../components/icons/BibleIcon'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import CharacterCompanion from '../components/CharacterCompanion'
import { NotificationBell, NotificationPanel } from '../components/NotificationPanel'
import PostComposer from '../components/PostComposer'
import { getTodayVerseImage, getTodayVerse, initials, todayStr } from '../lib/constants'
import {
  getTodaysPlan, getPlanProgress, isPlanCompletedToday,
  markDayComplete, readPlans, advanceAllPlans
} from '../lib/plans'

function calcDaysMissed(last) {
  if (!last) return 7
  return Math.max(0, Math.floor((new Date(todayStr()).getTime() - new Date(last).getTime()) / 86_400_000))
}
function fmtToday() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
}

// ─────────────────────────────────────────────
//  Single consolidated FAB
// ─────────────────────────────────────────────
function HomeFAB({ onPost }) {
  const [open, setOpen]         = useState(false)
  const [nuggetOpen, setNugget] = useState(false)
  const [input, setInput]       = useState('')
  const [nuggets, setNuggets]   = useLocalStorage('dw_nuggets', [])

  function saveNugget() {
    const t = input.trim()
    if (!t) return
    setNuggets(prev => [{ id:`nug_${Date.now()}`, text:t, source:null, createdAt:new Date().toISOString() }, ...(prev||[])])
    showToast('Nugget saved!')
    setNugget(false); setInput(''); setOpen(false)
  }

  const actions = [
    {
      icon: PenLine, bg:'#EDE9FF', color:'#5B4FCF',
      label:'Write a post', sub:'Share with the world',
      action: () => { setOpen(false); setTimeout(onPost, 120) },
    },
    {
      icon: Lightbulb, bg:'#FFF4DC', color:'#E8A838',
      label:'Add a nugget', sub:'Save a personal insight',
      action: () => { setOpen(false); setTimeout(() => setNugget(true), 120) },
    },
  ]

  return (
    <>
      {/* Single purple FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-20 right-4 w-[52px] h-[52px] rounded-full text-white flex items-center justify-center z-40 active:scale-95 transition-all"
        style={{ background:'#5B4FCF', boxShadow:'0 4px 16px rgba(91,79,207,0.4)' }}
        aria-label="Quick actions">
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration:0.2 }}>
          <PenLine size={22} />
        </motion.div>
      </button>

      {/* Action sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 bg-black/30 z-[55]"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)} />
            <motion.div
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[28px] z-[56]"
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', stiffness:340, damping:36 }}>
              <div className="flex justify-center pt-3 mb-3">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="px-4 pb-10 flex flex-col gap-3">
                {actions.map((a, i) => (
                  <button key={i} onClick={a.action}
                    className="w-full flex items-center gap-4 p-4 rounded-[16px] text-left hover:bg-gray-50 active:scale-[0.98] transition-all"
                    style={{ border:'1.5px solid #F0EDE8' }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background:a.bg }}>
                      <a.icon size={20} style={{ color:a.color }} />
                    </div>
                    <div>
                      <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{a.label}</p>
                      <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>{a.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Nugget modal */}
      <AnimatePresence>
        {nuggetOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setNugget(false)} />
            <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-5 pb-10"
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', stiffness:340, damping:36 }}>
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={18} style={{ color:'#E8A838' }} />
                  <span className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Add a nugget</span>
                </div>
                <button onClick={() => setNugget(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
              </div>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Something that spoke to you..." rows={4} autoFocus
                className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 mb-3"
                style={{ color:'#1A1A2E' }} />
              <button onClick={saveNugget} disabled={!input.trim()}
                className="w-full text-white rounded-pill py-3.5 font-bold text-[14px] disabled:opacity-40"
                style={{ background:'#E8A838' }}>Save nugget</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────
//  Today's Reading card
// ─────────────────────────────────────────────
function TodaysReadingCard({ plans, setPlans, onCheckin }) {
  const router  = useRouter()
  const active  = (plans || []).filter(p => p.status === 'active')

  // Get plan to show (first uncompleted, or first completed today)
  const uncompleted = getTodaysPlan(active)
  const completedToday = active.find(p => isPlanCompletedToday(p))
  const todayPlan = uncompleted || completedToday

  const otherCount = active.filter(p => p.id !== todayPlan?.id).length

  if (!todayPlan) {
    return (
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
        className="bg-white rounded-card shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookMarked size={16} style={{ color:'#5B4FCF' }} />
            <span className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Today's Reading</span>
          </div>
          <Link href="/plans" className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>All Plans →</Link>
        </div>
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <BibleIcon size={32} />
          <p className="font-semibold text-[14px]" style={{ color:'#1A1A2E' }}>No active plans yet</p>
          <p className="text-[13px]" style={{ color:'#9CA3AF' }}>Start a reading plan to guide your daily study</p>
          <Link href="/plans" className="text-white px-5 py-2.5 rounded-pill text-[13px] font-bold mt-1"
            style={{ background:'#5B4FCF' }}>Browse Plans →</Link>
        </div>
      </motion.div>
    )
  }

  const todayDay   = todayPlan.days?.[todayPlan.currentDay - 1]
  const pct        = getPlanProgress(todayPlan)
  const isComplete = isPlanCompletedToday(todayPlan)
  const dayUrl     = `/plans/${todayPlan.id}/day/${todayPlan.currentDay}`

  function handleDone() {
    markDayComplete(todayPlan.id, todayPlan.currentDay, '')
    setPlans(readPlans())
    onCheckin(todayDay?.passage || '')
    showToast('Day complete!')
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
      {/* Entire card taps to open today's reading */}
      <button onClick={() => router.push(dayUrl)}
        className="w-full bg-white rounded-card shadow-card p-5 text-left cursor-pointer active:scale-[0.98] transition-all block"
        style={{ WebkitTapHighlightColor:'transparent' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookMarked size={16} style={{ color:'#5B4FCF' }} />
            <span className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Today's Reading</span>
          </div>
          <span className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>Open →</span>
        </div>

        <p className="font-display font-semibold text-[16px]" style={{ color:'#1A1A2E' }}>{todayPlan.name}</p>
        {todayDay && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-[13px]" style={{ color:'#6B7280' }}>
              Day {todayPlan.currentDay} · {todayDay.passage}
            </p>
            {/* Read Full Chapter — stops propagation so it doesn't trigger the plan card tap */}
            <span
              onClick={e => { e.stopPropagation(); router.push(buildReaderUrl(todayDay.passage)) }}
              className="text-[12px] font-bold cursor-pointer"
              style={{ color:'#5B4FCF' }}>
              Read Chapter →
            </span>
          </div>
        )}

      {/* Progress bar */}
      <div className="mt-3 mb-4">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
          <motion.div className="h-full rounded-full" style={{ background:'#5B4FCF' }}
            initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7 }} />
        </div>
      </div>

      {isComplete ? (
        /* ── Completed today — green success state ── */
        <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
          className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background:'#F0FDF4', borderColor:'#BBF7D0' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background:'#22C55E' }}>
              <Check size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-[14px]" style={{ color:'#15803D' }}>Done for today!</p>
              <p className="text-[12px]" style={{ color:'#16A34A' }}>
                {todayPlan.name} · Day {todayPlan.currentDay}
              </p>
            </div>
          </div>
          <p className="text-center text-[13px]" style={{ color:'#9CA3AF' }}>
            Come back tomorrow for Day {todayPlan.currentDay + 1} 🙏
          </p>
        </motion.div>
      ) : (
        <button onClick={handleDone}
          className="w-full text-white rounded-pill py-3.5 text-[14px] font-bold active:scale-[0.97] transition-all"
          style={{ background:'#4A7C5F' }}>
          Done for today ✓
        </button>
      )}

      {otherCount > 0 && (
        <p className="block text-center text-[12px] font-semibold mt-2" style={{ color:'#9CA3AF' }}>
          + {otherCount} more {otherCount===1?'plan':'plans'}
        </p>
      )}
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main home screen
// ─────────────────────────────────────────────


// Build /read URL with correct book+chapter from a passage reference like "John 3:16"
function buildReaderUrl(passage) {
  if (!passage) return '/read'
  const ref = passage.trim()
  // USFM format already (JHN.3)
  if (/^[A-Z0-9]{2,3}\.\d/.test(ref)) {
    const parts = ref.split('.')
    return `/read?book=${encodeURIComponent(parts[0])}&chapter=${parts[1] || '1'}`
  }
  // "John 3:16" or "Romans 8" format
  const m = ref.match(/^(.+?)\s+(\d+)/)
  if (m) return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
  return '/read'
}

// ── HeroCard — verse of the day with image and graceful fallback ──
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #5B4FCF 0%, #3D3190 100%)',  // Sunday — purple
  'linear-gradient(135deg, #4A7C5F 0%, #2D5A40 100%)',  // Monday — sage
  'linear-gradient(135deg, #E8A838 0%, #B07000 100%)',  // Tuesday — amber
  'linear-gradient(135deg, #5B4FCF 0%, #7C3AED 100%)',  // Wednesday — violet
  'linear-gradient(135deg, #4A7C5F 0%, #5B4FCF 100%)',  // Thursday — sage-purple
  'linear-gradient(135deg, #1A1A2E 0%, #5B4FCF 100%)',  // Friday — dark purple
  'linear-gradient(135deg, #E8A838 0%, #5B4FCF 100%)',  // Saturday — amber-purple
]

function HeroCard({ heroImg, verse }) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const dayOfWeek = new Date().getDay()
  const gradient  = FALLBACK_GRADIENTS[dayOfWeek]

  return (
    // Taller card — 280px gives verse text real room to breathe
    <div className="relative overflow-hidden" style={{ height:280, borderRadius:24 }}>

      {/* Fallback gradient — always visible underneath */}
      <div className="absolute inset-0" style={{ background: gradient }} />

      {/* Real image — fades in on load */}
      {!imgFailed && (
        <img
          src={heroImg}
          alt="Daily verse"
          onLoad={e => { e.currentTarget.style.opacity = '1' }}
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      )}

      {/* Strong gradient overlay — top transparent, bottom very dark for text */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.82) 100%)'
      }} />

      {/* Verse content */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
        {/* Date chip */}
        <div className="inline-flex items-center px-2.5 py-1 rounded-full mb-3"
          style={{ background:'rgba(255,255,255,0.18)', backdropFilter:'blur(4px)' }}>
          <p className="text-white text-[11px] font-bold tracking-wide">{fmtToday()}</p>
        </div>

        {/* Verse text — prominent, bold, always readable */}
        <p className="font-display italic text-white leading-[1.5] mb-2"
          style={{ fontSize:18, fontWeight:600,
                   textShadow:'0 1px 8px rgba(0,0,0,0.7), 0 2px 20px rgba(0,0,0,0.5)' }}>
          "{verse.text}"
        </p>

        {/* Reference — distinct style */}
        <p className="font-bold text-[13px] tracking-wider"
          style={{ color:'rgba(255,255,255,0.85)',
                   textShadow:'0 1px 6px rgba(0,0,0,0.8)' }}>
          — {verse.ref}
        </p>
      </div>
    </div>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const scrollRef = useRef(null)
  const { scrollY } = useScroll({ container: scrollRef })
  const headerShadow    = useTransform(scrollY, [0, 24], [0, 0.1])
  const headerBoxShadow = useTransform(headerShadow, v => `0 2px 12px rgba(0,0,0,${v})`)

  const [user, , hydrated]      = useLocalStorage('dw_user', null)
  const [plans, setPlans]       = useLocalStorage('dw_plans', [])
  const [notifOpen, setNotifOpen] = useState(false)
  const [compose,   setCompose]   = useState(false)
  const { isCheckedInToday, streak, performCheckin } = useCheckin()

  const dayOfWeek    = new Date().getDay()
  const heroImg      = getTodayVerseImage()
  const verse        = getTodayVerse()
  const userInitials = user?.name ? initials(user.name) : null
  const daysMissed   = useMemo(() => calcDaysMissed(streak?.lastCheckinDate), [streak?.lastCheckinDate])
  const companionId  = user?.companionId || 'david'

  function handlePlanCheckin(passage) {
    if (!isCheckedInToday) performCheckin({ passage, reflection:'' })
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── STICKY HEADER — clean floating, no border ── */}
      <motion.header
        className="flex-shrink-0 flex items-center justify-between px-5 z-50"
        style={{
          height: 60,
          background: 'transparent',
          boxShadow: headerBoxShadow,
          backdropFilter: 'blur(0px)',
        }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-jakarta, sans-serif)',
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: '-0.02em',
          color: '#1A1A2E',
        }}>
          Daily Walk
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <NotificationBell onClick={() => setNotifOpen(true)} />
          <Link href="/profile" aria-label="Profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold transition-opacity hover:opacity-85"
            style={{ background: '#5B4FCF' }}>
            {userInitials ? userInitials : <UserCircle size={18} />}
          </Link>
        </div>
      </motion.header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background:'#FAF8F5' }}>

        {/* Hero image — graceful fallback to gradient if image fails */}
        <div className="px-4 pt-4">
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
            <HeroCard heroImg={heroImg} verse={verse} />
          </motion.div>
        </div>

        {/* Character + check-in (unified card) */}
        <div className="px-4 mt-4">
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ type:'spring', stiffness:260, damping:22, delay:0.1 }}
            className="overflow-hidden shadow-card" style={{ borderRadius:20 }}>
            <CharacterCompanion
              characterId={companionId}
              streak={streak?.current || 0}
              daysMissed={daysMissed}
              checkedInToday={isCheckedInToday}
            />
          </motion.div>
        </div>

        {/* Today's Reading */}
        <div className="px-4 mt-4">
          <TodaysReadingCard plans={plans} setPlans={setPlans} onCheckin={handlePlanCheckin} />
        </div>

        {/* Open Bible */}
        <div className="px-4 mt-4 mb-4">
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}>
            <Link href="/read"
              className="flex items-center gap-4 rounded-card p-5 active:scale-[0.98] hover:opacity-95 transition-all"
              style={{ background:'#4A7C5F' }}>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <BibleIcon size={26} />
              </div>
              <div>
                <p className="font-display text-[17px] font-semibold text-white">Open the Bible</p>
                <p className="text-[13px] mt-0.5" style={{ color:'rgba(255,255,255,0.75)' }}>Start reading now</p>
              </div>
            </Link>
          </motion.div>
        </div>

      </div>

      {/* Single consolidated FAB */}
      <HomeFAB onPost={() => setCompose(true)} />

      <AnimatePresence>
        {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {compose && <PostComposer onClose={() => setCompose(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}