// ── POST /api/push/send ──
// Send a push notification to a user or community members.
// Requires VAPID keys. Gracefully no-ops if not configured.

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!vapidPublic || !vapidPrivate ||
        vapidPublic === 'your_vapid_public_key') {
      return NextResponse.json({ success: false, reason: 'VAPID not configured' })
    }

    const { userId, communityId, title, body, url = '/' } = await request.json()

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      'mailto:hello@dailywalk.app',
      vapidPublic,
      vapidPrivate
    )

    const payload = JSON.stringify({ title, body, url })
    const subs    = []

    // Fetch subscriptions from Supabase if configured
    if (supabaseUrl && serviceKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(supabaseUrl, serviceKey)

        if (communityId) {
          const { data: members } = await sb.from('community_members')
            .select('user_id').eq('community_id', communityId)
          const memberIds = (members || []).map(m => m.user_id)
          if (memberIds.length) {
            const { data: pushSubs } = await sb.from('push_subscriptions')
              .select('subscription').in('user_id', memberIds)
            subs.push(...(pushSubs || []).map(s => s.subscription))
          }
        } else if (userId) {
          const { data: pushSubs } = await sb.from('push_subscriptions')
            .select('subscription').eq('user_id', userId)
          subs.push(...(pushSubs || []).map(s => s.subscription))
        }
      } catch {}
    }

    // Send to all found subscriptions
    const results = await Promise.allSettled(
      subs.map(sub => webpush.default.sendNotification(sub, payload))
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ success: true, sent })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}