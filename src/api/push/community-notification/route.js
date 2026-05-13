// ── POST /api/push/community-notification ──
// Called by Supabase webhook when a new community post is created.
// Sends push notification to all community members except the post author.

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, reason: 'Not configured' })
    }

    const body = await request.json()
    // Supabase webhook payload: body.record contains the new row
    const post = body.record || body

    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(supabaseUrl, serviceKey)

    // Get community name
    const { data: community } = await sb.from('communities')
      .select('name').eq('id', post.community_id).single()
    const communityName = community?.name || 'a community'

    // Get author name
    const { data: author } = await sb.from('profiles')
      .select('display_name').eq('id', post.author_id).single()
    const authorName = author?.display_name || 'Someone'

    // Get all member subscriptions except the author
    const { data: members } = await sb.from('community_members')
      .select('user_id').eq('community_id', post.community_id).neq('user_id', post.author_id)
    const memberIds = (members || []).map(m => m.user_id)
    if (!memberIds.length) return NextResponse.json({ success: true, sent: 0 })

    const { data: pushSubs } = await sb.from('push_subscriptions')
      .select('subscription').in('user_id', memberIds)

    const webpush = await import('web-push')
    webpush.default.setVapidDetails('mailto:hello@dailywalk.app', vapidPublic, vapidPrivate)

    const payload = JSON.stringify({
      title: `${authorName} posted in ${communityName}`,
      body:  (post.content || '').slice(0, 100),
      url:   `/communities/${post.community_id}`,
    })

    const results = await Promise.allSettled(
      (pushSubs || []).map(s => webpush.default.sendNotification(s.subscription, payload))
    )

    return NextResponse.json({ success: true, sent: results.filter(r => r.status === 'fulfilled').length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}