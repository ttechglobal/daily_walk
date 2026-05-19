// ── src/lib/supabase/communities.js ──
//
// CHANGE from original:
//  • getAuthUser() now fetches the profiles row → returns real username, not user_metadata
//  • getCommunities() drops `memberships!left(user_id)` — that PostgREST hint syntax
//    silently fails when the FK isn't registered in Supabase's schema cache.
//    Replaced with two separate queries merged in JS. Always works.

import { createClient } from './client'

export async function getAuthUser() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data: { user }, error } = await sb.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await sb.from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    return {
      id:         user.id,
      name:       profile?.full_name || profile?.username || user.email?.split('@')[0] || '',
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
//  COMMUNITIES
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

  if (commResult.error) {
    console.error('[getCommunities]', commResult.error.message)
    return []
  }

  const communities = commResult.data || []
  if (!communities.length) return []

  let joinedSet = new Set()
  if (authUser?.id) {
    const { data: memberships, error: memErr } = await sb
      .from('memberships').select('community_id').eq('user_id', authUser.id)
    if (memErr) console.warn('[getCommunities] memberships:', memErr.message)
    else joinedSet = new Set((memberships || []).map(m => m.community_id))
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
  return { ...data, joined }
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

export async function joinCommunity(communityId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships')
    .insert({ user_id: authUser.id, community_id: communityId })
  if (error && error.code !== '23505') throw error
}

export async function leaveCommunity(communityId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships').delete()
    .eq('user_id', authUser.id).eq('community_id', communityId)
  if (error) throw error
}

export async function createCommunity(fields) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('communities').insert({
    slug: makeSlug(fields.name), name: fields.name,
    description: fields.description || '', category: fields.category || 'General',
    visibility: fields.visibility || 'public',
    invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    created_by: authUser.id, owner_name: authUser.name,
  }).select().single()
  if (error) throw error
  return { ...data, joined: true }
}

// ─────────────────────────────────────────────
//  POSTS
// ─────────────────────────────────────────────

export async function getPosts(communityId) {
  const sb = createClient()
  if (!sb || !communityId) return []
  const authUser = await getAuthUser()
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,avatar_url), likes(count), comments(count)')
    .eq('community_id', communityId).order('created_at', { ascending: false }).limit(60)
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
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .in('community_id', ids).order('created_at', { ascending: false }).limit(limit)
  if (error) { console.error('[getForYouFeed]', error.message); return [] }
  let likedSet = new Set()
  if (data?.length) {
    const { data: lk } = await sb.from('likes').select('post_id')
      .eq('user_id', authUser.id).in('post_id', data.map(p => p.id))
    ;(lk || []).forEach(l => likedSet.add(l.post_id))
  }
  return (data || []).map(p => normalisePost(p, authUser.id, likedSet))
}

export async function createPost(communityId, fields) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('posts')
    .insert({ community_id: communityId, user_id: authUser.id,
      content: fields.content, passage: fields.passage || null, post_type: fields.type || 'general' })
    .select('*, profiles(username,full_name,avatar_url)').single()
  if (error) throw error
  return normalisePost(data, authUser.id, new Set())
}

export async function createPostToMultiple(communityIds, fields) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  if (!communityIds?.length) throw new Error('Select at least one community')
  const sb = createClient()
  const rows = communityIds.map(cid => ({
    community_id: cid, user_id: authUser.id,
    content: fields.content, passage: fields.passage || null, post_type: fields.type || 'general',
  }))
  const { data, error } = await sb.from('posts').insert(rows)
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug)')
  if (error) throw error
  return (data || []).map(p => normalisePost(p, authUser.id, new Set()))
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
  if (ex) { await sb.from('likes').delete().eq('user_id', authUser.id).eq('post_id', postId); return false }
  else    { await sb.from('likes').insert({ user_id: authUser.id, post_id: postId }); return true }
}

// ─────────────────────────────────────────────
//  COMMENTS
// ─────────────────────────────────────────────

export async function getComments(postId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('comments')
    .select('*, profiles(username,full_name,avatar_url)')
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
    .select('*, profiles(username,full_name,avatar_url)').single()
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
    .select('*, posts(*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count))')
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
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .eq('user_id', authUser.id).order('created_at', { ascending: false })
  if (error) { console.error('[getUserPosts]', error.message); return [] }
  return (data || []).map(p => normalisePost(p, authUser.id, new Set()))
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
        .select('username,full_name,avatar_url').eq('id', payload.new.user_id).single()
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
        .select('username,full_name,avatar_url').eq('id', payload.new.user_id).single()
      onInsert(normaliseComment({ ...payload.new, profiles: profile }))
    }).subscribe()
  return () => { try { sb.removeChannel(ch) } catch {} }
}
export const subscribeToComments = subscribeToNewComments

// ─────────────────────────────────────────────
//  Normalisers
// ─────────────────────────────────────────────

function normalisePost(row, currentUserId, likedSet) {
  const p = row.profiles || {}
  return {
    id: row.id, communityId: row.community_id,
    communityName: row.communities?.name || null, communitySlug: row.communities?.slug || null,
    authorId: row.user_id,
    authorName: p.full_name || p.username || 'Anonymous',
    authorUsername: p.username || null, authorAvatar: p.avatar_url || null,
    content: row.content, passage: row.passage || null, type: row.post_type || 'general',
    liked: currentUserId ? (likedSet?.has?.(row.id) ?? false) : false,
    like_count:    row.likes?.[0]?.count    ?? row.like_count    ?? 0,
    comment_count: row.comments?.[0]?.count ?? row.comment_count ?? 0,
    createdAt: row.created_at,
  }
}

function normaliseComment(row) {
  const p = row.profiles || {}
  return {
    id: row.id, postId: row.post_id, authorId: row.user_id,
    authorName: p.full_name || p.username || 'Anonymous',
    authorUsername: p.username || null, authorAvatar: p.avatar_url || null,
    content: row.content, createdAt: row.created_at,
  }
}