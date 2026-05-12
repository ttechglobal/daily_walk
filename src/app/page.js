'use client'

// ── Home screen — CharacterCompanion replaces SpiritualCharacter ──
// Today's Reading card added. No Events. Home FAB for quick actions.

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCircle2, BookOpen, UserCircle, Flame,
  BookMarked, Lightbulb, Plus, X, Trophy
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import CharacterCompanion from '../components/CharacterCompanion'
import { HERO_IMAGES, getTodayVerse, initials, todayStr, SEED_CHALLENGES } from '../lib/constants'
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
    {
      icon: Lightbulb, iconBg: '#FFF4DC', iconColor: '#E8A838',
      title: 'Add a personal nugget', sub: 'Saved privately',
      onClick: () => { setOpen(false); setTimeout(() => setNugget(true), 100) },
    },
    {
      icon: isCheckedInToday ? CheckCircle2 : BookOpen,
      iconBg: '#EDE9FF', iconColor: '#5B4FCF',
      title: isCheckedInToday ? 'Already checked in ✓' : 'Log a Bible reading',
      sub: isCheckedInToday ? 'Come back tomorrow' : 'Mark your reading for today',
      onClick: isCheckedInToday ? null : () => { setOpen(false); router.push('/checkin') },
      disabled: isCheckedInToday,
    },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center z-40 active:scale-95 transition-all"
        style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.4)' }}
        aria-label="Quick actions">
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={26} strokeWidth={2} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 bg-black/25 z-[55]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="fixed bottom-[88px] right-4 w-[220px] bg-white rounded-[20px] z-[56] overflow-hidden shadow-xl"
              initial={{ opacity:0, y:10, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:8, scale:0.95 }} transition={{ type:'spring', stiffness:380, damping:34 }}>
              {actions.map((a, i) => (
                <button key={i} onClick={a.disabled ? undefined : a.onClick} disabled={a.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i < actions.length-1 ? 'border-b border-gray-100' : ''} ${a.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.iconBg }}>
                    <a.icon size={16} style={{ color: a.iconColor }} />
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
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Lightbulb size={18} style={{ color:'#E8A838' }} /><span className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Add a nugget</span></div>
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
  const router  = useRouter()
  const today   = todayStr()
  const active  = (plans || []).filter(p => p.status === 'active')
  const todayPlan = getTodaysPlan(active)
  const otherCount = active.filter(p => p.id !== todayPlan?.id).length

  if (!todayPlan) {
    return (
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}
        className="bg-white rounded-card shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookMarked size={16} style={{ color:'#5B4FCF' }} />
            <span className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Today's Reading</span>
          </div>
          <Link href="/plans" className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>All Plans →</Link>
        </div>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <BookOpen size={28} style={{ color:'#C4C1BC' }} />
          <p className="font-semibold text-[14px]" style={{ color:'#1A1A2E' }}>No active plans yet</p>
          <p className="text-[13px]" style={{ color:'#9CA3AF' }}>Start a reading plan to guide your daily study</p>
          <Link href="/plans"
            className="text-white px-5 py-2.5 rounded-pill text-[13px] font-bold"
            style={{ background:'#5B4FCF' }}>
            Browse Plans →
          </Link>
        </div>
      </motion.div>
    )
  }

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
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}
      className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookMarked size={16} style={{ color:'#5B4FCF' }} />
          <span className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>Today's Reading</span>
        </div>
        <Link href="/plans" className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>All Plans →</Link>
      </div>
      <button onClick={() => router.push(`/plans/${todayPlan.id}/day/${todayPlan.currentDay}`)}
        className="w-full text-left mb-3">
        <p className="font-display font-semibold text-[15px]" style={{ color:'#1A1A2E' }}>{todayPlan.name}</p>
        {todayDay && <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>Day {todayPlan.currentDay} · {todayDay.passage}</p>}
      </button>
      <div className="mb-3">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
          <motion.div className="h-full rounded-full" style={{ background:'#5B4FCF' }}
            initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7 }} />
        </div>
        <p className="text-[11px] mt-1 text-right" style={{ color:'#9CA3AF' }}>{pct}% complete</p>
      </div>
      {todayDone ? (
        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-pill text-[13px] font-bold" style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
          <CheckCircle2 size={15} /> Completed today ✓
        </div>
      ) : (
        <button onClick={handleDone}
          className="w-full text-white rounded-pill py-3 text-[13px] font-bold active:scale-[0.97] transition-all"
          style={{ background:'#4A7C5F' }}>
          Done for today ✓
        </button>
      )}
      {otherCount > 0 && (
        <Link href="/plans" className="block text-center text-[11px] font-semibold mt-2" style={{ color:'#9CA3AF' }}>
          + {otherCount} more {otherCount === 1 ? 'plan' : 'plans'}
        </Link>
      )}
    </motion.div>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [user, , hydrated]   = useLocalStorage('dw_user', null)
  const [plans, setPlans]    = useLocalStorage('dw_plans', [])
  const { isCheckedInToday, streak, performCheckin } = useCheckin()

  const dayOfWeek    = new Date().getDay()
  const heroImg      = HERO_IMAGES[dayOfWeek]
  const verse        = getTodayVerse()
  const userInitials = user?.name ? initials(user.name) : null
  const daysMissed   = useMemo(() => calcDaysMissed(streak?.lastCheckinDate), [streak?.lastCheckinDate])
  const companionId  = user?.companionId || 'david'

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <span className="font-semibold text-[16px]" style={{ color:'#1A1A2E' }}>Daily Walk</span>
        <div className="flex items-center gap-2">
          <button onClick={() => showToast('Notifications coming soon')}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color:'#6B7280' }} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <Link href="/profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold hover:opacity-90"
            style={{ background:'#5B4FCF' }} aria-label="Profile">
            {userInitials ? userInitials : <UserCircle size={20} />}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="px-4">
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          className="relative overflow-hidden" style={{ height:220, borderRadius:20 }}>
          <Image src={heroImg} alt="Daily devotion" fill priority className="object-cover" sizes="420px" />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.5))' }} />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p className="text-white/70 text-[12px] font-semibold mb-1">{formatTodayLabel()}</p>
            <p className="font-display italic text-white text-[14px] leading-snug line-clamp-2">"{verse.text}"</p>
            <p className="text-white/60 text-[11px] mt-1">— {verse.ref}</p>
          </div>
        </motion.div>
      </div>

      {/* Character companion */}
      <div className="px-4 mt-4">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}
          className="bg-white rounded-card shadow-card" style={{ padding:24 }}>
          <CharacterCompanion
            characterId={companionId}
            streak={streak?.current || 0}
            daysMissed={daysMissed}
          />
        </motion.div>
      </div>

      {/* Check-in card */}
      <div className="px-4 mt-4">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="bg-white rounded-card shadow-card p-5">
          {isCheckedInToday ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#E8F4ED' }}>
                <CheckCircle2 size={30} style={{ color:'#4A7C5F' }} />
              </div>
              <p className="font-display text-[17px] font-semibold text-center" style={{ color:'#1A1A2E' }}>You've checked in today!</p>
              {(streak?.current || 0) > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background:'#FFF4DC' }}>
                  <Flame size={15} className="flame-flicker" style={{ color:'#E8A838' }} />
                  <span className="text-sm font-bold" style={{ color:'#B07000' }}>Day {streak.current} streak</span>
                </div>
              )}
              <Link href="/profile" className="text-sm font-semibold underline underline-offset-2" style={{ color:'#5B4FCF' }}>
                View your journey →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-[18px] font-semibold" style={{ color:'#1A1A2E' }}>
                  Have you spent time with God today?
                </h2>
                <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>Tap below when you've read your Bible</p>
              </div>
              <button onClick={() => router.push('/checkin')}
                className="cta-pulse w-full text-white rounded-pill py-4 text-[15px] font-bold tracking-wide active:scale-[0.97]"
                style={{ background:'#5B4FCF' }}>
                ✓  I read my Bible today
              </button>
              <button onClick={() => showToast("No worries. We'll be here when you're ready.")}
                className="text-center text-[13px] font-semibold" style={{ color:'#6B7280' }}>
                Remind me later
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Today's Reading card */}
      <div className="px-4 mt-4">
        <TodaysReadingCard
          plans={plans}
          setPlans={setPlans}
          onCheckin={passage => { if (!isCheckedInToday) performCheckin({ passage, reflection: '' }) }}
        />
      </div>

      {/* Open Bible card */}
      <div className="px-4 mt-4 mb-28">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <Link href="/read"
            className="flex items-center gap-4 rounded-card p-5 active:scale-[0.98] hover:opacity-95 transition-all"
            style={{ background:'#4A7C5F' }}>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen size={26} className="text-white" />
            </div>
            <div>
              <p className="font-display text-[17px] font-semibold text-white">Open the Bible</p>
              <p className="text-[13px] mt-0.5" style={{ color:'rgba(255,255,255,0.75)' }}>Start reading now</p>
            </div>
          </Link>
        </motion.div>
      </div>

      <HomeFAB />
      <ToastContainer />
    </div>
  )
}