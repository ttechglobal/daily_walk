'use client'

// ── Home screen — Update 1: full layout restructure ──
// Removed: music button, challenges strip, community nudge counter
// New layout: header bar → hero image (with verse overlay) → character card
//             → check-in card → open bible card

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, BookOpen, UserCircle, Flame } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from '../components/Toast'
import SpiritualCharacter from '../components/SpiritualCharacter'
import { HERO_IMAGES, getTodayVerse, initials, todayStr } from '../lib/constants'

function calcDaysMissed(lastCheckinDate) {
  if (!lastCheckinDate) return 7
  const diff = new Date(todayStr()).getTime() - new Date(lastCheckinDate).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function HomeScreen() {
  const router = useRouter()
  const [user, , hydrated] = useLocalStorage('dw_user', null)
  const { isCheckedInToday, streak } = useCheckin()

  const dayOfWeek    = new Date().getDay()
  const heroImg      = HERO_IMAGES[dayOfWeek]
  const verse        = getTodayVerse()
  const userInitials = user?.name ? initials(user.name) : null
  const daysMissed   = useMemo(() => calcDaysMissed(streak?.lastCheckinDate), [streak?.lastCheckinDate])

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">

      {/* ── 1. HEADER BAR ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <span className="font-semibold text-[16px]" style={{ color: '#1A1A2E', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
          Daily Walk
        </span>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => showToast('Notifications coming soon')}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: '#6B7280' }}
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
          {/* Profile avatar */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold transition-colors hover:opacity-90"
            style={{ background: '#5B4FCF' }}
            aria-label="Profile"
          >
            {userInitials ? userInitials : <UserCircle size={20} />}
          </Link>
        </div>
      </div>

      {/* ── 2. HERO IMAGE with verse overlay ── */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden"
          style={{ height: 220, borderRadius: 20 }}
        >
          <Image
            src={heroImg}
            alt="Daily devotion"
            fill
            priority
            className="object-cover"
            sizes="420px"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.5))' }}
          />
          {/* Text overlay — bottom left */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p className="text-white/70 text-[12px] font-semibold mb-1">{formatTodayLabel()}</p>
            <p className="font-display italic text-white text-[14px] leading-snug line-clamp-2">
              "{verse.text}"
            </p>
            <p className="text-white/60 text-[11px] mt-1">— {verse.ref}</p>
          </div>
        </motion.div>
      </div>

      {/* ── 3. SPIRITUAL CHARACTER CARD ── */}
      <div className="px-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-card shadow-card"
          style={{ padding: 24 }}
        >
          <SpiritualCharacter streak={streak?.current || 0} daysMissed={daysMissed} />
        </motion.div>
      </div>

      {/* ── 4. CHECK-IN CARD ── */}
      <div className="px-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-card shadow-card p-5"
        >
          {isCheckedInToday ? (
            /* Already checked in */
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E8F4ED' }}>
                <CheckCircle2 size={30} style={{ color: '#4A7C5F' }} />
              </div>
              <p className="font-display text-[17px] font-semibold text-center" style={{ color: '#1A1A2E' }}>
                You've checked in today!
              </p>
              {(streak?.current || 0) > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#FFF4DC' }}>
                  <Flame size={15} className="flame-flicker" style={{ color: '#E8A838' }} />
                  <span className="text-sm font-bold" style={{ color: '#B07000' }}>
                    Day {streak.current} streak
                  </span>
                </div>
              )}
              <Link
                href="/profile"
                className="text-sm font-semibold underline underline-offset-2"
                style={{ color: '#5B4FCF' }}
              >
                View your journey →
              </Link>
            </div>
          ) : (
            /* Not checked in */
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-[18px] font-semibold" style={{ color: '#1A1A2E' }}>
                  Have you spent time with God today?
                </h2>
                <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
                  Tap below when you've read your Bible
                </p>
              </div>
              <button
                onClick={() => router.push('/checkin')}
                className="cta-pulse w-full text-white rounded-pill py-4 text-[15px] font-bold tracking-wide transition-all active:scale-[0.97]"
                style={{ background: '#5B4FCF' }}
              >
                ✓  I read my Bible today
              </button>
              <button
                onClick={() => showToast("No worries. We'll be here when you're ready.")}
                className="text-center text-[13px] font-semibold"
                style={{ color: '#6B7280' }}
              >
                Remind me later
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── 5. OPEN BIBLE CARD ── */}
      <div className="px-4 mt-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <Link
            href="/read"
            className="flex items-center gap-4 rounded-card p-5 transition-all active:scale-[0.98] hover:opacity-95"
            style={{ background: '#4A7C5F' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen size={26} className="text-white" />
            </div>
            <div>
              <p className="font-display text-[17px] font-semibold text-white leading-snug">
                Open the Bible
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Start reading now
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      <ToastContainer />
    </div>
  )
}