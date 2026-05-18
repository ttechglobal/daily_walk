'use client'

// ── src/components/AppInit.js ──
// Runs once on app load (mounted in layout.js).
// Listens for Supabase auth state changes.
//
// FIX: On SIGNED_IN, now writes username from profiles table to dw_user localStorage.
// This ensures any component reading localStorage immediately sees the correct username,
// even before the profile page or communities page has a chance to load.

import { useEffect } from 'react'
import { createClient } from '../lib/supabase/client'
import { syncSupabaseToLocal, syncLocalToSupabase } from '../lib/supabase/sync'

export default function AppInit() {
  useEffect(() => {
    const sb = createClient()
    if (!sb) return

    // Check current session on load (handles page refresh while logged in)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        hydrateUserFromSupabase(sb, session.user)
        runSync(session.user.id)
      }
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        hydrateUserFromSupabase(sb, session.user)
        runSync(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        // Clear auth-specific localStorage keys on sign-out
        try {
          localStorage.removeItem('dw_user')
          localStorage.removeItem('dw_onboarding_complete')
        } catch {}
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  async function hydrateUserFromSupabase(sb, authUser) {
    // Fetch the profile to get the real username.
    // This is the single source of truth — not auth metadata.
    try {
      const { data: profile } = await sb.from('profiles')
        .select('username, full_name, avatar_url, companion_id, walk_stage, onboarding_complete')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!profile) return

      // Merge into localStorage without overwriting unrelated fields
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem('dw_user') || '{}') } catch { return {} }
      })()

      localStorage.setItem('dw_user', JSON.stringify({
        ...stored,
        id:          authUser.id,
        username:    profile.username  || stored.username  || '',
        name:        profile.full_name || profile.username || stored.name || '',
        email:       authUser.email,
        companionId: profile.companion_id || stored.companionId || 'david',
        walkStage:   profile.walk_stage   || stored.walkStage   || '',
        joinedAt:    stored.joinedAt || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      }))

      if (profile.onboarding_complete) {
        localStorage.setItem('dw_onboarding_complete', 'true')
      }
    } catch (e) {
      console.warn('[AppInit] profile hydration failed (non-fatal):', e.message)
    }
  }

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