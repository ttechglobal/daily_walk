'use client'

// ── src/components/AppInit.js ──
// Runs once on app load (mounted in layout.js).
// Listens for Supabase auth state changes.
// On sign-in: pull from Supabase → localStorage, then push any local-only data up.
// This is the trigger point for cross-device data sync.

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
        runSync(session.user.id)
      }
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        runSync(session.user.id)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  async function runSync(userId) {
    try {
      // 1. Pull authoritative data from Supabase into localStorage
      await syncSupabaseToLocal(userId)
      // 2. Push any local-only data (created before sign-in) up to account
      await syncLocalToSupabase(userId)
    } catch (e) {
      console.warn('[AppInit] sync error (non-fatal):', e.message)
    }
  }

  return null
}