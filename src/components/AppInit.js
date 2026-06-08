'use client'

// ── src/components/AppInit.js ──
// OFFLINE-FIRST — v4
//
// What this does on every app open:
//   1. When user is authenticated: sync Supabase → localStorage (non-blocking)
//   2. When online: pre-cache today's Bible reading + next 7 days
//   3. When back online: drain queued Bible passages
//   4. Monthly: evict old opportunistic cache entries
//
// CRITICAL: NOTHING here blocks rendering.
// All operations are fire-and-forget after a short idle delay.
// If any of these fail, the app is unaffected.

import { useEffect, useRef } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useOfflineDrain } from './OfflineBadge'

const IDLE_DELAY = 2000  // wait 2s after mount before running background work

function runEvictionIfDue() {
  try {
    const key      = 'dw_cache_evict_last'
    const lastRaw  = localStorage.getItem(key)
    const now      = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (lastRaw && now - parseInt(lastRaw) < thirtyDays) return
    import('../lib/bible-cache').then(({ evictOldOpportunisticCache }) => {
      evictOldOpportunisticCache(30)
        .then(() => { try { localStorage.setItem(key, String(now)) } catch {} })
        .catch(() => null)
    }).catch(() => null)
  } catch {}
}

// Pre-cache today's assigned Bible chapters so they work offline tomorrow
async function preCacheTodaysReading() {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const { getActiveTranslation } = await import('../lib/bib-translations')
    const { getCachedChapter, cacheChapter } = await import('../lib/bible-cache')
    const translationId = getActiveTranslation()

    // Get today's plan day passages from localStorage
    const plansRaw = localStorage.getItem('dw_plans')
    if (!plansRaw) return
    const plans = JSON.parse(plansRaw)
    const activePlans = plans.filter(p => p.status === 'active')

    for (const plan of activePlans) {
      const today = plan.currentDay || 1
      const days  = plan.days || []

      // Cache today + next 7 days
      for (let d = today; d <= Math.min(today + 7, days.length); d++) {
        const day = days[d - 1]
        if (!day?.passages) continue

        for (const ref of day.passages) {
          try {
            const { parseRef } = await import('../lib/bible')
            const { bookId, chapter } = parseRef(ref)
            const already = await getCachedChapter(translationId, bookId, chapter)
            if (already) continue

            // Fetch and cache (low priority — don't block anything)
            const { getChapterUrl } = await import('../lib/bib-translations')
            const url = getChapterUrl(translationId, bookId, chapter)
            const res = await fetch(url)
            if (!res.ok) continue
            const data = await res.json()

            await cacheChapter(translationId, bookId, chapter, {
              verses:        data.verses || [],
              book:          data.book,
              bookId,
              chapter,
              translationId,
              source:        'storage',
            }, { priority: 'plan' })

            // Small delay between fetches to protect free-tier limits
            await new Promise(r => setTimeout(r, 150))
          } catch { continue }
        }
      }
    }
  } catch (e) {
    console.warn('[AppInit] preCacheTodaysReading (non-fatal):', e.message)
  }
}

// Sync Supabase → localStorage (non-blocking, best-effort)
async function runSync(userId) {
  try {
    const { syncSupabaseToLocal, syncLocalToSupabase } = await import('../lib/supabase/sync')
    // Push local writes first (check-ins created offline), then pull fresh data
    await syncLocalToSupabase(userId)
    await syncSupabaseToLocal(userId)
  } catch (e) {
    console.warn('[AppInit] sync error (non-fatal):', e.message)
  }
}

export default function AppInit() {
  const { user, loading } = useAuthContext()
  const lastSyncedId = useRef(null)
  const initDone = useRef(false)

  // Drain queued Bible passages when back online
  useOfflineDrain()

  useEffect(() => {
    if (loading) return  // wait for auth to resolve (instant now with cache-first)
    if (initDone.current) return
    initDone.current = true

    // Delay all background work so it doesn't compete with first render
    const timer = setTimeout(() => {
      // Pre-cache Bible reading (works for guest users too)
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        preCacheTodaysReading().catch(() => null)
      }

      // Run monthly eviction
      runEvictionIfDue()
    }, IDLE_DELAY)

    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    if (loading) return
    if (!user?.id) return
    if (lastSyncedId.current === user.id) return
    if (user._fromCache) return  // don't sync on cached user — wait for real session

    lastSyncedId.current = user.id

    // Delay sync so it doesn't compete with initial render
    const timer = setTimeout(() => {
      runSync(user.id).catch(() => null)
      runEvictionIfDue()
    }, IDLE_DELAY)

    return () => clearTimeout(timer)
  }, [user?.id, user?._fromCache, loading])

  return null
}