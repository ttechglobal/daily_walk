'use client'

// ── Home screen — character card is the emotional centrepiece ──
// Unified character + check-in card is now card #1 after hero image.
// Plans, Open Bible, FAB follow below.

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle, BookMarked, Lightbulb, Plus, X, CheckCircle2, Trophy
} from 'lucide-react'
import { BibleIcon } from '../components/icons/BibleIcon'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import CharacterCompanion from '../components/CharacterCompanion'
import { NotificationBell, NotificationPanel } from '../components/NotificationPanel'
import { HERO_IMAGES, getTodayVerse, initials, todayStr } from '../lib/constants'
import { getTodaysPlan, getPlanProgress, markDayComplete, readPlans } from '../lib/plans'

function calcDaysMissed(lastCheckinDate) {
  if (!lastCheckinDate) return 7
  const diff = new Date(todayStr()).getTime() - new Date(lastCheckinDate).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}
function formatTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ── Home FAB ──
function HomeFAB() {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [nuggetOpen, setNugget] = useState(false)
  const [input, setInput]       = useState('')
  const [nuggets, setNuggets]   = useLocalStorage('dw_nuggets', [])
  const { isCheckedInToday }    = useCheckin()

  function saveNugget() {
    const t = input.trim()
    if (!t) return
    setNuggets(prev => [{ id:`nug_${Date.now()}`, text:t, source:null, createdAt:new Date().toISOString() }, ...(prev||[])])
    showToast('Nugget saved!')
    setNugget(false); setInput(''); setOpen(false)
  }

  const actions = [
    { icon: Lightbulb, iconBg:'#FFF4DC', iconColor:'#E8A838', title:'Add a personal nugget', sub:'Saved privately',
      onClick: () => { setOpen(false); setTimeout(() => setNugget(true), 100) }, disabled:false },
    { icon: isCheckedInToday ? CheckCircle2 : Trophy, iconBg:'#E8F4ED', iconColor:'#4A7C5F',
      title:'Post to a challenge', sub:'Share with your group',
      onClick: () => { setOpen(false); router.push('/plans') }, disabled:false },
  ]

  return (
    <>
      <button onClick={() => setOpen(v => !v)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center z-40 active:scale-95 transition-all"
        style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.4)' }}
        aria-label="Quick actions">
        <motion.div animate={{ rotate:open ? 45 : 0 }} transition={{ duration:0.2 }}>
          <Plus size={26} strokeWidth={2} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 bg-black/25 z-[55]"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)} />
            <motion.div
              className="fixed bottom-[88px] right-4 w-[230px] bg-white rounded-[20px] z-[56] overflow-hidden shadow-xl"
              initial={{ opacity:0, y:10, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:8, scale:0.95 }}
              transition={{ type:'spring', stiffness:380, damping:34 }}>
              {actions.map((a, i) => (
                <button key={i} onClick={a.disabled ? undefined : a.onClick} disabled={a.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i < actions.length-1 ? 'border-b border-gray-100' : ''} ${a.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:a.iconBg }}>
                    <a.icon size={16} style={{ color:a.iconColor }} />
                  </div>
                  <div>
                    <p className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>{a.title}</p>
                    <p className="text-[11px]" style={{ color:'#6B7280' }}>{a.sub}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nuggetOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setNugget(false)} />
            <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-5 pb-10"
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', stiffness:340, damping:36 }}>
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Lightbulb size={18} style={{ color:'#E8A838' }}/><span className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Add a nugget</span></div>
                <button onClick={() => setNugget(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15}/></button>
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

// ── Today's Reading card ──
function TodaysReadingCard({ plans, setPlans, onCheckin }) {
  const router   = useRouter()
  const today    = todayStr()
  const active   = (plans || []).filter(p => p.status === 'active')
  const todayPlan = getTodaysPlan(active)
  const otherCount = active.filter(p => p.id !== todayPlan?.id).length

  if (!todayPlan) return (
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

  const todayDay  = todayPlan.days?.[todayPlan.currentDay - 1]
  const pct       = getPlanProgress(todayPlan)
  const todayDone = todayDay?.completedAt?.startsWith(today)

  function handleDone() {
    markDayComplete(todayPlan.id, todayPlan.currentDay, '')
    setPlans(readPlans())
    onCheckin(todayDay?.passage || '')
    showToast('Day complete!')
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
      className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookMarked size={16} style={{ color:'#5B4FCF' }} />
          <span className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Today's Reading</span>
        </div>
        <Link href="/plans" className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>All Plans →</Link>
      </div>
      <p className="font-display font-semibold text-[16px]" style={{ color:'#1A1A2E' }}>{todayPlan.name}</p>
      {todayDay && <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>Day {todayPlan.currentDay} · {todayDay.passage}</p>}
      <div className="mt-3 mb-4">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
          <motion.div className="h-full rounded-full" style={{ background:'#5B4FCF' }}
            initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7 }} />
        </div>
      </div>
      {todayDone ? (
        <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-pill text-[14px] font-bold"
          style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
          <CheckCircle2 size={16} /> Completed today ✓
        </div>
      ) : (
        <button onClick={handleDone}
          className="w-full text-white rounded-pill py-3.5 text-[14px] font-bold active:scale-[0.97] transition-all"
          style={{ background:'#4A7C5F' }}>Done for today ✓</button>
      )}
      {otherCount > 0 && (
        <Link href="/plans" className="block text-center text-[12px] font-semibold mt-2"
          style={{ color:'#9CA3AF' }}>
          + {otherCount} more {otherCount === 1 ? 'plan' : 'plans'}
        </Link>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main home screen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter()
  const [user, , hydrated]   = useLocalStorage('dw_user', null)
  const [plans, setPlans]    = useLocalStorage('dw_plans', [])
  const [notifOpen, setNotifOpen] = useState(false)
  const { isCheckedInToday, streak, performCheckin } = useCheckin()

  const dayOfWeek    = new Date().getDay()
  const heroImg      = HERO_IMAGES[dayOfWeek]
  const verse        = getTodayVerse()
  const userInitials = user?.name ? initials(user.name) : null
  const daysMissed   = useMemo(() => calcDaysMissed(streak?.lastCheckinDate), [streak?.lastCheckinDate])
  const companionId  = user?.companionId || 'david'

  function handlePlanCheckin(passage) {
    if (!isCheckedInToday) performCheckin({ passage, reflection:'' })
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* 1. HEADER */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <span className="font-semibold text-[16px]" style={{ color:'#1A1A2E' }}>Daily Walk</span>
        <div className="flex items-center gap-2">
          <NotificationBell onClick={() => setNotifOpen(true)} />
          <Link href="/profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold hover:opacity-90"
            style={{ background:'#5B4FCF' }} aria-label="Profile">
            {userInitials ? userInitials : <UserCircle size={20} />}
          </Link>
        </div>
      </div>

      {/* 2. HERO IMAGE with verse */}
      <div className="px-4">
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          className="relative overflow-hidden" style={{ height:200, borderRadius:20 }}>
          <Image src={heroImg} alt="Daily devotion" fill priority className="object-cover" sizes="420px" />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p className="text-white/70 text-[12px] font-semibold mb-1">{formatTodayLabel()}</p>
            <p className="font-display italic text-white text-[14px] leading-snug line-clamp-2">"{verse.text}"</p>
            <p className="text-white/60 text-[11px] mt-1">— {verse.ref}</p>
          </div>
        </motion.div>
      </div>

      {/* 3. UNIFIED CHARACTER + CHECK-IN CARD — the emotional centrepiece */}
      <div className="px-4 mt-4">
        <motion.div
          initial={{ opacity:0, y:12 }}
          animate={{ opacity:1, y:0 }}
          transition={{ type:'spring', stiffness:260, damping:22, delay:0.1 }}
          className="overflow-hidden shadow-card"
          style={{ borderRadius:20 }}>
          <CharacterCompanion
            characterId={companionId}
            streak={streak?.current || 0}
            daysMissed={daysMissed}
            checkedInToday={isCheckedInToday}
            onCheckin={() => router.push('/checkin')}
          />
        </motion.div>
      </div>

      {/* 4. TODAY'S READING CARD */}
      <div className="px-4 mt-4">
        <TodaysReadingCard plans={plans} setPlans={setPlans} onCheckin={handlePlanCheckin} />
      </div>

      {/* 5. OPEN BIBLE CARD */}
      <div className="px-4 mt-4 mb-28">
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

      {/* Home FAB */}
      <HomeFAB />

      {/* Notification panel */}
      <AnimatePresence>
        {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}