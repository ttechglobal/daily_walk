'use client'

// ── AppInit — Part 5 ──
// Runs once on app mount (client-only). Handles:
//  - Re-registering notification timers after page reload (timers are lost on reload)
//  - Scheduling challenge nudges if enabled
// This is a zero-render component — returns null.

import { useEffect } from 'react'
import {
  getNotificationSettings,
  scheduleDailyReminder,
  sendChallengeNudge,
} from '../lib/notifications'

export default function AppInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const settings = getNotificationSettings()

      // Re-register daily reminder timer (lost on reload)
      if (settings.dailyReminder) {
        scheduleDailyReminder(settings.hour, settings.minute)
      }

      // Schedule challenge nudges at the same time as daily reminder
      if (settings.challengeNudges && settings.dailyReminder) {
        const challenges = JSON.parse(localStorage.getItem('dw_challenges') || '[]')
        const joined = challenges.filter(c => c.joined)

        joined.forEach(challenge => {
          const now  = new Date()
          const next = new Date()
          next.setHours(settings.hour, settings.minute + 2, 0, 0) // 2min after daily
          if (next <= now) next.setDate(next.getDate() + 1)
          const delay = next.getTime() - now.getTime()
          setTimeout(() => sendChallengeNudge(challenge.title), delay)
        })
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [])

  return null
}