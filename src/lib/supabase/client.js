// ── src/lib/supabase/client.js ──
//
// FIX: Singleton was caching null or a broken client on first call,
// then returning that forever. Auth calls would hang with no error.
//
// Changes:
//   1. Singleton keyed on URL — rebuilds if env var changes.
//   2. isSupabaseConfigured() exported for pre-call guard in auth pages.

import { createClient as _create } from '@supabase/supabase-js'

let _client    = null
let _clientUrl = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'your_supabase_project_url') return null

  // Rebuild if URL changed (hot reload, env var fix)
  if (_client && _clientUrl === url) return _client

  _client = _create(url, key, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
    },
  })
  _clientUrl = url
  return _client
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'your_supabase_project_url')
}