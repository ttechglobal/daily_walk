// ── src/lib/supabase/communities.js ──
// All queries use the clean schema: profiles, communities, memberships, posts, comments, likes, saved_posts
// createPostToMultiple: posts to one or more communities in a single call.

import { createClient } from './client'

export async function getAuthUser() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    return {
      id:    user.id,
      name:  user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Friend',
      email: user.email,
    }
  } catch { return null }
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
  const sb = createClient(); const user = await getAuthUser()
  if (!sb) return []
  const { data, error } = await sb.from('communities')
    .select('*, memberships!left(user_id)').order('member_count', { ascending: false })
  if (error) { console.warn('[communities]', error.message); return [] }
  return (data || []).map(c => ({
    ...c,
    joined: user ? (c.memberships || []).some(m => m.user_id === user.id) : false,
  }))
}

export async function getCommunityBySlug(slug) {
  const sb = createClient(); const user = await getAuthUser()
  if (!sb || !slug) return null
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)
  const { data, error } = await sb.from('communities')
    .select('*, memberships!left(user_id)')
    .eq(isUUID ? 'id' : 'slug', slug).maybeSingle()
  if (error || !data) return null
  return { ...data, joined: user ? (data.memberships || []).some(m => m.user_id === user.id) : false }
}

export const getCommunityById = getCommunityBySlug

export async function getJoinedCommunities() {
  const user = await getAuthUser(); if (!user) return []
  const sb = createClient(); if (!sb) return []
  const { data, error } = await sb.from('memberships')
    .select('community_id, communities(*)').eq('user_id', user.id)
  if (error) return []
  return (data || []).filter(r => r.communities).map(r => ({ ...r.communities, joined: true }))
}

// ─────────────────────────────────────────────
//  MEMBERSHIP
// ─────────────────────────────────────────────

export async function checkMembership(communityId) {
  const user = await getAuthUser(); if (!user) return false
  const sb = createClient()
  const { data } = await sb.from('memberships').select('id')
    .eq('user_id', user.id).eq('community_id', communityId).maybeSingle()
  return !!data
}

export async function joinCommunity(communityId) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships')
    .insert({ user_id: user.id, community_id: communityId })
  if (error && error.code !== '23505') throw error
}

export async function leaveCommunity(communityId) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { error } = await sb.from('memberships').delete()
    .eq('user_id', user.id).eq('community_id', communityId)
  if (error) throw error
}

export async function createCommunity(fields) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('communities').insert({
    slug:        makeSlug(fields.name),
    name:        fields.name,
    description: fields.description || '',
    category:    fields.category    || 'General',
    visibility:  fields.visibility  || 'public',
    invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    created_by:  user.id, owner_name: user.name,
  }).select().single()
  if (error) throw error
  return { ...data, joined: true }
}

// ─────────────────────────────────────────────
//  POSTS — READ
// ─────────────────────────────────────────────

export async function getPosts(communityId) {
  const sb = createClient(); const user = await getAuthUser()
  if (!sb || !communityId) return []
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,avatar_url), likes(count), comments(count)')
    .eq('community_id', communityId).order('created_at', { ascending: false }).limit(60)
  if (error) return []
  let likedSet = new Set()
  if (user && data?.length) {
    const { data: lk } = await sb.from('likes').select('post_id')
      .eq('user_id', user.id).in('post_id', data.map(p => p.id))
    ;(lk || []).forEach(l => likedSet.add(l.post_id))
  }
  return (data || []).map(p => normalisePost(p, user?.id, likedSet))
}

export async function getForYouFeed(limit = 50) {
  const user = await getAuthUser(); if (!user) return []
  const sb = createClient(); if (!sb) return []
  const { data: mem } = await sb.from('memberships').select('community_id').eq('user_id', user.id)
  const ids = (mem || []).map(m => m.community_id)
  if (!ids.length) return []
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .in('community_id', ids).order('created_at', { ascending: false }).limit(limit)
  if (error) return []
  let likedSet = new Set()
  if (data?.length) {
    const { data: lk } = await sb.from('likes').select('post_id')
      .eq('user_id', user.id).in('post_id', data.map(p => p.id))
    ;(lk || []).forEach(l => likedSet.add(l.post_id))
  }
  return (data || []).map(p => normalisePost(p, user.id, likedSet))
}

// ─────────────────────────────────────────────
//  POSTS — WRITE
//  createPost: single community
//  createPostToMultiple: multiple communities at once
// ─────────────────────────────────────────────

export async function createPost(communityId, fields) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('posts')
    .insert({ community_id: communityId, user_id: user.id,
      content: fields.content, passage: fields.passage || null, post_type: fields.type || 'general' })
    .select('*, profiles(username,full_name,avatar_url)').single()
  if (error) throw error
  return normalisePost(data, user.id, new Set())
}

/**
 * Post to multiple communities at once.
 * communityIds: string[] — list of community UUIDs to post to
 * Returns array of created post objects.
 */
export async function createPostToMultiple(communityIds, fields) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  if (!communityIds?.length) throw new Error('Select at least one community')
  const sb = createClient()

  const rows = communityIds.map(cid => ({
    community_id: cid,
    user_id:      user.id,
    content:      fields.content,
    passage:      fields.passage  || null,
    post_type:    fields.type     || 'general',
  }))

  const { data, error } = await sb.from('posts').insert(rows)
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug)')
  if (error) throw error
  return (data || []).map(p => normalisePost(p, user.id, new Set()))
}

export async function deletePost(postId) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  await sb.from('posts').delete().eq('id', postId).eq('user_id', user.id)
}

// ─────────────────────────────────────────────
//  LIKES
// ─────────────────────────────────────────────

export async function toggleLike(postId) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { data: ex } = await sb.from('likes').select('id')
    .eq('user_id', user.id).eq('post_id', postId).maybeSingle()
  if (ex) {
    await sb.from('likes').delete().eq('user_id', user.id).eq('post_id', postId)
    return false
  } else {
    await sb.from('likes').insert({ user_id: user.id, post_id: postId })
    return true
  }
}

// ─────────────────────────────────────────────
//  COMMENTS
// ─────────────────────────────────────────────

export async function getComments(postId) {
  const sb = createClient(); if (!sb) return []
  const { data, error } = await sb.from('comments')
    .select('*, profiles(username,full_name,avatar_url)')
    .eq('post_id', postId).order('created_at', { ascending: true })
  if (error) return []
  return (data || []).map(normaliseComment)
}

export async function addComment(postId, text) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('comments')
    .insert({ post_id: postId, user_id: user.id, content: text })
    .select('*, profiles(username,full_name,avatar_url)').single()
  if (error) throw error
  return normaliseComment(data)
}

// ─────────────────────────────────────────────
//  SAVED POSTS
// ─────────────────────────────────────────────

export async function savePost(postId) {
  const user = await getAuthUser(); if (!user) throw new Error('not_authenticated')
  const sb = createClient()
  await sb.from('saved_posts').insert({ user_id: user.id, post_id: postId })
    .then(()=>null, ()=>null)
}

export async function unsavePost(postId) {
  const user = await getAuthUser(); if (!user) return
  const sb = createClient()
  await sb.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', postId)
}

export async function getSavedPosts() {
  const user = await getAuthUser(); if (!user) return []
  const sb = createClient()
  const { data, error } = await sb.from('saved_posts')
    .select('*, posts(*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count))')
    .eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return []
  return (data || []).filter(r => r.posts)
    .map(r => ({ ...normalisePost(r.posts, user.id, new Set()), savedAt: r.created_at }))
}

export async function isPostSaved(postId) {
  const user = await getAuthUser(); if (!user) return false
  const sb = createClient()
  const { data } = await sb.from('saved_posts').select('id')
    .eq('user_id', user.id).eq('post_id', postId).maybeSingle()
  return !!data
}

export async function getUserPosts() {
  const user = await getAuthUser(); if (!user) return []
  const sb = createClient()
  const { data, error } = await sb.from('posts')
    .select('*, profiles(username,full_name,avatar_url), communities(id,name,slug), likes(count), comments(count)')
    .eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return []
  return (data || []).map(p => normalisePost(p, user.id, new Set()))
}

// ─────────────────────────────────────────────
//  REAL-TIME
// ─────────────────────────────────────────────

export function subscribeToNewPosts(communityId, onInsert) {
  const sb = createClient(); if (!sb) return () => null
  const ch = sb.channel(`posts:${communityId}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'posts',
      filter:`community_id=eq.${communityId}` }, async payload => {
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
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'comments',
      filter:`post_id=eq.${postId}` }, async payload => {
      if (!payload.new) return
      const { data: profile } = await sb.from('profiles')
        .select('username,full_name,avatar_url').eq('id', payload.new.user_id).single()
      onInsert(normaliseComment({ ...payload.new, profiles: profile }))
    }).subscribe()
  return () => { try { sb.removeChannel(ch) } catch {} }
}

export const subscribeToComments = subscribeToNewComments

// ─────────────────────────────────────────────
//  NORMALISERS
// ─────────────────────────────────────────────

function normalisePost(row, currentUserId, likedSet) {
  const p = row.profiles || {}
  return {
    id:            row.id,
    communityId:   row.community_id,
    communityName: row.communities?.name || null,
    communitySlug: row.communities?.slug || null,
    authorId:      row.user_id,
    authorName:    p.full_name  || p.username  || 'Anonymous',
    authorUsername:p.username   || null,
    authorAvatar:  p.avatar_url || null,
    content:       row.content,
    passage:       row.passage   || null,
    type:          row.post_type || 'general',
    liked:         currentUserId ? likedSet.has(row.id) : false,
    like_count:    row.likes?.[0]?.count    ?? row.like_count    ?? 0,
    comment_count: row.comments?.[0]?.count ?? row.comment_count ?? 0,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function normaliseComment(row) {
  const p = row.profiles || {}
  return {
    id:            row.id,
    postId:        row.post_id,
    authorId:      row.user_id,
    authorName:    p.full_name  || p.username  || 'Anonymous',
    authorUsername:p.username   || null,
    authorAvatar:  p.avatar_url || null,
    content:       row.content,
    createdAt:     row.created_at,
  }
}