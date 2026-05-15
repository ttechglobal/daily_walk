// ── lib/supabase/client.js ──
// Uses @supabase/supabase-js directly — no auth-helpers dependency needed.
// Returns null gracefully if env vars not set — app falls back to localStorage.

let _client = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'your_supabase_project_url') return null
  if (_client) return _client

  try {
    const { createClient: create } = require('@supabase/supabase-js')
    _client = create(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
    return _client
  } catch {
    // Package not installed — app runs in localStorage-only mode
    return null
  }
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'your_supabase_project_url')
}