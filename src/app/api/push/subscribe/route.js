// ── POST /api/push/subscribe ──
// Saves push subscription to Supabase with user_id.
// Called after requestNotificationPermission() succeeds.

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { subscription, userId } = await request.json()
    if (!subscription) return NextResponse.json({ error: 'No subscription' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (url && key && url !== 'your_supabase_project_url') {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(url, key)
        await sb.from('push_subscriptions').upsert({
          user_id:      userId || null,
          subscription: JSON.stringify(subscription),
        }, { onConflict: 'user_id' })
      } catch (e) {
        console.warn('push subscribe error:', e.message)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}