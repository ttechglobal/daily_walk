'use client'

// ── AppInit — runs once on app mount ──
// Advances plan day counters, re-registers notification timers.

import { useEffect } from 'react'
import { getNotificationSettings, scheduleDailyReminder, sendChallengeNudge, initNotifications } from '../lib/notifications'
import { advanceAllPlans } from '../lib/plans'

export default function AppInit() {
  useEffect(() => {
    // Init notification timers (daily reminder, weekly summary)
    initNotifications()
    if (typeof window === 'undefined') return
    try {
      // Advance plan day counters if yesterday's reading is done
      advanceAllPlans()

      const settings = getNotificationSettings()
      if (settings.dailyReminder) scheduleDailyReminder(settings.hour, settings.minute)

      if (settings.challengeNudges && settings.dailyReminder) {
        const challenges = JSON.parse(localStorage.getItem('dw_challenges') || '[]')
        const joined = challenges.filter(c => c.joined)
        joined.forEach(challenge => {
          const now  = new Date()
          const next = new Date()
          next.setHours(settings.hour, settings.minute + 2, 0, 0)
          if (next <= now) next.setDate(next.getDate() + 1)
          setTimeout(() => sendChallengeNudge(challenge.title), next.getTime() - now.getTime())
        })
      }
    } catch {}
  }, [])

  return null
}