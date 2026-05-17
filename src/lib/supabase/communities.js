// ── src/lib/supabase/communities.js ──
// All queries use the clean schema:
//   profiles, communities, memberships, posts, comments, likes, saved_posts
// All IDs are UUID. auth.uid() compares directly — no casting.
// Public reads (SELECT) never require auth.
// All writes require a valid Supabase session.

import { createClient } from './client'

// ─────────────────────────────────────────────
//  Get the current auth user from Supabase session
//  Returns null for unauthenticated users.
// ─────────────────────────────────────────────
export async function getAuthUser() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    return {
      id:    user.id,   // UUID — matches auth.uid() in RLS
      name:  user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Friend',
      email: user.email,
    }
  } catch { return null }
}

// ─────────────────────────────────────────────
//  Slug generator
// ─────────────────────────────────────────────
function makeSlug(name) {
  return (name || 'community')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 5)
}

// ─────────────────────────────────────────────
//  COMMUNITIES — READ
// ─────────────────────────────────────────────

export async function getCommunities() {
  const sb   = createClient()
  const user = await getAuthUser()
  if (!sb) return []

  const { data, error } = await sb
    .from('communities')
    .select('*, memberships!left(user_id)')
    .order('member_count', { ascending: false })
  if (error) { console.warn('[communities]', error.message); return [] }

  return (data || []).map(c => ({
    ...c,
    joined: user
      ? (c.memberships || []).some(m => m.user_id === user.id)
      : false,
  }))
}

export async function getCommunityBySlug(slug) {
  const sb   = createClient()
  const user = await getAuthUser()
  if (!sb || !slug) return null

  // UUID or slug — handle both
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
  const { data, error } = await sb
    .from('communities')
    .select('*, memberships!left(user_id)')
    .eq(isUUID ? 'id' : 'slug', slug)
    .maybeSingle()
  if (error) { console.warn('[communities]', error.message); return null }
  if (!data) return null

  return {
    ...data,
    joined: user
      ? (data.memberships || []).some(m => m.user_id === user.id)
      : false,
  }
}

// Alias
export const getCommunityById = getCommunityBySlug

export async function getJoinedCommunities() {
  const user = await getAuthUser()
  if (!user) return []
  const sb = createClient()
  if (!sb) return []

  const { data, error } = await sb
    .from('memberships')
    .select('community_id, communities(*)')
    .eq('user_id', user.id)
  if (error) { console.warn('[communities]', error.message); return [] }

  return (data || [])
    .filter(r => r.communities)
    .map(r => ({ ...r.communities, joined: true }))
}

// ─────────────────────────────────────────────
//  MEMBERSHIP
// ─────────────────────────────────────────────

export async function checkMembership(communityId) {
  const user = await getAuthUser()
  if (!user) return false
  const sb = createClient()

  const { data } = await sb
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()
  return !!data
}

export async function joinCommunity(communityId) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  // member_count is updated automatically by the DB trigger on_membership_change
  const { error } = await sb
    .from('memberships')
    .insert({ user_id: user.id, community_id: communityId })
  if (error && error.code !== '23505') throw error  // ignore duplicate
}

export async function leaveCommunity(communityId) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  const { error } = await sb
    .from('memberships')
    .delete()
    .eq('user_id', user.id)
    .eq('community_id', communityId)
  if (error) throw error
}

// ─────────────────────────────────────────────
//  COMMUNITIES — CREATE
// ─────────────────────────────────────────────

export async function createCommunity(fields) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  const { data, error } = await sb
    .from('communities')
    .insert({
      slug:        makeSlug(fields.name),
      name:        fields.name,
      description: fields.description || '',
      category:    fields.category    || 'General',
      visibility:  fields.visibility  || 'public',
      invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      created_by:  user.id,
      owner_name:  user.name,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, joined: true }
}

// ─────────────────────────────────────────────
//  POSTS — READ
// ─────────────────────────────────────────────

export async function getPosts(communityId) {
  const sb   = createClient()
  const user = await getAuthUser()
  if (!sb || !communityId) return []

  const { data, error } = await sb
    .from('posts')
    .select(`
      *,
      profiles ( username, full_name, avatar_url ),
      likes ( count ),
      comments ( count )
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) { console.warn('[communities]', error.message); return [] }

  // Batch-fetch which posts the current user has liked
  let likedSet = new Set()
  if (user && data?.length) {
    const { data: userLikes } = await sb
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', data.map(p => p.id))
    ;(userLikes || []).forEach(l => likedSet.add(l.post_id))
  }

  return (data || []).map(p => normalisePost(p, user?.id, likedSet))
}

export async function getForYouFeed(limit = 50) {
  const user = await getAuthUser()
  if (!user) return []
  const sb = createClient()
  if (!sb) return []

  // Get all communities the user has joined
  const { data: memberships } = await sb
    .from('memberships')
    .select('community_id')
    .eq('user_id', user.id)
  const communityIds = (memberships || []).map(m => m.community_id)
  if (communityIds.length === 0) return []

  const { data, error } = await sb
    .from('posts')
    .select(`
      *,
      profiles ( username, full_name, avatar_url ),
      communities ( id, name, slug ),
      likes ( count ),
      comments ( count )
    `)
    .in('community_id', communityIds)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.warn('[communities]', error.message); return [] }

  let likedSet = new Set()
  if (data?.length) {
    const { data: userLikes } = await sb
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', data.map(p => p.id))
    ;(userLikes || []).forEach(l => likedSet.add(l.post_id))
  }

  return (data || []).map(p => normalisePost(p, user.id, likedSet))
}

// ─────────────────────────────────────────────
//  POSTS — WRITE
// ─────────────────────────────────────────────

export async function createPost(communityId, fields) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  const { data, error } = await sb
    .from('posts')
    .insert({
      community_id: communityId,
      user_id:      user.id,
      content:      fields.content,
      passage:      fields.passage   || null,
      post_type:    fields.type      || 'general',
    })
    .select(`*, profiles ( username, full_name, avatar_url )`)
    .single()
  if (error) throw error
  return normalisePost(data, user.id, new Set())
}

export async function deletePost(postId) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  const { error } = await sb
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)
  if (error) throw error
}

// ─────────────────────────────────────────────
//  LIKES
// ─────────────────────────────────────────────

export async function toggleLike(postId) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  // Check current state
  const { data: existing } = await sb
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  if (existing) {
    await sb.from('likes').delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
    return false // now unliked
  } else {
    await sb.from('likes').insert({ user_id: user.id, post_id: postId })
    return true  // now liked
  }
}

// ─────────────────────────────────────────────
//  COMMENTS
// ─────────────────────────────────────────────

export async function getComments(postId) {
  const sb = createClient()
  if (!sb) return []

  const { data, error } = await sb
    .from('comments')
    .select('*, profiles ( username, full_name, avatar_url )')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) { console.warn('[communities]', error.message); return [] }
  return (data || []).map(normaliseComment)
}

export async function addComment(postId, text) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  const { data, error } = await sb
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, content: text })
    .select('*, profiles ( username, full_name, avatar_url )')
    .single()
  if (error) throw error
  return normaliseComment(data)
}

// ─────────────────────────────────────────────
//  SAVED POSTS
// ─────────────────────────────────────────────

export async function savePost(postId) {
  const user = await getAuthUser()
  if (!user) throw new Error('not_authenticated')
  const sb = createClient()

  await sb.from('saved_posts')
    .insert({ user_id: user.id, post_id: postId })
    .then(() => null, () => null) // ignore duplicate
}

export async function unsavePost(postId) {
  const user = await getAuthUser()
  if (!user) return
  const sb = createClient()

  await sb.from('saved_posts')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId)
}

export async function getSavedPosts() {
  const user = await getAuthUser()
  if (!user) return []
  const sb = createClient()

  const { data, error } = await sb
    .from('saved_posts')
    .select(`
      *,
      posts (
        *,
        profiles ( username, full_name, avatar_url ),
        communities ( id, name, slug ),
        likes ( count ),
        comments ( count )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[communities]', error.message); return [] }

  return (data || [])
    .filter(r => r.posts)
    .map(r => ({ ...normalisePost(r.posts, user.id, new Set()), savedAt: r.created_at }))
}

export async function isPostSaved(postId) {
  const user = await getAuthUser()
  if (!user) return false
  const sb = createClient()

  const { data } = await sb
    .from('saved_posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()
  return !!data
}

// ─────────────────────────────────────────────
//  REAL-TIME SUBSCRIPTIONS
// ─────────────────────────────────────────────

export function subscribeToNewPosts(communityId, onInsert) {
  const sb = createClient()
  if (!sb) return () => null

  const channel = sb
    .channel(`posts:${communityId}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'posts',
      filter: `community_id=eq.${communityId}`,
    }, async payload => {
      if (!payload.new) return
      // Hydrate author from profiles
      const { data: profile } = await sb
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', payload.new.user_id)
        .single()
      const post = normalisePost(
        { ...payload.new, profiles: profile },
        null,
        new Set()
      )
      onInsert(post)
    })
    .subscribe()

  return () => { try { sb.removeChannel(channel) } catch {} }
}

// Alias for backward compat
export const subscribeToCommunityPosts = subscribeToNewPosts

export function subscribeToNewComments(postId, onInsert) {
  const sb = createClient()
  if (!sb) return () => null

  const channel = sb
    .channel(`comments:${postId}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'comments',
      filter: `post_id=eq.${postId}`,
    }, async payload => {
      if (!payload.new) return
      const { data: profile } = await sb
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', payload.new.user_id)
        .single()
      onInsert(normaliseComment({ ...payload.new, profiles: profile }))
    })
    .subscribe()

  return () => { try { sb.removeChannel(channel) } catch {} }
}

export const subscribeToComments = subscribeToNewComments

// ─────────────────────────────────────────────
//  NORMALISERS
//  Convert Supabase rows → consistent app shape.
//  Components always receive the same structure.
// ─────────────────────────────────────────────

function normalisePost(row, currentUserId, likedSet) {
  const profile = row.profiles || {}
  return {
    id:            row.id,
    communityId:   row.community_id,
    communityName: row.communities?.name || null,
    communitySlug: row.communities?.slug || null,
    authorId:      row.user_id,
    authorName:    profile.full_name || profile.username || 'Anonymous',
    authorUsername:profile.username  || null,
    authorAvatar:  profile.avatar_url || null,
    content:       row.content,
    passage:       row.passage    || null,
    type:          row.post_type  || 'general',
    liked:         currentUserId ? likedSet.has(row.id) : false,
    like_count:    row.likes?.[0]?.count    ?? row.like_count    ?? 0,
    comment_count: row.comments?.[0]?.count ?? row.comment_count ?? 0,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function normaliseComment(row) {
  const profile = row.profiles || {}
  return {
    id:            row.id,
    postId:        row.post_id,
    authorId:      row.user_id,
    authorName:    profile.full_name || profile.username || 'Anonymous',
    authorUsername:profile.username  || null,
    authorAvatar:  profile.avatar_url || null,
    content:       row.content,
    createdAt:     row.created_at,
  }
}