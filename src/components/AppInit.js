'use client'

// ── src/components/AppInit.js ──
// v3 — Offline cache integration.
// Changes from v2:
//   • useOfflineDrain() called on mount — drains any Bible passages
//     that were queued for caching when the user was offline at plan join time.
//   • Drain runs silently, only when online — never blocks the UI.
//   • evictOldOpportunisticCache() called monthly to keep IndexedDB tidy.

import { useEffect, useRef } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { syncSupabaseToLocal, syncLocalToSupabase } from '../lib/supabase/sync'
import { useOfflineDrain } from './OfflineBadge'    // ← NEW

// ─────────────────────────────────────────────
//  Eviction — run at most once per 30 days
//  Clears opportunistic cache entries older than 30 days.
//  Plan-guaranteed entries are never touched.
// ─────────────────────────────────────────────
function runEvictionIfDue() {
  try {
    const key       = 'dw_cache_evict_last'
    const lastRaw   = localStorage.getItem(key)
    const now       = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000

    if (lastRaw && now - parseInt(lastRaw) < thirtyDays) return

    // Dynamic import — only loads when actually running
    import('../lib/bible-cache').then(({ evictOldOpportunisticCache }) => {
      evictOldOpportunisticCache(30).then(() => {
        try { localStorage.setItem(key, String(now)) } catch {}
      }).catch(() => null)
    }).catch(() => null)
  } catch {}
}

export default function AppInit() {
  const { user, loading } = useAuthContext()
  const lastSyncedId = useRef(null)

  // ← NEW: drain queued Bible passages when online
  // This hook listens for navigator.onLine changes and drains automatically
  useOfflineDrain()

  useEffect(() => {
    // Don't run until auth has resolved
    if (loading) return
    if (!user?.id) return
    if (lastSyncedId.current === user.id) return

    lastSyncedId.current = user.id
    runSync(user.id)

    // ← NEW: run cache eviction check on each sign-in (throttled to monthly)
    runEvictionIfDue()
  }, [user?.id, loading])

  async function runSync(userId) {
    try {
      await syncSupabaseToLocal(userId)
      await syncLocalToSupabase(userId)
    } catch (e) {
      console.warn('[AppInit] sync error (non-fatal):', e.message)
    }
  }

  return null
}