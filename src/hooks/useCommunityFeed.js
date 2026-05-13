'use client'

// ── hooks/useCommunityFeed.js ──
// Real-time community feed. Uses Supabase subscriptions when configured,
// falls back to localStorage otherwise.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'
import { useLocalStorage } from './useLocalStorage'
import { SEED_COMMUNITIES } from '../lib/constants'

export function useCommunityFeed(communityId) {
  const [communities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const community     = (communities || []).find(c => c.id === communityId)
  const [posts,     setPosts]     = useState(community?.posts || [])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState(null)

  // Sync from localStorage when it changes
  useEffect(() => {
    if (community?.posts) setPosts(community.posts)
  }, [community?.posts])

  // Try Supabase real-time if configured
  useEffect(() => {
    const sb = createClient()
    if (!sb || !communityId) return

    setIsLoading(true)
    // Fetch latest posts
    sb.from('community_posts')
      .select('*, profiles(display_name)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); return }
        if (data?.length) {
          const mapped = data.map(p => ({
            id:             p.id,
            communityId:    p.community_id,
            authorId:       p.author_id,
            authorName:     p.profiles?.display_name || 'Anonymous',
            authorInitials: (p.profiles?.display_name || 'A').slice(0, 2).toUpperCase(),
            content:        p.content,
            passage:        p.passage,
            type:           p.post_type,
            likedBy:        [],
            comments:       [],
            createdAt:      p.created_at,
          }))
          setPosts(mapped)
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))

    // Subscribe to real-time inserts
    const channel = sb
      .channel(`community-${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_posts',
        filter: `community_id=eq.${communityId}`,
      }, payload => {
        const p = payload.new
        const newPost = {
          id: p.id, communityId: p.community_id,
          authorId: p.author_id, authorName: 'Someone',
          authorInitials: 'S', content: p.content,
          passage: p.passage, type: p.post_type,
          likedBy: [], comments: [], createdAt: p.created_at,
        }
        setPosts(prev => [newPost, ...prev])
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [communityId])

  return { posts, isLoading, error }
}