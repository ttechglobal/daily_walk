// ── src/lib/supabase/server.js ──
// Server-side Supabase client for Route Handlers and Server Components.
// Uses the service role key when available (Route Handlers / API routes),
// falls back to anon key for Server Components.
// Does NOT use @supabase/auth-helpers-nextjs — that package conflicts
// with the JS client's session storage and causes signInWithPassword to hang.

import { createClient } from '@supabase/supabase-js'

/**
 * For Route Handlers (API routes) — uses service role key if available.
 * Never call this from client components.
 */
export function createServerClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) return null

  const key = serviceKey || anonKey
  if (!key || url === 'your_supabase_project_url') return null

  return createClient(url, key, {
    auth: {
      persistSession:  false,   // server — never persist
      autoRefreshToken: false,
    },
  })
}

/**
 * For Server Components that need anon-level access.
 * Uses the anon key only — respects RLS.
 */
export function createAnonServerClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'your_supabase_project_url') return null

  return createClient(url, key, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
  })
}