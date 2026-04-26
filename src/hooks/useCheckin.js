'use client'

// ── useCheckin — single source of truth for check-in + streak ──
// Update 5: accepts challengeId (not challengeTag) and optionally
// creates a Post in the challenge's posts array.

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayStr, yesterdayStr, SEED_CHALLENGES } from '../lib/constants'

export function useCheckin() {
  const [checkins,   setCheckins]   = useLocalStorage('dw_checkins',  [])
  const [streak,     setStreak]     = useLocalStorage('dw_streak',    { current: 0, longest: 0, lastCheckinDate: null })
  const [challenges, setChallenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const [user]                      = useLocalStorage('dw_user',       null)

  const isCheckedInToday = streak?.lastCheckinDate === todayStr()

  /**
   * performCheckin — call once when the user confirms they read today.
   * @param passage      - what was read (string)
   * @param reflection   - reflection text (string)
   * @param challengeId  - id of challenge to tag (string | null)
   * @returns true if check-in was recorded, false if already done today
   */
  const performCheckin = useCallback(({ passage = '', reflection = '', challengeId = null } = {}) => {
    const today     = todayStr()
    const yesterday = yesterdayStr()

    if (streak?.lastCheckinDate === today) return false

    // ── Streak calculation ──
    let newCurrent = 1
    if (streak?.lastCheckinDate === yesterday) newCurrent = (streak.current || 0) + 1
    const newLongest = Math.max(newCurrent, streak?.longest || 0)
    setStreak({ current: newCurrent, longest: newLongest, lastCheckinDate: today })

    // ── Check-in record ──
    const checkinId = `ci_${Date.now()}`
    const entry = {
      id:          checkinId,
      date:        today,
      passage:     passage?.trim()    || null,
      reflection:  reflection?.trim() || null,
      challengeId: challengeId        || null,
      createdAt:   new Date().toISOString(),
    }
    setCheckins(prev => [entry, ...(prev || [])])

    // ── Update 5: if challenge tagged + has content, add a Post to that challenge ──
    if (challengeId && (passage?.trim() || reflection?.trim())) {
      const displayName = user?.name?.trim() || 'Anonymous'
      const newPost = {
        id:          `post_${Date.now()}`,
        userId:      'local_user',
        displayName,
        passage:     passage?.trim()    || '',
        reflection:  reflection?.trim() || '',
        challengeId,
        createdAt:   new Date().toISOString(),
      }
      setChallenges(prev => (prev || []).map(c =>
        c.id === challengeId
          ? { ...c, posts: [newPost, ...(c.posts || [])] }
          : c
      ))
    }

    return true
  }, [streak, setStreak, setCheckins, setChallenges, user])

  return { performCheckin, isCheckedInToday, streak, checkins }
}