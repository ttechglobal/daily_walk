// ── src/lib/supabase/communities.js ──
// FIXES:
//  • joinCommunity: increments member_count via DB trigger (no manual update needed
//    after migration) — but also does optimistic local update for instant UI
//  • leaveCommunity: same
//  • createPostToMultiple: fires push notification to community members after post saved
//  • getForYouFeed: always re-queries (no stale cache) — fixes posts-disappearing bug
//    The cache is in the page component (loadedTabs), not here. This layer is always fresh.

import { createClient } from './client'

export async function getAuthUser() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data: { user }, error } = await sb.auth.getUser()
    if (error || !user) return null
    const { data: profile } = await sb.from('profiles')
      .select('username, full_name, display_name, avatar_url')
      .eq('id', user.id).maybeSingle()
    return {
      id:         user.id,
      name:       profile?.full_name || profile?.display_name || profile?.username || user.email?.split('@')[0] || '',
      username:   profile?.username  || '',
      email:      user.email,
      avatar_url: profile?.avatar_url || null,
    }
  } catch (e) {
    console.warn('[getAuthUser]', e.message)
    return null
  }
}

function makeSlug(name) {
  return (name || 'community')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 5)
}

// ─────────────────────────────────────────────
//  COMMUNITIES — READ
// ─────────────────────────────────────────────

export async function getCommunities() {
  const sb = createClient()
  if (!sb) return []
  const [commResult, authUser] = await Promise.all([
    sb.from('communities')
      .select('id,name,slug,description,category,visibility,member_count,created_by,owner_name,invite_code,created_at')
      .order('member_count', { ascending: false }),
    getAuthUser(),
  ])
  if (commResult.error) { console.error('[getCommunities]', commResult.error.message); return [] }
  const communities = commResult.data || []
  if (!communities.length) return []
  let joinedSet = new Set()
  if (authUser?.id) {
    const { data: memberships, error: memErr } = await sb
      .from('memberships').select('community_id').eq('user_id', authUser.id)
    if (!memErr) joinedSet = new Set((memberships || []).map(m => m.community_id))
  }
  return communities.map(c => ({ ...c, joined: joinedSet.has(c.id) }))
}

export async function getCommunityBySlug(slug) {
  const sb = createClient()
  if (!sb || !slug) return null
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
  const { data, error } = await sb.from('communities')
    .select('*').eq(isUUID ? 'id' : 'slug', slug).maybeSingle()
  if (error) { console.error('[getCommunityBySlug]', error.message); return null }
  if (!data) return null
  const authUser = await getAuthUser()
  let joined = false
  if (authUser?.id) {
    const { data: mem } = await sb.from('memberships').select('id')
      .eq('user_id', authUser.id).eq('community_id', data.id).maybeSingle()
    joined = !!mem
  }
  // Always fetch live member count
  const { count } = await sb.from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', data.id)
  return { ...data, joined, member_count: count ?? data.member_count }
}

export const getCommunityById = getCommunityBySlug

export async function getJoinedCommunities() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('memberships')
    .select('community_id, communities(*)').eq('user_id', authUser.id)
  if (error) { console.error('[getJoinedCommunities]', error.message); return [] }
  return (data || []).filter(r => r.communities).map(r => ({ ...r.communities, joined: true }))
}

export async function checkMembership(communityId) {
  const authUser = await getAuthUser()
  if (!authUser) return false
  const sb = createClient()
  const { data } = await sb.from('memberships').select('id')
    .eq('user_id', authUser.id).eq('community_id', communityId).maybeSingle()
  return !!data
}

// ─────────────────────────────────────────────
//  MEMBERSHIP — FIX: member_count handled by DB trigger
//  The trigger (MIGRATION.sql) auto-increments on INSERT and decrements on DELETE.
//  No manual update needed. The UI does optimistic updates locally.
// ─────────────────────────────────────────────

export async function joinCommunity(communityId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships')
    .insert({ user_id: authUser.id, community_id: communityId })
  // 23505 = unique_violation (already a member) — not an error
  if (error && error.code !== '23505') throw error
  // Notify new member join (non-blocking, best-effort)
  notifyNewMember(communityId, authUser.name || authUser.username || 'Someone').catch(() => null)
}

export async function leaveCommunity(communityId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships').delete()
    .eq('user_id', authUser.id).eq('community_id', communityId)
  if (error) throw error
}

// Non-blocking helper — notify community admin when someone joins
async function notifyNewMember(communityId, memberName) {
  try {
    await fetch('/api/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:        'new_member',
        communityId,
        title:       '👋 New member joined',
        body:        `${memberName} just joined your community`,
        url:         `/community/${communityId}`,
        adminOnly:   true,
      }),
    })
  } catch {}
}

export async function createCommunity(fields) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('communities').insert({
    slug:        makeSlug(fields.name),
    name:        fields.name,
    description: fields.description || '',
    category:    fields.category    || 'General',
    visibility:  fields.visibility  || 'public',
    invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    created_by:  authUser.id,
    owner_name:  authUser.name,
  }).select().single()
  if (error) throw error
  // Auto-join creator
  await sb.from('memberships').insert({ user_id: authUser.id, community_id: data.id }).catch(() => null)
  return { ...data, joined: true, member_count: 1 }
}

// ─────────────────────────────────────────────
//  POSTS — READ
// ─────────────────────────────────────────────

export async function getPosts(communityId) {
  const sb = createClient()
  if (!sb || !communityId) return []
  const authUser = await getAuthUser()
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,display_name,avatar_url), likes(count), comments(count)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false }).limit(60)
  if (error) { console.error('[getPosts]', error.message); return [] }
  let likedSet = new Set()
  if (authUser?.id && data?.length) {
    const { data: lk } = await sb.from('likes').select('post_id')
      .eq('user_id', authUser.id).in('post_id', data.map(p => p.id))
    ;(lk || []).forEach(l => likedSet.add(l.post_id))
  }
  return (data || []).map(p => normalisePost(p, authUser?.id, likedSet))
}

export async function getForYouFeed(limit = 50) {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  if (!sb) return []
  const { data: mem, error: memErr } = await sb.from('memberships')
    .select('community_id').eq('user_id', authUser.id)
  if (memErr) { console.warn('[getForYouFeed]', memErr.message); return [] }
  const ids = (mem || []).map(m => m.community_id)
  if (!ids.length) return []
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,display_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .in('community_id', ids)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) { console.error('[getForYouFeed]', error.message); return [] }
  let likedSet = new Set()
  if (data?.length) {
    const { data: lk } = await sb.from('likes').select('post_id')
      .eq('user_id', authUser.id).in('post_id', data.map(p => p.id))
    ;(lk || []).forEach(l => likedSet.add(l.post_id))
  }
  return (data || []).map(p => normalisePost(p, authUser.id, likedSet))
}

// ─────────────────────────────────────────────
//  POSTS — WRITE
//  FIX: after saving, fires push notification to community members
//  FIX: posts-disappearing — post is correctly returned so caller can prepend it
// ─────────────────────────────────────────────

export async function createPost(communityId, fields) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('posts')
    .insert({
      community_id: communityId,
      user_id:      authUser.id,
      content:      fields.content,
      passage:      fields.passage   || null,
      post_type:    fields.type      || 'general',
    })
    .select('*, profiles(username,full_name,display_name,avatar_url)')
    .single()
  if (error) throw error
  const post = normalisePost(data, authUser.id, new Set())
  // Notify community members (non-blocking)
  fireNewPostNotification(communityId, authUser.name || 'Someone', fields.content, authUser.id).catch(() => null)
  return post
}

export async function createPostToMultiple(communityIds, fields, isGlobal = false) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  if (!fields.content?.trim()) throw new Error('Post content cannot be empty.')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const validCommunityIds = (communityIds || []).filter(Boolean)
  const rows = []

  for (const cid of validCommunityIds) {
    rows.push({
      community_id: cid,
      user_id:      authUser.id,
      content:      fields.content.trim(),
      passage:      fields.passage  || null,
      post_type:    fields.type     || 'general',
      is_global:    isGlobal,
    })
  }

  if (isGlobal && validCommunityIds.length === 0) {
    rows.push({
      community_id: null,
      user_id:      authUser.id,
      content:      fields.content.trim(),
      passage:      fields.passage  || null,
      post_type:    fields.type     || 'general',
      is_global:    true,
    })
  }

  if (rows.length === 0) throw new Error('Select at least one destination.')

  const { data, error } = await sb.from('posts').insert(rows)
    .select('*, profiles(username,full_name,display_name,avatar_url), communities(id,name,slug)')
  if (error) throw error

  const posts = (data || []).map(p => normalisePost(p, authUser.id, new Set()))

  // Notify all selected communities (non-blocking)
  for (const cid of validCommunityIds) {
    fireNewPostNotification(cid, authUser.name || 'Someone', fields.content, authUser.id).catch(() => null)
  }

  return posts
}

// Fire push notification to all community members except the author
async function fireNewPostNotification(communityId, authorName, content, excludeUserId) {
  if (!communityId) return
  try {
    await fetch('/api/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:           'community_post',
        communityId,
        excludeUser:    excludeUserId,
        title:          `${authorName} just posted`,
        body:           (content || '').slice(0, 100),
        url:            `/community/${communityId}`,
      }),
    })
  } catch {}
}

export async function deletePost(postId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  await sb.from('posts').delete().eq('id', postId).eq('user_id', authUser.id)
}

// ─────────────────────────────────────────────
//  LIKES
// ─────────────────────────────────────────────

export async function toggleLike(postId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data: ex } = await sb.from('likes').select('id')
    .eq('user_id', authUser.id).eq('post_id', postId).maybeSingle()
  if (ex) {
    await sb.from('likes').delete().eq('user_id', authUser.id).eq('post_id', postId)
    return false
  } else {
    await sb.from('likes').insert({ user_id: authUser.id, post_id: postId })
    return true
  }
}

// ─────────────────────────────────────────────
//  COMMENTS
// ─────────────────────────────────────────────

export async function getComments(postId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('comments')
    .select('*, profiles(username,full_name,display_name,avatar_url)')
    .eq('post_id', postId).order('created_at', { ascending: true })
  if (error) { console.error('[getComments]', error.message); return [] }
  return (data || []).map(normaliseComment)
}

export async function addComment(postId, text) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('comments')
    .insert({ post_id: postId, user_id: authUser.id, content: text })
    .select('*, profiles(username,full_name,display_name,avatar_url)').single()
  if (error) throw error
  return normaliseComment(data)
}

// ─────────────────────────────────────────────
//  SAVED POSTS
// ─────────────────────────────────────────────

export async function savePost(postId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  await sb.from('saved_posts').insert({ user_id: authUser.id, post_id: postId })
    .then(() => null, () => null)
}

export async function unsavePost(postId) {
  const authUser = await getAuthUser()
  if (!authUser) return
  const sb = createClient()
  await sb.from('saved_posts').delete().eq('user_id', authUser.id).eq('post_id', postId)
}

export async function getSavedPosts() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  const { data, error } = await sb.from('saved_posts')
    .select('*, posts(*, profiles(username,full_name,display_name,avatar_url), communities(id,name,slug), likes(count), comments(count))')
    .eq('user_id', authUser.id).order('created_at', { ascending: false })
  if (error) { console.error('[getSavedPosts]', error.message); return [] }
  return (data || []).filter(r => r.posts)
    .map(r => ({ ...normalisePost(r.posts, authUser.id, new Set()), savedAt: r.created_at }))
}

export async function isPostSaved(postId) {
  const authUser = await getAuthUser()
  if (!authUser) return false
  const sb = createClient()
  const { data } = await sb.from('saved_posts').select('id')
    .eq('user_id', authUser.id).eq('post_id', postId).maybeSingle()
  return !!data
}

export async function getUserPosts() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,display_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .eq('user_id', authUser.id).order('created_at', { ascending: false })
  if (error) { console.error('[getUserPosts]', error.message); return [] }
  return (data || []).map(p => normalisePost(p, authUser.id, new Set()))
}

// ─────────────────────────────────────────────
//  NOTIFICATION TEMPLATES
// ─────────────────────────────────────────────

export async function getNotificationTemplates(communityId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('notification_templates')
    .select('*').eq('community_id', communityId).order('created_at', { ascending: false })
  if (error) { console.warn('[getNotificationTemplates]', error.message); return [] }
  return data || []
}

export async function saveNotificationTemplate(communityId, title, body) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('notification_templates').insert({
    community_id: communityId,
    created_by:   authUser.id,
    title,
    body,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteNotificationTemplate(templateId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  await sb.from('notification_templates').delete()
    .eq('id', templateId).eq('created_by', authUser.id)
}

// ─────────────────────────────────────────────
//  REAL-TIME
// ─────────────────────────────────────────────

export function subscribeToNewPosts(communityId, onInsert) {
  const sb = createClient(); if (!sb) return () => null
  const ch = sb.channel(`posts:${communityId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts',
      filter: `community_id=eq.${communityId}` }, async payload => {
      if (!payload.new) return
      const { data: profile } = await sb.from('profiles')
        .select('username,full_name,display_name,avatar_url').eq('id', payload.new.user_id).single()
      onInsert(normalisePost({ ...payload.new, profiles: profile }, null, new Set()))
    }).subscribe()
  return () => { try { sb.removeChannel(ch) } catch {} }
}
export const subscribeToCommunityPosts = subscribeToNewPosts

export function subscribeToNewComments(postId, onInsert) {
  const sb = createClient(); if (!sb) return () => null
  const ch = sb.channel(`comments:${postId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments',
      filter: `post_id=eq.${postId}` }, async payload => {
      if (!payload.new) return
      const { data: profile } = await sb.from('profiles')
        .select('username,full_name,display_name,avatar_url').eq('id', payload.new.user_id).single()
      onInsert(normaliseComment({ ...payload.new, profiles: profile }))
    }).subscribe()
  return () => { try { sb.removeChannel(ch) } catch {} }
}
export const subscribeToComments = subscribeToNewComments

// Real-time member count subscription
export function subscribeMemberCount(communityId, onChange) {
  const sb = createClient(); if (!sb) return () => null
  const ch = sb.channel(`members:${communityId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships',
      filter: `community_id=eq.${communityId}` }, async () => {
      // Re-fetch the real count on any membership change
      const { count } = await sb.from('memberships')
        .select('*', { count: 'exact', head: true }).eq('community_id', communityId)
      if (typeof count === 'number') onChange(count)
    }).subscribe()
  return () => { try { sb.removeChannel(ch) } catch {} }
}

// ─────────────────────────────────────────────
//  Normalisers
// ─────────────────────────────────────────────

function normalisePost(row, currentUserId, likedSet) {
  const p = row.profiles || {}
  return {
    id:            row.id,
    communityId:   row.community_id,
    communityName: row.communities?.name || (row.is_global ? 'Global' : null),
    communitySlug: row.communities?.slug || null,
    isGlobal:      row.is_global || false,
    authorId:      row.user_id,
    authorName:    p.full_name || p.display_name || p.username || 'Anonymous',
    authorUsername:p.username  || null,
    authorAvatar:  p.avatar_url || null,
    content:       row.content,
    passage:       row.passage   || null,
    type:          row.post_type || 'general',
    liked:         currentUserId ? (likedSet?.has?.(row.id) ?? false) : false,
    like_count:    row.likes?.[0]?.count    ?? row.like_count    ?? 0,
    comment_count: row.comments?.[0]?.count ?? row.comment_count ?? 0,
    createdAt:     row.created_at,
  }
}

function normaliseComment(row) {
  const p = row.profiles || {}
  return {
    id:             row.id,
    postId:         row.post_id,
    authorId:       row.user_id,
    authorName:     p.full_name || p.display_name || p.username || 'Anonymous',
    authorUsername: p.username  || null,
    authorAvatar:   p.avatar_url || null,
    content:        row.content,
    createdAt:      row.created_at,
  }
}