'use client'

// ── hooks/useCommunityNotifications.js ──
// Real-time community post notifications via Supabase.
// Falls back silently when not configured.

import { useEffect } from 'react'
import { createClient } from '../lib/supabase/client'
import { addAppNotification } from '../lib/notifications'

export function useCommunityNotifications(communityIds = []) {
  useEffect(() => {
    const sb = createClient()
    if (!sb || !communityIds.length) return

    const channel = sb
      .channel('community-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_posts',
      }, async payload => {
        const post = payload.new
        if (!communityIds.includes(post.community_id)) return

        // Get community name for the notification
        try {
          const { data: community } = await sb
            .from('communities').select('name').eq('id', post.community_id).single()
          const name    = community?.name || 'a community'
          const snippet = post.content?.slice(0, 60) || ''

          addAppNotification({
            type:  'community_post',
            title: `New post in ${name}`,
            body:  snippet,
            url:   `/communities/${post.community_id}`,
          })
        } catch {}
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [communityIds.join(',')])
}