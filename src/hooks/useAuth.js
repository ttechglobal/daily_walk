'use client'

// ── hooks/useAuth.js ──
// Auth state management. Falls back gracefully if Supabase not configured.

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    if (!sb) { setLoading(false); return }

    // Get initial session
    sb.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      setUser(data?.session?.user || null)
      setLoading(false)
    }).catch(() => setLoading(false))

    // Listen to auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    session,
    isLoading:       loading,
    isAuthenticated: !!user,
  }
}