// ── src/lib/supabase/getAuthUser.js ──
// OFFLINE-FIRST getAuthUser replacement.
//
// The old getAuthUser() in communities.js called sb.auth.getUser() — a network
// call — on every single data fetch. That means every feed, every community
// load, every post action waited for a Supabase round-trip before doing anything.
// Offline: instant hang. Slow connection: visible lag before any data.
//
// This version reads from localStorage first (instant, works offline).
// It optionally validates with Supabase in the background.
//
// Usage:
//   import { getAuthUser } from '../lib/supabase/getAuthUser'
//   const user = await getAuthUser()           // fast, offline-safe
//   const user = await getAuthUser({ fresh: true }) // forces Supabase call
//
// Drop-in replacement for the getAuthUser() exported from communities.js.

import { createClient } from './client'

function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem('dw_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    if (!u?.id) return null
    return {
      id:         u.id,
      name:       u.name       || u.username || '',
      username:   u.username   || '',
      email:      u.email      || '',
      avatar_url: u.avatar_url || null,
      _fromCache: true,
    }
  } catch { return null }
}

let _cachedSession = null  // in-memory session cache
let _cacheTime     = 0

export async function getAuthUser({ fresh = false } = {}) {
  // 1. Return in-memory cache if recent (< 60s)
  const now = Date.now()
  if (!fresh && _cachedSession && (now - _cacheTime) < 60_000) {
    return _cachedSession
  }

  // 2. Try Supabase (with 5s timeout)
  const sb = createClient()
  if (sb && (fresh || navigator.onLine)) {
    try {
      const result = await Promise.race([
        sb.auth.getUser(),
        new Promise(resolve => setTimeout(() => resolve({ _timeout: true }), 5000)),
      ])

      if (!result?._timeout) {
        const { data: { user }, error } = result
        if (!error && user) {
          const { data: profile } = await sb.from('profiles')
            .select('username, full_name, display_name, avatar_url')
            .eq('id', user.id).maybeSingle()

          const resolved = {
            id:         user.id,
            name:       profile?.full_name || profile?.display_name || profile?.username || user.email?.split('@')[0] || '',
            username:   profile?.username  || '',
            email:      user.email,
            avatar_url: profile?.avatar_url || null,
            _fromCache: false,
          }

          _cachedSession = resolved
          _cacheTime     = now
          return resolved
        }
      }
    } catch {}
  }

  // 3. Offline fallback — read from localStorage
  const cached = readFromLocalStorage()
  if (cached) {
    _cachedSession = cached
    _cacheTime     = now
  }
  return cached
}

// Clear the cache (call on sign-out)
export function clearAuthUserCache() {
  _cachedSession = null
  _cacheTime     = 0
}