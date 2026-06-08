'use client'

// ── src/components/AppInit.js — OFFLINE-FIRST v5 ──
//
// What this does on every app open:
//   1. When back online: drain the offline queue (via SW Background Sync message OR online event)
//   2. When user is authenticated + online: sync Supabase → localStorage (non-blocking)
//   3. Pre-cache today's Bible reading + next 7 days
//   4. Monthly: evict old opportunistic cache entries
//   5. Register Background Sync tag so SW can retry when connectivity returns
//
// CRITICAL: NOTHING here blocks rendering. All fire-and-forget after short idle delay.

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
    await reg.sync.register('dw-offline-queue')
  } catch {}
}

// ─────────────────────────────────────────────
//  Cache eviction — once per 30 days
// ─────────────────────────────────────────────
function runEvictionIfDue() {
  try {
    const key        = 'dw_cache_evict_last'
    const lastRaw    = localStorage.getItem(key)
    const now        = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (lastRaw && now - parseInt(lastRaw) < thirtyDays) return
    import('../lib/bible-cache').then(({ evictOldOpportunisticCache }) => {
      evictOldOpportunisticCache(30)
        .then(() => { try { localStorage.setItem(key, String(now)) } catch {} })
        .catch(() => null)
    }).catch(() => null)
  } catch {}
}

// ─────────────────────────────────────────────
//  Pre-cache today's assigned Bible chapters
// ─────────────────────────────────────────────
async function preCacheTodaysReading() {
  try {
    if (!navigator.onLine) return

    const { getActiveTranslation } = await import('../lib/bib-translations')
    const { getCachedChapter, cacheChapter } = await import('../lib/bible-cache')
    const translationId = getActiveTranslation()

    const plansRaw = localStorage.getItem('dw_plans')
    if (!plansRaw) return
    const plans       = JSON.parse(plansRaw)
    const activePlans = plans.filter(p => p.status === 'active')

    for (const plan of activePlans) {
      const today = plan.currentDay || 1
      const days  = plan.days || []

      // Cache today + next 7 days
      for (let d = today; d < Math.min(today + 7, days.length + 1); d++) {
        const dayPassage = days[d - 1]?.passage_reference || days[d - 1]?.passage
        if (!dayPassage) continue

        const m = dayPassage.match(/^(.+?)\s+(\d+)/)
        if (!m) continue
        const [, bookName, chapter] = m

        // Skip if already cached
        const existing = await getCachedChapter(translationId, bookName, parseInt(chapter))
        if (existing?.verses?.length) continue

        // Fetch and cache (non-blocking — don't await all at once)
        import('../lib/bible').then(async ({ getChapter }) => {
          try {
            const data = await getChapter(bookName, parseInt(chapter), translationId)
            if (data?.verses?.length && !data.error) {
              await cacheChapter(translationId, bookName, parseInt(chapter), data)
            }
          } catch {}
        }).catch(() => null)
      }
    }
  } catch {}
}

// ─────────────────────────────────────────────
//  Sync Supabase → localStorage (authenticated users)
// ─────────────────────────────────────────────
async function syncFromSupabase(userId) {
  try {
    if (!navigator.onLine || !userId) return

    const { createClient } = await import('../lib/supabase/client')
    const sb = createClient()
    if (!sb) return

    // Sync checkins
    const { data: checkins } = await sb
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (checkins?.length) {
      const normalised = checkins.map(c => ({
        id:         c.id,
        date:       c.checked_in_date,
        passage:    c.passage || '',
        reflection: c.reflection || '',
        createdAt:  c.created_at,
        synced:     true,
      }))
      try { localStorage.setItem('dw_checkins', JSON.stringify(normalised)) } catch {}
    }

    // Sync active Supabase plans (slugs → names stored locally for offline display)
    const { data: plans } = await sb
      .from('reading_plans')
      .select('id, name, slug, total_days, current_day, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(20)
    if (plans?.length) {
      try {
        const existing = JSON.parse(localStorage.getItem('dw_sb_plans') || '[]')
        // Merge — don't overwrite local-only plans
        const merged = [
          ...plans.map(p => ({ ...p, source: 'supabase' })),
          ...existing.filter(p => p.source !== 'supabase'),
        ]
        localStorage.setItem('dw_sb_plans', JSON.stringify(merged))
      } catch {}
    }

  } catch {}
}

// ─────────────────────────────────────────────
//  Main AppInit component
// ─────────────────────────────────────────────
export default function AppInit() {
  const { user }    = useAuthContext()
  const drainCalled = useRef(false)

  // useOfflineDrain: listens for 'online' events + dispatches drain
  // (defined in OfflineBadge — kept for backwards compat)
  useOfflineDrain()

  useEffect(() => {
    // ── 1. Drain immediately if online (catches queued items from offline session) ──
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