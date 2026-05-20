// ── src/app/api/push/send/route.js ──
// Unified push notification sender.
// Handles all notification types: community_post, new_member, community_remind, daily_remind.
// Uses VAPID + web-push. Reads push_subscriptions from Supabase.
// memberships table name is 'memberships' (not 'community_members' — matches your schema).

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!vapidPublic || !vapidPrivate || vapidPublic === 'your_vapid_public_key') {
      return NextResponse.json({ success: false, reason: 'VAPID not configured' })
    }
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, reason: 'Supabase service key not configured' })
    }

    const body = await request.json()
    const {
      type        = 'general',
      title,
      body:       msgBody,
      url         = '/',
      userId,          // single user
      communityId,     // all members of a community
      excludeUser,     // exclude this user_id when sending to a community
      adminOnly,       // only send to community creator/admin
    } = body

    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(supabaseUrl, serviceKey)

    const webpush = await import('web-push')
    webpush.default.setVapidDetails('mailto:hello@dailywalk.app', vapidPublic, vapidPrivate)

    const payload = JSON.stringify({ title, body: msgBody, url, type })

    // ── Resolve target user IDs ──
    let targetUserIds = []

    if (userId) {
      // Single user
      targetUserIds = [userId]
    } else if (communityId) {
      if (adminOnly) {
        // Only send to community creator
        const { data: comm } = await sb.from('communities')
          .select('created_by').eq('id', communityId).single()
        if (comm?.created_by) targetUserIds = [comm.created_by]
      } else {
        // All members except excluded user
        const { data: members } = await sb.from('memberships')
          .select('user_id').eq('community_id', communityId)
        targetUserIds = (members || [])
          .map(m => m.user_id)
          .filter(id => id !== excludeUser)
      }
    }

    if (!targetUserIds.length) {
      return NextResponse.json({ success: true, sent: 0, reason: 'No targets' })
    }

    // ── Fetch push subscriptions for target users ──
    const { data: pushSubs, error: subsErr } = await sb.from('push_subscriptions')
      .select('subscription, user_id').in('user_id', targetUserIds)

    if (subsErr) {
      console.error('[push/send] subs fetch error:', subsErr.message)
      return NextResponse.json({ success: false, error: subsErr.message }, { status: 500 })
    }

    if (!pushSubs?.length) {
      return NextResponse.json({ success: true, sent: 0, reason: 'No subscriptions found' })
    }

    // ── Send to all subscriptions, remove expired ones ──
    const results = await Promise.allSettled(
      pushSubs.map(async row => {
        const sub = typeof row.subscription === 'string'
          ? JSON.parse(row.subscription)
          : row.subscription
        try {
          await webpush.default.sendNotification(sub, payload)
          return { ok: true }
        } catch (e) {
          // 410 = subscription expired, remove it
          if (e.statusCode === 410) {
            await sb.from('push_subscriptions').delete().eq('user_id', row.user_id).catch(() => null)
          }
          return { ok: false, error: e.message }
        }
      })
    )

    const sent   = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length
    const failed = results.length - sent

    console.log(`[push/send] type=${type} sent=${sent} failed=${failed} targets=${targetUserIds.length}`)
    return NextResponse.json({ success: true, sent, failed })
  } catch (e) {
    console.error('[push/send] error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}