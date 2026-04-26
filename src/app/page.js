'use client'

// ── Home screen — Updates 1 (profile avatar), 2 (music button), 3 (reading card) ──

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Globe, CheckCircle2, BookOpen, ChevronRight, UserCircle } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import { MusicButton, MusicSheet } from '../components/MusicPlayer'
import { HERO_IMAGES, getTodayVerse, getChallengeProgress, initials } from '../lib/constants'

export default function HomeScreen() {
  const router = useRouter()

  const [user, , hydrated] = useLocalStorage('dw_user', null)
  const [challenges]       = useLocalStorage('dw_challenges', [])
  const [checkins]         = useLocalStorage('dw_checkins', [])
  const { isCheckedInToday, streak } = useCheckin()

  const [communityCount] = useState(() => Math.floor(Math.random() * 41) + 40)

  const dayOfWeek       = new Date().getDay()
  const heroImg         = HERO_IMAGES[dayOfWeek]
  const verse           = getTodayVerse()
  const name            = user?.name || 'friend'
  const hour            = new Date().getHours()
  const greeting        = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const joinedChallenges = (challenges || []).filter(c => c.joined)

  // Update 1: avatar initials
  const userInitials = user?.name ? initials(user.name) : null

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* ── HERO IMAGE ── */}
      <div className="relative w-full" style={{ height: '52vw', maxHeight: 240 }}>
        <Image src={heroImg} alt="Daily devotion" fill priority className="object-cover" sizes="420px" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />

        {/* Top bar: wordmark | music button + profile avatar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-amber flame-flicker" />
            <span className="text-white font-bold text-[17px] tracking-tight">Daily Walk</span>
          </div>

          {/* Right side: Music + Profile */}
          <div className="flex items-center gap-2">
            {/* Update 2: music button — opens music sheet */}
            <MusicButton />

            {/* Update 1: profile avatar top-right */}
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors overflow-hidden"
              aria-label="Profile"
            >
              {userInitials ? (
                <span className="text-[13px] font-bold">{userInitials}</span>
              ) : (
                <UserCircle size={20} />
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── VERSE — no label ── */}
      <div className="px-4 -mt-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="card border-l-4 border-purple px-5 py-4"
        >
          <p className="font-display italic text-text-primary leading-relaxed text-[15px]">"{verse.text}"</p>
          <p className="text-text-muted text-xs font-semibold mt-2">— {verse.ref}</p>
        </motion.div>
      </div>

      {/* ── GREETING ── */}
      <div className="px-4 mt-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h1 className="font-display text-[24px] font-semibold text-text-primary capitalize leading-snug">
            {greeting}, {name}.
          </h1>
          <p className="text-text-muted text-[15px] mt-1 leading-relaxed">Have you spent time with God today?</p>
        </motion.div>

        {/* ── CTA ── */}
        <div className="mt-5 flex flex-col gap-3">
          {isCheckedInToday ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center">
                <CheckCircle2 size={36} className="text-sage" />
              </div>
              <p className="font-display text-[18px] font-semibold text-text-primary text-center">You've checked in today</p>
              {streak?.current > 0 && (
                <div className="flex items-center gap-2 bg-amber-light px-4 py-2 rounded-pill">
                  <Flame size={16} className="text-amber flame-flicker" />
                  <span className="text-sm font-bold text-amber-700">Day {streak.current} streak</span>
                </div>
              )}
              <Link href="/journey" className="text-purple text-sm font-semibold underline underline-offset-2">View your journey →</Link>
            </motion.div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <button
                  onClick={() => router.push('/checkin')}
                  className="cta-pulse block w-full text-center bg-purple text-white rounded-pill py-4 text-[15px] font-bold tracking-wide transition-all hover:bg-purple-dark active:scale-[0.97]"
                >
                  ✓  I read my Bible today
                </button>
              </motion.div>
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                onClick={() => showToast("No worries. We'll be here when you're ready.")}
                className="w-full border-2 border-purple/25 text-purple rounded-pill py-3.5 text-[15px] font-semibold hover:bg-purple-light transition-colors"
              >
                Remind me later
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* ── Update 3: OPEN THE BIBLE card ── */}
      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-[18px] font-semibold text-text-primary">Open the Bible</h2>
            <BookOpen size={20} className="text-purple flex-shrink-0" />
          </div>
          <p className="text-text-muted text-[13px] mb-4 leading-relaxed">
            Start reading now and check in when you're done.
          </p>
          <Link
            href="/read"
            className="block w-full text-center bg-sage text-white rounded-pill py-3 text-[14px] font-bold transition-all hover:bg-sage-dark active:scale-[0.97]"
          >
            Start reading →
          </Link>
        </motion.div>
      </div>

      {/* ── Update 1c: ACTIVE CHALLENGES STRIP ── */}
      {joinedChallenges.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4">
          <div className="px-4 mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Your Challenges</p>
            <Link href="/challenges" className="text-[12px] font-bold text-purple">See all</Link>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scroll-hide pb-1">
            {joinedChallenges.map(challenge => {
              const { completed, total } = getChallengeProgress(challenge, checkins)
              const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0
              return (
                <Link key={challenge.id} href={`/challenges/${challenge.id}`}
                  className="flex-shrink-0 w-[180px] card p-3 flex flex-col gap-2">
                  <p className="font-bold text-text-primary text-[13px] leading-snug line-clamp-2">{challenge.title}</p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-text-muted">{completed}/{total} days</p>
                    <span className="text-[11px] font-bold text-purple flex items-center gap-0.5">Continue <ChevronRight size={11} /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── COMMUNITY NUDGE ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        className="flex items-center justify-center gap-2 mt-4 mb-6 px-4">
        <Globe size={14} className="text-text-muted" />
        <p className="text-text-muted text-[13px]">{communityCount} people have checked in today</p>
      </motion.div>

      <ToastContainer />
    </div>
  )
}