'use client'

// Shared check-in logic — the ONLY place that increments streak.
// Used by: home screen CTA, BibleReader "Mark as read", checkin page.

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayStr, yesterdayStr } from '../lib/constants'

export function useCheckin() {
  const [checkins, setCheckins] = useLocalStorage('dw_checkins', [])
  const [streak,   setStreak]   = useLocalStorage('dw_streak', { current: 0, longest: 0, lastCheckinDate: null })

  const isCheckedInToday = streak?.lastCheckinDate === todayStr()

  const performCheckin = useCallback(({ passage, reflection, nugget, shared, challengeTag } = {}) => {
    const today     = todayStr()
    const yesterday = yesterdayStr()

    // Compute new streak
    let newCurrent = 1
    if (streak?.lastCheckinDate === today) {
      // Already checked in today — just return, don't double-count
      return false
    } else if (streak?.lastCheckinDate === yesterday) {
      newCurrent = (streak.current || 0) + 1
    }
    const newLongest = Math.max(newCurrent, streak?.longest || 0)

    // Save streak
    setStreak({ current: newCurrent, longest: newLongest, lastCheckinDate: today })

    // Save check-in entry
    const entry = {
      id: `ci_${Date.now()}`,
      date: today,
      passage: passage?.trim() || null,
      reflection: reflection?.trim() || null,
      nugget: nugget?.trim() || null,
      shared: shared ?? false,
      challengeTag: challengeTag || null,
      likedCommunityIds: [],
    }
    setCheckins(prev => [entry, ...(prev || [])])
    return true
  }, [streak, setStreak, setCheckins])

  return { performCheckin, isCheckedInToday, streak, checkins }
}