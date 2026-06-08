'use client'

// ── src/hooks/useCheckin.js ──
// OFFLINE-FIRST check-in hook.
//
// Before: wrote to Supabase first, then updated localStorage.
// Offline: the Supabase write failed, nothing was saved.
//
// After: writes to localStorage FIRST (instant, works offline).
// Queues a Supabase write that runs when back online.
// The user's streak and check-in record are never lost.

import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { enqueueOfflineAction } from '../lib/offline-queue'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function calcStreak(checkins = []) {
  if (!checkins.length) return { current: 0, longest: 0, lastCheckinDate: null }

  const dates = [...new Set(checkins.map(c => (c.date || '').split('T')[0]))]
    .filter(Boolean)
    .sort()
    .reverse()

  const today = todayStr()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Streak is alive if last check-in was today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return { current: 0, longest: 0, lastCheckinDate: dates[0] || null }
  }

  let current = 0
  let d = new Date(dates[0])
  for (const date of dates) {
    const diff = Math.round((new Date(dates[0]) - new Date(date)) / 86400000)
    if (diff === current) current++
    else break
  }

  // Calculate longest (simplified)
  let longest = current
  let run     = 1
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((new Date(dates[i - 1]) - new Date(dates[i])) / 86400000)
    if (gap === 1) { run++; if (run > longest) longest = run }
    else run = 1
  }

  return { current, longest, lastCheckinDate: dates[0] || null }
}

export function useCheckin() {
  const [checkins,    setCheckins]    = useLocalStorage('dw_checkins', [])
  const [streak,      setStreak]      = useLocalStorage('dw_streak',   { current: 0, longest: 0, lastCheckinDate: null })
  const [saving,      setSaving]      = useState(false)

  const today = todayStr()

  const isCheckedInToday = checkins.some(c => (c.date || '').startsWith(today))

  const checkIn = useCallback(async ({ passage = '', reflection = '' } = {}) => {
    if (isCheckedInToday) return { alreadyDone: true }
    setSaving(true)

    const newCheckin = {
      id:         `ci_${Date.now()}`,
      date:       today,
      passage,
      reflection,
      createdAt:  new Date().toISOString(),
      synced:     false,
    }

    // 1. Write to localStorage IMMEDIATELY (works offline)
    const updatedCheckins = [newCheckin, ...checkins]
    setCheckins(updatedCheckins)

    const newStreak = calcStreak(updatedCheckins)
    setStreak(newStreak)

    // 2. Queue Supabase write for when online
    enqueueOfflineAction('checkin', {
      date:        today,
      passage,
      reflection,
      createdAt:   newCheckin.createdAt,
    })

    // 3. If online, also try Supabase immediately (non-blocking)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      writeCheckinToSupabase(passage, reflection, today).then(() => {
        // Mark as synced in localStorage
        setCheckins(prev => prev.map(c =>
          c.id === newCheckin.id ? { ...c, synced: true } : c
        ))
        // Remove from queue since it was written immediately
        import('../lib/offline-queue').then(({ getOfflineQueue, removeFromQueue }) => {
          const q = getOfflineQueue()
          const item = q.find(i => i.type === 'checkin' && i.payload.date === today)
          if (item) removeFromQueue(item.id)
        }).catch(() => null)
      }).catch(() => null)  // failed — already queued, will retry
    }

    setSaving(false)

    // Fire check-in event (triggers install prompt, etc.)
    try {
      window.dispatchEvent(new CustomEvent('dw-first-checkin'))
    } catch {}

    return { success: true, streak: newStreak }
  }, [checkins, isCheckedInToday, today, setCheckins, setStreak])

  return {
    checkins,
    streak,
    isCheckedInToday,
    saving,
    checkIn,
  }
}

// Non-blocking Supabase write — called when online
async function writeCheckinToSupabase(passage, reflection, date) {
  const { createClient } = await import('../lib/supabase/client')
  const sb = createClient()
  if (!sb) return

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return

  await sb.from('checkins').upsert({
    user_id:         user.id,
    checked_in_date: date,
    passage:         passage  || null,
    reflection:      reflection || null,
  }, { onConflict: 'user_id,checked_in_date', ignoreDuplicates: true })

  // Update streak in profiles table
  await sb.from('profiles').upsert({
    id:                user.id,
    last_checkin_date: date,
  }, { onConflict: 'id' })
}