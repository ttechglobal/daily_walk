import { createClient as _create } from '@supabase/supabase-js'

let _client    = null
let _clientUrl = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'your_supabase_project_url') return null
  if (_client && _clientUrl === url) return _client

  _client = _create(url, key, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      // Use localStorage only — no cookie storage.
      // auth-helpers-nextjs was conflicting here and causing signInWithPassword to hang.
      storage:            typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey:         'dw-auth-token',
      flowType:           'implicit',
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