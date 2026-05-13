// ── lib/supabase/server.js ──
// Server-side Supabase client. Returns null when not configured.

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_project_url') return null
  try {
    const { createServerComponentClient } = require('@supabase/auth-helpers-nextjs')
    const { cookies }                      = require('next/headers')
    return createServerComponentClient({ cookies })
  } catch { return null }
}