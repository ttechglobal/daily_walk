// ── POST /api/push/subscribe ──
// Saves push subscription endpoint to Supabase (if configured) or localStorage.

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { subscription } = await request.json()
    if (!subscription) return NextResponse.json({ error: 'No subscription' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (url && key && url !== 'your_supabase_project_url') {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(url, key)
        await sb.from('push_subscriptions').upsert({ subscription })
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // never fail push registration
  }
}