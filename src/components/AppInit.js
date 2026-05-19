'use client'

// ── src/components/AppInit.js ──
//
// Handles data sync on sign-in. Auth state itself is managed by AuthContext.
// This component only cares about syncing Supabase ↔ localStorage when a
// session is detected — it does NOT manage or duplicate session state.

import { useEffect, useRef } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { syncSupabaseToLocal, syncLocalToSupabase } from '../lib/supabase/sync'

export default function AppInit() {
  const { user, loading } = useAuthContext()
  const lastSyncedId = useRef(null)

  useEffect(() => {
    // Don't run until auth has resolved
    if (loading) return
    // Don't sync anonymously
    if (!user?.id) return
    // Don't re-sync if we already ran for this user in this session
    if (lastSyncedId.current === user.id) return

    lastSyncedId.current = user.id
    runSync(user.id)
  }, [user?.id, loading])

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