'use client'
import React from 'react'

// ── src/app/page.js ──
// Fixed sticky header. Dark mode via useTheme() token system.
// Content clears bottom nav via paddingBottom: 96.
// All colours from theme tokens — no hardcoded hex.

import { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  UserCircle, BookMarked, X, CheckCircle2, Check,
  PenLine, Lightbulb, Sun, Moon, Plus,
} from 'lucide-react'
import { BibleIcon }            from '../components/icons/BibleIcon'
import { useLocalStorage }      from '../hooks/useLocalStorage'
import { useCheckin }           from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import CharacterCompanion       from '../components/CharacterCompanion'
import { NotificationBell, NotificationPanel } from '../components/NotificationPanel'
import PostComposer             from '../components/PostComposer'
import { useTheme }             from '../lib/theme'
import {
  getTodayVerseImage, getTodayVerse, initials, todayStr,
} from '../lib/constants'
import {
  getTodaysPlan, getPlanProgress, isPlanCompletedToday,
  markDayComplete, readPlans, advanceAllPlans,
} from '../lib/plans'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function calcDaysMissed(last) {
  if (!last) return 7
  return Math.max(0, Math.floor(
    (new Date(todayStr()).getTime() - new Date(last).getTime()) / 86_400_000
  ))
}

function buildReaderUrl(passage) {
  if (!passage) return '/read'
  const m = passage.match(/^(.+?)\s+(\d+)(?::(\d+))?$/)
  if (!m) return `/read?book=${encodeURIComponent(passage)}`
  return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
}

// ─────────────────────────────────────────────
//  Hero verse card
// ─────────────────────────────────────────────
function HeroCard({ heroImg, verse }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div
      className="relative rounded-[22px] overflow-hidden"
      style={{ height: 210, background: imgFailed ? 'linear-gradient(135deg,#5B4FCF,#3D3190)' : undefined }}
    >
      {!imgFailed && heroImg && (
        <img
          src={heroImg} alt="Daily verse"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="hero-overlay absolute inset-0" />
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
        <p
          className="font-display text-white leading-snug mb-1.5"
          style={{ fontSize: 16, fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
        >
          "{verse.text}"
        </p>
        <p
          className="font-bold text-[13px] tracking-wider"
          style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
        >
          — {verse.ref}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Today's Reading card
// ─────────────────────────────────────────────
function TodaysReadingCard({ plans, setPlans, onCheckin, t }) {
  const router = useRouter()
  const active = (plans || []).filter(p => p.status === 'active')
  const uncompleted    = getTodaysPlan(active)
  const completedToday = active.find(p => isPlanCompletedToday(p))
  const todayPlan      = uncompleted || completedToday

  if (!todayPlan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-[20px] p-5"
        style={{ background: t.bgCard, boxShadow: t.shadow }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookMarked size={16} style={{ color: '#5B4FCF' }} />
            <span className="font-bold text-[14px]" style={{ color: t.text }}>Today's Reading</span>
          </div>
          <Link href="/plans" className="text-[12px] font-semibold" style={{ color: t.textMuted }}>
            All Plans →
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <BibleIcon size={32} />
          <p className="font-semibold text-[14px]" style={{ color: t.text }}>No active plans yet</p>
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            Start a reading plan to guide your daily study
          </p>
          <Link
            href="/plans"
            className="text-white px-5 py-2.5 rounded-[100px] text-[13px] font-bold mt-1"
            style={{ background: '#5B4FCF' }}
          >
            Browse Plans →
          </Link>
        </div>
      </motion.div>
    )
  }

  const todayDay   = todayPlan.days?.[todayPlan.currentDay - 1]
  const pct        = getPlanProgress(todayPlan)
  const isComplete = isPlanCompletedToday(todayPlan)
  const dayUrl     = `/plans/${todayPlan.id}/day/${todayPlan.currentDay}`

  function handleDone(e) {
    e.stopPropagation()
    markDayComplete(todayPlan.id, todayPlan.currentDay, '')
    setPlans(readPlans())
    onCheckin(todayDay?.passage || '')
    showToast('Day complete! 🙌')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
    >
      <button
        onClick={() => router.push(dayUrl)}
        className="w-full rounded-[20px] p-5 text-left cursor-pointer active:scale-[0.98] transition-all block"
        style={{ background: t.bgCard, boxShadow: t.shadow, WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookMarked size={16} style={{ color: '#5B4FCF' }} />
            <span className="font-bold text-[14px]" style={{ color: t.text }}>Today's Reading</span>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: t.textMuted }}>Open →</span>
        </div>
        <p className="font-display font-semibold text-[16px]" style={{ color: t.text }}>
          {todayPlan.name}
        </p>
        {todayDay && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-[13px]" style={{ color: t.textMuted }}>
              Day {todayPlan.currentDay} · {todayDay.passage}
            </p>
            <span
              onClick={e => { e.stopPropagation(); router.push(buildReaderUrl(todayDay.passage)) }}
              className="text-[12px] font-bold cursor-pointer"
              style={{ color: '#5B4FCF' }}
            >
              Read →
            </span>
          </div>
        )}
        <div className="mt-3 mb-4">
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
            <motion.div
              className="h-full rounded-full" style={{ background: '#5B4FCF' }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
            />
          </div>
        </div>
        {isComplete ? (
          <div
            className="flex items-center gap-2 py-3 rounded-[14px] justify-center"
            style={{ background: '#E0FBEC' }}
          >
            <CheckCircle2 size={16} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[13px]" style={{ color: '#4A7C5F' }}>
              Done today — great work! 🙌
            </span>
          </div>
        ) : (
          <div
            onClick={handleDone}
            className="flex items-center justify-center gap-2 py-3 rounded-[14px] cursor-pointer active:scale-[0.97] transition-all"
            style={{ background: '#5B4FCF' }}
          >
            <Check size={16} className="text-white" />
            <span className="font-bold text-[13px] text-white">Mark today complete</span>
          </div>
        )}
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  FAB
// ─────────────────────────────────────────────
function HomeFAB({ onPost, t }) {
  const [open,    setOpen]    = useState(false)
  const [nugOpen, setNug]     = useState(false)
  const [input,   setInput]   = useState('')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])
 
  function saveNugget() {
    const text = input.trim()
    if (!text) return
    setNuggets(prev => [{
      id: `nug_${Date.now()}`, text, source: null,
      createdAt: new Date().toISOString(),
    }, ...(prev || [])])
    showToast('Nugget saved!')
    setNug(false); setInput(''); setOpen(false)
  }
 
  const actions = [
    {
      icon: PenLine, bg: t.purpleBg, color: '#5B4FCF',
      label: 'Write a post', sub: 'Share with the world',
      action: () => { setOpen(false); setTimeout(onPost, 120) },
    },
    {
      icon: Lightbulb, bg: t.amberBg, color: '#E8A838',
      label: 'Add a nugget', sub: 'Save a personal insight',
      action: () => { setOpen(false); setTimeout(() => setNug(true), 120) },
    },
  ]
 
  return (
    <>
      {/* FAB button — stays at bottom-20 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-20 right-4 w-[52px] h-[52px] rounded-full text-white flex items-center justify-center z-40 active:scale-95 transition-all"
        style={{ background: '#5B4FCF', boxShadow: '0 4px 16px rgba(91,79,207,0.4)' }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={24} />
        </motion.div>
      </button>
 
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-30"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {/* Popup — bottom-[148px] clears the FAB (52px) + nav (80px) + 16px gap */}
            <motion.div
              className="fixed bottom-[148px] right-4 flex flex-col gap-2 z-40 items-end"
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {actions.map((a, i) => (
                <motion.button
                  key={i} onClick={a.action}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-[18px] active:scale-95 transition-all"
                  style={{ background: t.bgCard, boxShadow: t.shadowMd }}
                >
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-[13px]" style={{ color: t.text }}>{a.label}</span>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>{a.sub}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: a.bg }}>
                    <a.icon size={17} style={{ color: a.color }} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
 
      {/* Nugget sheet */}
      <AnimatePresence>
        {nugOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-[60]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNug(false)}
            />
            <motion.div
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] px-5 pt-5 pb-10"
              style={{ background: t.bgCard }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
              </div>
              <p className="font-bold text-[17px] mb-4" style={{ color: t.text }}>New Nugget</p>
              <textarea
                autoFocus value={input} onChange={e => setInput(e.target.value)}
                placeholder="Write your insight, reflection, or verse..."
                rows={4}
                className="w-full rounded-[14px] px-4 py-3.5 text-[15px] resize-none focus:outline-none mb-4"
                style={{
                  background:  t.bgMuted,
                  color:       t.text,
                  border:      `1px solid ${t.borderInput}`,
                  lineHeight:  1.7,
                }}
              />
              <button
                onClick={saveNugget} disabled={!input.trim()}
                className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-40 active:scale-[0.97] transition-all"
                style={{ background: '#5B4FCF' }}
              >
                Save nugget
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────
//  Main screen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter()
  const scrollRef = useRef(null)
  const { t, dark, toggle: toggleDark } = useTheme()

  const { scrollY }     = useScroll({ container: scrollRef })
  const headerOpacity   = useTransform(scrollY, [0, 40], [0, 1])

  const [user,  , hydrated] = useLocalStorage('dw_user',  null)
  const [plans, setPlans]   = useLocalStorage('dw_plans', [])
  const [notifOpen, setNotifOpen] = useState(false)
  const [compose,   setCompose]   = useState(false)
  const { isCheckedInToday, streak, performCheckin } = useCheckin()

  const heroImg      = getTodayVerseImage()
  const verse        = getTodayVerse()
  const userInitials = user?.name ? initials(user.name) : null
  const daysMissed   = useMemo(
    () => calcDaysMissed(streak?.lastCheckinDate),
    [streak?.lastCheckinDate]
  )
  const companionId = user?.companionId || 'david'

  function handlePlanCheckin(passage) {
    if (!isCheckedInToday) performCheckin({ passage, reflection: '' })
  }

  if (!hydrated) return null

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', overflow: 'hidden', background: t.bg }}
    >
      {/* ── STICKY HEADER — never scrolls away ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 z-40"
        style={{
          height:     56,
          background: t.bgNav,
          borderBottom: `1px solid ${t.border}`,
          position:   'sticky',
          top:        0,
        }}
      >
        {/* Wordmark */}
        <span style={{
          fontFamily:    'var(--font-jakarta, sans-serif)',
          fontWeight:    700,
          fontSize:      18,
          letterSpacing: '-0.02em',
          color:         t.text,
        }}>
          Daily Walk
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 min-h-[44px] min-w-[44px]"
            style={{ background: t.bgMuted, color: dark ? '#C77DFF' : '#5B4FCF' }}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <NotificationBell onClick={() => setNotifOpen(true)} />

          <Link
            href="/profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
            style={{ background: '#5B4FCF', minHeight: 44, minWidth: 44 }}
          >
            {userInitials ? userInitials : <UserCircle size={20} />}
          </Link>
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-hide"
        style={{ background: t.bg, paddingBottom: 96 }}
      >
        {/* Hero verse */}
        <div className="px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <HeroCard heroImg={heroImg} verse={verse} />
          </motion.div>
        </div>

        {/* Character companion */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
            className="overflow-hidden"
            style={{ borderRadius: 20, boxShadow: t.shadow }}
          >
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
          <TodaysReadingCard plans={plans} setPlans={setPlans} onCheckin={handlePlanCheckin} t={t} />
        </div>

        {/* Open Bible CTA */}
        <div className="px-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Link
              href="/read"
              className="flex items-center gap-4 rounded-[20px] p-5 active:scale-[0.98] transition-all"
              style={{ background: '#4A7C5F' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <BibleIcon size={26} />
              </div>
              <div>
                <p className="font-display text-[17px] font-semibold text-white">Open the Bible</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Start reading now
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* FAB */}
      <HomeFAB onPost={() => setCompose(true)} t={t} />

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