'use client'

// ── src/contexts/AuthContext.js ──
//
// Single source of truth for auth state across the entire app.
//
// Why this exists:
//   Before this, every page (profile, communities, etc.) called sb.auth.getUser()
//   independently on mount. Each call is async, so pages would flash blank/broken
//   while waiting. Worse: if createClient() returned null (the require() bug),
//   every page independently failed silently.
//
//   Now: auth state is resolved ONCE here, on app load. Every page reads from
//   this context synchronously — no duplicate network calls, no race conditions.
//
// Add <AuthProvider> to layout.js (inside DarkModeProvider, outside AuthGateProvider):
//   <DarkModeProvider>
//     <AuthProvider>
//       <AuthGateProvider>
//         ...
//       </AuthGateProvider>
//     </AuthProvider>
//   </DarkModeProvider>

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'

const AuthContext = createContext({
  user:    null,   // Supabase auth user
  profile: null,   // profiles table row
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuthContext() {
  return useContext(AuthContext)
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function patchLocalStorage(supabaseUser, profile) {
  try {
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem('dw_user') || '{}') } catch { return {} }
    })()
    localStorage.setItem('dw_user', JSON.stringify({
      ...existing,
      id:          supabaseUser.id,
      username:    profile?.username    || existing.username    || '',
      name:        profile?.full_name   || profile?.username    || existing.name || '',
      email:       supabaseUser.email   || existing.email       || '',
      companionId: profile?.companion_id || existing.companionId || 'david',
      walkStage:   profile?.walk_stage  || existing.walkStage   || '',
      goal:        profile?.spiritual_goal || existing.goal     || '',
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

// ─────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const sb = createClient()
    if (!sb) { setLoading(false); return }

    // Validate session with Supabase servers on every load
    sb.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        const p = await fetchProfile(u.id)
        setUser(u)
        setProfile(p)
        patchLocalStorage(u, p)
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    // Keep in sync across tabs and after token refresh
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          setUser(session.user)
          setProfile(p)
          patchLocalStorage(session.user, p)
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [fetchProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    const sb = createClient()
    try { await sb?.auth.signOut() } catch {}
    setUser(null); setProfile(null)
    try {
      ['dw_user','dw_onboarding_complete','dw_streak','dw_checkins','dw_plans','dw_nuggets']
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}