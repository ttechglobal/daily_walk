'use client'

// ── src/app/offline/page.js — v2 ──
// This page is served by the SW as fallback when a navigation request fails
// AND the page isn't in the cache.
//
// Unlike the old version (a static error screen), this page:
//   • Shows the user's local data (streak, active plans)
//   • Lets them navigate to /read (if Bible is downloaded) or /plans
//   • Makes it clear the app still works — it's just this new page that
//     wasn't cached yet.
//
// NOTE: The app shell itself IS always cached by Serwist, so this page
// should almost never appear in practice. It's the last-resort fallback
// for uncached navigations.

import { useState, useEffect } from 'react'
import { WifiOff, BookOpen, CheckCircle2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  const [streak, setStreak] = useState(null)
  const [plans,  setPlans]  = useState([])
  const [user,   setUser]   = useState(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem('dw_streak')
      if (s) setStreak(JSON.parse(s))
    } catch {}
    try {
      const p = localStorage.getItem('dw_plans')
      if (p) {
        const all = JSON.parse(p)
        setPlans(all.filter(pl => pl.status === 'active').slice(0, 3))
      }
    } catch {}
    try {
      const u = localStorage.getItem('dw_user')
      if (u) setUser(JSON.parse(u))
    } catch {}
  }, [])

  const name = user?.name || user?.username || 'Friend'

  return (
    <div className="flex flex-col min-h-screen px-5 pt-10 pb-28"
      style={{ background: 'var(--bg, #FAF8F5)' }}>

      {/* Offline badge */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: '#EDE9FF' }}>
          <WifiOff size={16} style={{ color: '#5B4FCF' }} />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: '#5B4FCF' }}>
          Offline mode
        </span>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-bold text-[28px] leading-tight mb-2"
          style={{ fontFamily: 'Lora, serif', color: 'var(--text, #1A1A2E)' }}>
          Hey {name} 👋
        </h1>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted, #6B7280)' }}>
          You're offline, but your daily walk continues.
          Everything you've downloaded is available below.
        </p>
      </div>

      {/* Streak card */}
      {streak?.current > 0 && (
        <div className="rounded-[20px] p-5 mb-4 flex items-center gap-4"
          style={{ background: '#EDE9FF', border: '1px solid #C4B8F8' }}>
          <span style={{ fontSize: 36 }}>🔥</span>
          <div>
            <p className="font-bold text-[22px]" style={{ color: '#5B4FCF' }}>
              {streak.current}-day streak
            </p>
            <p className="text-[13px]" style={{ color: '#7C6FCD' }}>Keep it going today</p>
          </div>
        </div>
      )}

      {/* Active plans */}
      {plans.length > 0 && (
        <div className="mb-6">
          <p className="font-bold text-[14px] mb-3" style={{ color: 'var(--text-muted, #6B7280)' }}>
            YOUR PLANS
          </p>
          <div className="flex flex-col gap-3">
            {plans.map(plan => (
              <Link key={plan.id} href="/plans"
                className="flex items-center gap-3 rounded-[16px] p-4 active:opacity-80"
                style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border, #E5E7EB)' }}>
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ background: '#EDE9FF' }}>
                  <BookOpen size={18} style={{ color: '#5B4FCF' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate"
                    style={{ color: 'var(--text, #1A1A2E)' }}>{plan.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted, #6B7280)' }}>
                    Day {plan.currentDay || 1} of {plan.totalDays || plan.days?.length || '?'}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-faint, #9CA3AF)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="flex flex-col gap-3">
        <Link href="/read"
          className="flex items-center justify-center gap-2 py-4 rounded-full font-bold text-[15px] text-white"
          style={{ background: '#5B4FCF' }}>
          <BookOpen size={18} />
          Open Bible reader
        </Link>

        <button onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 py-4 rounded-full font-bold text-[15px]"
          style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border, #E5E7EB)', color: 'var(--text, #1A1A2E)' }}>
          <CheckCircle2 size={18} />
          Retry connection
        </button>
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-[12px] leading-relaxed"
        style={{ color: 'var(--text-faint, #9CA3AF)' }}>
        Your check-ins, streaks, and plans are always saved locally.{'\n'}
        Changes will sync when you reconnect.
      </p>
    </div>
  )
}