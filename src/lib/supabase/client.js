// ── lib/supabase/client.js ──
// Returns null if env vars not set — app falls back to localStorage silently.

let _client = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_project_url') return null

  if (_client) return _client

  try {
    // Dynamic import so bundle doesn't break when package not installed
    const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs')
    _client = createClientComponentClient({ supabaseUrl: url, supabaseKey: key })
    return _client
  } catch {
    return null
  }
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'your_supabase_project_url')
}