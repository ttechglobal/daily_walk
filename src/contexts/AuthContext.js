'use client'

// ── src/contexts/AuthContext.js ──
// OFFLINE-FIRST AUTH — v4
//
// Strategy: "show cached, validate in background"
//
// BEFORE (broken offline):
//   1. Call sb.auth.getUser() — network call
//   2. Wait for response (hangs if offline)
//   3. setLoading(false) — never happens offline
//   4. App renders nothing forever
//
// AFTER (offline-first):
//   1. Read dw_user from localStorage — INSTANT, no network
//   2. setLoading(false) immediately — app renders right away
//   3. In background: try sb.auth.getUser() with 8s timeout
//   4. If succeeds → update state + localStorage
//   5. If fails (offline/slow) → keep showing cached user, no disruption
//
// Users who have signed in before will ALWAYS see their app immediately.
// First-time users (no localStorage) see the app in guest mode immediately.

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '../lib/supabase/client'

const AuthContext = createContext({
  user:           null,
  profile:        null,
  loading:        true,
  isOfflineMode:  false,
  signOut:        async () => {},
  refreshProfile: async () => {},
})

export function useAuthContext() {
  return useContext(AuthContext)
}

// ─────────────────────────────────────────────
//  Read cached user from localStorage
//  Returns a synthetic "user" shape so the rest of the app
//  can treat it the same as a Supabase auth user.
// ─────────────────────────────────────────────
function readCachedUser() {
  try {
    const raw = localStorage.getItem('dw_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    if (!u?.id) return null
    return {
      // Supabase-compatible shape
      id:    u.id,
      email: u.email || '',
      // Extra fields the app uses
      _fromCache: true,
    }
  } catch { return null }
}

function readCachedProfile() {
  try {
    const raw = localStorage.getItem('dw_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    if (!u?.id) return null
    return {
      id:           u.id,
      username:     u.username     || '',
      full_name:    u.name         || u.username || '',
      display_name: u.name         || u.username || '',
      avatar_url:   u.avatar_url   || null,
      companion_id: u.companionId  || 'david',
      walk_stage:   u.walkStage    || '',
      _fromCache:   true,
    }
  } catch { return null }
}

function patchLocalStorage(supabaseUser, profile) {
  try {
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem('dw_user') || '{}') } catch { return {} }
    })()
    localStorage.setItem('dw_user', JSON.stringify({
      ...existing,
      id:          supabaseUser.id,
      username:    profile?.username     || existing.username    || '',
      name:        profile?.full_name    || profile?.username    || existing.name || '',
      email:       supabaseUser.email    || existing.email       || '',
      companionId: profile?.companion_id || existing.companionId || 'david',
      walkStage:   profile?.walk_stage   || existing.walkStage   || '',
      goal:        profile?.spiritual_goal || existing.goal      || '',
      joinedAt:    existing.joinedAt || (
        profile?.created_at
          ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      ),
    }))
    if (profile?.onboarding_complete) {
      localStorage.setItem('dw_onboarding_complete', 'true')
    }
  } catch {}
}

// Race a promise against a timeout — returns null on timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve({ _timeout: true }), ms)),
  ])
}

export function AuthProvider({ children }) {
  const [user,           setUser]          = useState(null)
  const [profile,        setProfile]       = useState(null)
  const [loading,        setLoading]       = useState(true)
  const [isOfflineMode,  setIsOfflineMode] = useState(false)
  const validatingRef = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    const sb = createClient()
    if (!sb || !userId) return null
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
      return data || null
    } catch { return null }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    const p = await fetchProfile(user.id)
    if (p) { setProfile(p); patchLocalStorage(user, p) }
  }, [user, fetchProfile])

  useEffect(() => {
    // ── STEP 1: Show cached user IMMEDIATELY (zero network) ──
    const cachedUser    = readCachedUser()
    const cachedProfile = readCachedProfile()

    if (cachedUser) {
      setUser(cachedUser)
      setProfile(cachedProfile)
    }

    // Unblock the UI right now — don't wait for network
    setLoading(false)

    // ── STEP 2: Validate in background (non-blocking) ──
    const sb = createClient()
    if (!sb) return

    async function validateInBackground() {
      if (validatingRef.current) return
      validatingRef.current = true

      try {
        // 8 second timeout — if Supabase is slow or offline, we give up gracefully
        const result = await withTimeout(sb.auth.getUser(), 8000)

        if (result?._timeout) {
          // Network too slow or offline — stay with cached user
          setIsOfflineMode(true)
          return
        }

        const { data: { user: u }, error } = result

        if (error || !u) {
          // Token expired or invalid — if we had a cached user, keep showing them
          // but mark as needing re-auth. Don't clear the UI.
          if (cachedUser) {
            setIsOfflineMode(true)
          } else {
            setUser(null)
            setProfile(null)
          }
          return
        }

        // Valid session — fetch fresh profile and update everything
        const p = await fetchProfile(u.id)
        setUser(u)
        setProfile(p)
        setIsOfflineMode(false)
        patchLocalStorage(u, p)

      } catch {
        // Any network error — stay with cached state
        setIsOfflineMode(true)
      } finally {
        validatingRef.current = false
      }
    }

    validateInBackground()

    // ── STEP 3: Listen for auth changes (sign in/out, token refresh) ──
    let subscription = null
    try {
      const { data } = sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const p = await fetchProfile(session.user.id)
            setUser(session.user)
            setProfile(p)
            setIsOfflineMode(false)
            patchLocalStorage(session.user, p)
          }
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setIsOfflineMode(false)
        }
      })
      subscription = data?.subscription
    } catch {}

    return () => subscription?.unsubscribe()
  }, [fetchProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    const sb = createClient()
    try { await sb?.auth.signOut() } catch {}
    setUser(null)
    setProfile(null)
    setIsOfflineMode(false)
    try {
      ['dw_user', 'dw_onboarding_complete', 'dw_streak', 'dw_checkins', 'dw_plans', 'dw_nuggets']
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isOfflineMode,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}