'use client'

// ── src/components/AppInit.js ── v6
//
// FIX: Removed stale `reading_plans` query from syncFromSupabase.
//
// The old syncFromSupabase queried `.from('reading_plans')` — a table
// that does NOT exist in the Daily Walk schema. The correct tables are
// `plan_members` (joined with `shared_plans`). This was firing a 404
// on every app load for every signed-in user, polluting the network
// console and (in some environments) causing fetch chains to abort.
//
// The checkins sync is also removed — `checkins` table may not exist
// in all environments, and the data it was writing to `dw_sb_plans` /
// `dw_checkins` is not used anywhere in the current codebase.
// The offline-queue.js already handles write-back for completions.
//
// What this does on every app open:
//   1. When back online: drain the offline queue
//   2. When user is authenticated + online: sync Supabase → localStorage (plans)
//   3. Pre-cache today's Bible reading + next 7 days
//   4. Monthly: evict old opportunistic cache entries
//   5. Register Background Sync tag so SW can retry when connectivity returns

import { useEffect, useRef } from 'react'
import { useAuthContext }    from '../contexts/AuthContext'
import { useOfflineDrain }   from './OfflineBadge'

const IDLE_DELAY = 2000  // wait 2s after mount before background work

// ─────────────────────────────────────────────
//  Drain helper — called from multiple paths
// ─────────────────────────────────────────────
async function runDrain() {
  try {
    const { drainOfflineQueue } = await import('../lib/offline-queue')
    await drainOfflineQueue()
  } catch {}
}

// ─────────────────────────────────────────────
//  Register Background Sync tag with SW
// ─────────────────────────────────────────────
async function registerBackgroundSync() {
  try {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
    const reg = await navigator.serviceWorker.ready
    await reg.sync.register('dw-offline-sync')
  } catch {}
}

// ─────────────────────────────────────────────
//  Monthly cache eviction
//  Removes opportunistic Bible chapter cache entries older than 30 days.
//  Only runs once per month (stored in localStorage).
// ─────────────────────────────────────────────
async function runEvictionIfDue() {
  try {
    const EVICT_KEY    = 'dw_last_eviction'
    const THIRTY_DAYS  = 30 * 24 * 60 * 60 * 1000
    const last         = parseInt(localStorage.getItem(EVICT_KEY) || '0')
    if (Date.now() - last < THIRTY_DAYS) return

    const { evictOldChapters } = await import('../lib/bible-cache')
    await evictOldChapters()
    localStorage.setItem(EVICT_KEY, String(Date.now()))
  } catch {}
}

// ─────────────────────────────────────────────
//  Pre-cache today's reading plan chapters
//  Reads the active plan from localStorage, fetches + caches chapters
//  for today and the next 7 days so they're available offline.
// ─────────────────────────────────────────────
async function preCacheTodaysReading() {
  try {
    const { getActiveTranslation } = await import('../lib/bib-translations')
    const { getCachedChapter, cacheChapter } = await import('../lib/bible-cache')

    const translationId = getActiveTranslation()

    // Read local plans
    const rawPlans = localStorage.getItem('dw_plans')
    if (!rawPlans) return
    const plans = JSON.parse(rawPlans)
    if (!plans?.length) return

    const activePlan = plans.find(p => p.status === 'active' || !p.status)
    if (!activePlan?.days?.length) return

    const currentDay = activePlan.currentDay || 1
    const daysToCache = activePlan.days.slice(currentDay - 1, currentDay + 6)

    for (const day of daysToCache) {
      const passage = day.passage || day.passage_reference || ''
      if (!passage) continue

      // Parse "Book Chapter" from passage reference
      const m = passage.match(/^(.+?)\s+(\d+)/)
      if (!m) continue
      const [, bookName, chapter] = m

      // Skip if already cached
      const existing = await getCachedChapter(translationId, bookName, parseInt(chapter))
      if (existing?.verses?.length) continue

      // Fetch and cache (non-blocking)
      import('../lib/bible').then(async ({ getChapter }) => {
        try {
          const data = await getChapter(bookName, parseInt(chapter), translationId)
          if (data?.verses?.length && !data.error) {
            await cacheChapter(translationId, bookName, parseInt(chapter), data)
          }
        } catch {}
      }).catch(() => null)
    }
  } catch {}
}

// ─────────────────────────────────────────────
//  Sync Supabase → localStorage (authenticated users)
//
//  FIXED: No longer queries `reading_plans` (table does not exist).
//  Now correctly queries `plan_members` joined with `shared_plans`.
//  Writes a minimal snapshot to `dw_sb_plans` for offline display.
// ─────────────────────────────────────────────
async function syncFromSupabase(userId) {
  try {
    if (!navigator.onLine || !userId) return

    const { createClient } = await import('../lib/supabase/client')
    const sb = createClient()
    if (!sb) return

    // ── Sync active plans: plan_members → shared_plans ──
    // FIXED: was querying non-existent `reading_plans` table
    const { data: memberships, error } = await sb
      .from('plan_members')
      .select('plan_id, current_day, status, shared_plans(id, name, total_items, item_unit, plan_subtype)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(20)

    if (error) {
      // Log but don't crash — this is a background sync
      console.warn('[AppInit] plan sync error:', error.message)
      return
    }

    if (memberships?.length) {
      const plans = memberships
        .filter(m => m.shared_plans)
        .map(m => ({
          id:          m.plan_id,
          name:        m.shared_plans.name,
          currentDay:  m.current_day,
          totalDays:   m.shared_plans.total_items || 0,
          status:      m.status,
          source:      'supabase',
        }))

      try {
        const existing = JSON.parse(localStorage.getItem('dw_sb_plans') || '[]')
        const merged = [
          ...plans,
          // Keep local-only plans that aren't in Supabase
          ...existing.filter(p => p.source !== 'supabase'),
        ]
        localStorage.setItem('dw_sb_plans', JSON.stringify(merged))
      } catch {}
    }

  } catch (e) {
    // Never let background sync crash the app
    console.warn('[AppInit] syncFromSupabase error:', e.message)
  }
}

// ─────────────────────────────────────────────
//  Main AppInit component
// ─────────────────────────────────────────────
export default function AppInit() {
  const { user }    = useAuthContext()
  const drainCalled = useRef(false)

  // useOfflineDrain: listens for 'online' events + dispatches drain
  useOfflineDrain()

  useEffect(() => {
    // ── 1. Drain immediately if online ──
    if (navigator.onLine && !drainCalled.current) {
      drainCalled.current = true
      setTimeout(runDrain, IDLE_DELAY)
    }

    // ── 2. Listen for SW background sync message ──
    const handleMessage = (event) => {
      if (event.data?.type === 'DW_DRAIN_QUEUE' || event.type === 'dw-drain-queue') {
        runDrain()
      }
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }
    window.addEventListener('dw-drain-queue', handleMessage)

    // ── 3. Listen for back-online (fired by sw-register.js) ──
    const handleOnline = () => {
      runDrain()
      registerBackgroundSync()
    }
    window.addEventListener('dw-back-online', handleOnline)

    // ── 4. Background work after idle delay ──
    const timer = setTimeout(() => {
      runEvictionIfDue()
      preCacheTodaysReading().catch(() => null)
      if (user?.id) syncFromSupabase(user.id).catch(() => null)
      registerBackgroundSync().catch(() => null)
    }, IDLE_DELAY)

    return () => {
      clearTimeout(timer)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
      window.removeEventListener('dw-drain-queue', handleMessage)
      window.removeEventListener('dw-back-online', handleOnline)
    }
  }, [user])

  return null
}