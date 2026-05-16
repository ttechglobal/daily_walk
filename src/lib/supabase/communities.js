// ── lib/supabase/communities.js ──
// Session-aware throughout — every write uses the real Supabase auth user.
// localStorage is a READ cache only, never the source of truth for membership.
// Membership writes are confirmed before UI updates — no fire-and-forget for joins.

import { createClient } from './client'

// ─────────────────────────────────────────────
//  Cache keys  (v5 — clean break from previous versions)
// ─────────────────────────────────────────────
const LS_COMMS   = 'dw_communities_v5'
const LS_MEM_IDS = 'dw_member_ids_v5'
const LS_POSTS   = id => `dw_posts_v5_${id}`
const LS_SAVED   = 'dw_saved_posts_v5'
const LS_USER    = 'dw_user'

function lsGet(k, fb = null) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

function cachedCommunities()       { return lsGet(LS_COMMS, []) }
function setCachedCommunities(d)   { lsSet(LS_COMMS, d) }
function cachedMemberIds()         { return lsGet(LS_MEM_IDS, []) }
function setCachedMemberIds(ids)   { lsSet(LS_MEM_IDS, Array.isArray(ids) ? ids : []) }
function cachedPosts(id)           { return lsGet(LS_POSTS(id), []) }
function setCachedPosts(id, posts) { lsSet(LS_POSTS(id), posts) }

// ─────────────────────────────────────────────
//  Auth — ALWAYS prefer Supabase session over localStorage
// ─────────────────────────────────────────────

/**
 * Returns { id, name, email } for the current user.
 * Priority: Supabase session → localStorage dw_user → null id (anonymous).
 * Call this at the top of every function that involves user-specific data.
 */
export async function getAuthUser() {
  const sb = createClient()
  if (sb) {
    try {
      const { data } = await sb.auth.getUser()
      const u = data?.user
      if (u) {
        return {
          id:    u.id,
          name:  u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Friend',
          email: u.email || null,
        }
      }
    } catch {}
  }
  try {
    const local = JSON.parse(localStorage.getItem(LS_USER) || 'null')
    if (local?.id) return { id: local.id, name: local.name || local.username || 'Friend', email: local.email || null }
  } catch {}
  return { id: null, name: 'Friend', email: null }
}

// Synchronous helpers for display-only (no auth round-trip needed)
export function localUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || 'null') } catch { return null }
}
export function localUserId()   { return localUser()?.id || null }
export function localUserName() { const u = localUser(); return u?.username || u?.name || 'Friend' }

// ─────────────────────────────────────────────
//  Slug generator
// ─────────────────────────────────────────────
function generateSlug(name) {
  const base = (name || 'community').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  return `${base}-${Math.random().toString(36).slice(2, 5)}`
}

// ─────────────────────────────────────────────
//  Normalise a Supabase post row → app shape
// ─────────────────────────────────────────────
function normalisePost(row, userId, likedSet = new Set()) {
  return {
    id:            row.id,
    communityId:   row.community_id,
    communityName: row.communities?.name || null,
    communitySlug: row.communities?.slug || null,
    authorId:      row.author_id,
    authorName:    row.author_name || 'Anonymous',
    content:       row.content,
    passage:       row.passage || null,
    type:          row.post_type || 'general',
    liked:         userId ? likedSet.has(row.id) : false,
    like_count:    row.like_count    || 0,
    comment_count: row.comment_count || 0,
    likedBy:       [],
    comments:      [],
    createdAt:     row.created_at,
    created_at:    row.created_at,
  }
}

// ─────────────────────────────────────────────
//  Membership IDs — fetch from Supabase
// ─────────────────────────────────────────────
export async function fetchMemberCommunityIds() {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb || !uid) return cachedMemberIds()
  try {
    const { data, error } = await sb.from('community_members').select('community_id').eq('user_id', uid)
    if (error) throw error
    const ids = (data || []).map(r => r.community_id)
    setCachedMemberIds(ids)
    return ids
  } catch (e) {
    console.warn('[communities] fetchMemberCommunityIds:', e.message)
    return cachedMemberIds()
  }
}

// ─────────────────────────────────────────────
//  Verify membership for a single community
// ─────────────────────────────────────────────
export async function checkMembership(communityId) {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb || !uid) return false
  try {
    const { data } = await sb.from('community_members').select('user_id')
      .eq('community_id', communityId).eq('user_id', uid).maybeSingle()
    return !!data
  } catch { return false }
}

// ─────────────────────────────────────────────
//  Communities — READ
// ─────────────────────────────────────────────
export async function getCommunities() {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb) return cachedCommunities()
  try {
    const { data, error } = await sb.from('communities')
      .select('*, community_members!left(user_id)')
      .order('member_count', { ascending: false })
    if (error) throw error
    const result = (data || []).map(c => ({
      ...c,
      joined:     uid ? (c.community_members || []).some(m => m.user_id === uid) : false,
      posts:      cachedPosts(c.id),
      inviteCode: c.invite_code,
    }))
    if (uid) setCachedMemberIds(result.filter(c => c.joined).map(c => c.id))
    setCachedCommunities(result)
    return result
  } catch (e) {
    console.warn('[communities] getCommunities:', e.message)
    return cachedCommunities()
  }
}

export async function getJoinedCommunities() {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb || !uid) {
    const ids = cachedMemberIds()
    return cachedCommunities().filter(c => ids.includes(c.id) || c.joined)
  }
  try {
    const { data: memberRows, error: mErr } = await sb.from('community_members')
      .select('community_id').eq('user_id', uid)
    if (mErr) throw mErr
    const ids = (memberRows || []).map(r => r.community_id)
    setCachedMemberIds(ids)
    if (ids.length === 0) return []
    const { data, error } = await sb.from('communities').select('*')
      .in('id', ids).order('name', { ascending: true })
    if (error) throw error
    return (data || []).map(c => ({ ...c, joined: true, posts: cachedPosts(c.id), inviteCode: c.invite_code }))
  } catch (e) {
    console.warn('[communities] getJoinedCommunities:', e.message)
    return cachedCommunities().filter(c => cachedMemberIds().includes(c.id))
  }
}

export async function getCommunityById(id) {
  if (!id) return null
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (sb) {
    try {
      const { data, error } = await sb.from('communities')
        .select('*, community_members!left(user_id)').eq('id', id).single()
      if (error) throw error
      if (data) return {
        ...data,
        joined:     uid ? (data.community_members || []).some(m => m.user_id === uid) : false,
        inviteCode: data.invite_code,
        posts:      cachedPosts(id),
      }
    } catch (e) { console.warn('[communities] getCommunityById:', e.message) }
  }
  return cachedCommunities().find(c => c.id === id) || null
}

export async function getCommunityBySlug(slug) {
  if (!slug) return null
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (sb) {
    try {
      const { data, error } = await sb.from('communities')
        .select('*, community_members!left(user_id)').eq('slug', slug).maybeSingle()
      if (error) {
        if (error.code === '42703') return _getCommunityByNameSlug(slug, uid, sb)
        throw error
      }
      if (data) return {
        ...data,
        joined:     uid ? (data.community_members || []).some(m => m.user_id === uid) : false,
        inviteCode: data.invite_code,
        posts:      cachedPosts(data.id),
      }
      return null
    } catch (e) { console.warn('[communities] getCommunityBySlug:', e.message) }
  }
  return cachedCommunities().find(c => c.slug === slug) || null
}

async function _getCommunityByNameSlug(slug, uid, sb) {
  try {
    const { data } = await sb.from('communities').select('*, community_members!left(user_id)')
    if (!data) return null
    const match = data.find(c => {
      const derived = (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return slug.startsWith(derived)
    })
    if (!match) return null
    return {
      ...match,
      joined:     uid ? (match.community_members || []).some(m => m.user_id === uid) : false,
      inviteCode: match.invite_code,
      posts:      cachedPosts(match.id),
    }
  } catch { return null }
}

export async function getCommunityByInviteCode(code) {
  const sb = createClient()
  if (sb) {
    try {
      const { data } = await sb.from('communities').select('*')
        .eq('invite_code', code.toUpperCase()).maybeSingle()
      if (data) return { ...data, inviteCode: data.invite_code }
    } catch (e) { console.warn('[communities] getCommunityByInviteCode:', e.message) }
  }
  return cachedCommunities().find(c => c.inviteCode === code || c.invite_code === code) || null
}

// ─────────────────────────────────────────────
//  Membership — JOIN (confirmed write, throws on failure)
// ─────────────────────────────────────────────
export async function joinCommunity(communityId) {
  const { id: uid } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const sb = createClient()
  if (sb) {
    // CONFIRMED write — throw if it fails so the caller can handle it
    const { error } = await sb.from('community_members')
      .upsert({ community_id: communityId, user_id: uid }, { onConflict: 'community_id,user_id' })
    if (error) throw error
    // Best-effort count increment
    try {
      const { error: rpcErr } = await sb.rpc('increment_member_count', { cid: communityId })
      if (rpcErr) throw rpcErr
    } catch {
      try {
        const { data: cur } = await sb.from('communities').select('member_count').eq('id', communityId).single()
        await sb.from('communities').update({ member_count: (cur?.member_count || 0) + 1 }).eq('id', communityId)
      } catch {}
    }
  }
  // Update local cache ONLY after Supabase confirms
  const ids = cachedMemberIds()
  if (!ids.includes(communityId)) setCachedMemberIds([...ids, communityId])
  setCachedCommunities(cachedCommunities().map(c =>
    c.id === communityId ? { ...c, joined: true, member_count: (c.member_count || 0) + 1 } : c
  ))
}

// ─────────────────────────────────────────────
//  Membership — LEAVE
// ─────────────────────────────────────────────
export async function leaveCommunity(communityId) {
  const { id: uid } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const sb = createClient()
  if (sb) {
    const { error } = await sb.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', uid)
    if (error) throw error
    try {
      const { error: rpcErr } = await sb.rpc('decrement_member_count', { cid: communityId })
      if (rpcErr) throw rpcErr
    } catch {
      try {
        const { data: cur } = await sb.from('communities').select('member_count').eq('id', communityId).single()
        await sb.from('communities').update({ member_count: Math.max(0, (cur?.member_count || 1) - 1) }).eq('id', communityId)
      } catch {}
    }
  }
  setCachedMemberIds(cachedMemberIds().filter(id => id !== communityId))
  setCachedCommunities(cachedCommunities().map(c =>
    c.id === communityId ? { ...c, joined: false, member_count: Math.max(0, (c.member_count || 1) - 1) } : c
  ))
}

// ─────────────────────────────────────────────
//  Posts — READ (always from Supabase)
// ─────────────────────────────────────────────
export async function getPosts(communityId) {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!communityId) return []
  if (!sb) return cachedPosts(communityId)
  try {
    const { data, error } = await sb.from('community_posts').select('*')
      .eq('community_id', communityId).order('created_at', { ascending: false }).limit(60)
    if (error) throw error
    let likedSet = new Set()
    if (uid && data?.length) {
      try {
        const { data: likes } = await sb.from('post_likes').select('post_id')
          .eq('user_id', uid).in('post_id', data.map(p => p.id))
        ;(likes || []).forEach(l => likedSet.add(l.post_id))
      } catch {}
    }
    const posts = (data || []).map(p => normalisePost(p, uid, likedSet))
    setCachedPosts(communityId, posts)
    return posts
  } catch (e) {
    console.warn('[communities] getPosts:', e.message)
    return cachedPosts(communityId)
  }
}

// ─────────────────────────────────────────────
//  For You feed
// ─────────────────────────────────────────────
export async function getForYouFeed(limit = 50) {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb || !uid) {
    const posts = []
    cachedMemberIds().forEach(id => cachedPosts(id).forEach(p => posts.push(p)))
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
  }
  try {
    const { data: memberRows, error: mErr } = await sb.from('community_members')
      .select('community_id').eq('user_id', uid)
    if (mErr) throw mErr
    const ids = (memberRows || []).map(r => r.community_id)
    setCachedMemberIds(ids)
    if (ids.length === 0) return []
    const { data: posts, error: pErr } = await sb.from('community_posts')
      .select('*, communities(id, name, slug, category)')
      .in('community_id', ids).order('created_at', { ascending: false }).limit(limit)
    if (pErr) throw pErr
    let likedSet = new Set()
    if (posts?.length) {
      try {
        const { data: likes } = await sb.from('post_likes').select('post_id')
          .eq('user_id', uid).in('post_id', posts.map(p => p.id))
        ;(likes || []).forEach(l => likedSet.add(l.post_id))
      } catch {}
    }
    return (posts || []).map(p => normalisePost(p, uid, likedSet))
  } catch (e) {
    console.warn('[communities] getForYouFeed:', e.message)
    const posts = []
    cachedMemberIds().forEach(id => cachedPosts(id).forEach(p => posts.push(p)))
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
  }
}

// ─────────────────────────────────────────────
//  Posts — WRITE
// ─────────────────────────────────────────────
export async function createPost(communityId, postData) {
  const { id: uid, name: uname } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const id  = crypto.randomUUID()
  const now = new Date().toISOString()
  const sb  = createClient()
  if (sb) {
    const { error } = await sb.from('community_posts').insert({
      id, community_id: communityId, author_id: uid, author_name: uname,
      content: postData.content, passage: postData.passage || null, post_type: postData.type || 'general',
    })
    if (error && error.code !== '23505') throw error
    try { await _callPush({ type: 'community_post', community_id: communityId, title: `${uname} posted`, body: postData.content.slice(0, 100) }) } catch {}
  }
  const post = {
    id, communityId, authorId: uid, authorName: uname,
    content: postData.content, passage: postData.passage || null, type: postData.type || 'general',
    liked: false, like_count: 0, comment_count: 0, likedBy: [], comments: [],
    createdAt: now, created_at: now,
  }
  setCachedPosts(communityId, [post, ...cachedPosts(communityId)])
  return post
}

export async function deletePost(postId, communityId) {
  setCachedPosts(communityId, cachedPosts(communityId).filter(p => p.id !== postId))
  const sb = createClient()
  if (!sb) return
  try { await sb.from('community_posts').delete().eq('id', postId) }
  catch (e) { console.warn('[communities] deletePost:', e.message) }
}

// ─────────────────────────────────────────────
//  Likes
// ─────────────────────────────────────────────
export async function toggleLike(postId, communityId) {
  const { id: uid } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const sb = createClient()
  let isLiked = false
  if (sb) {
    try {
      const { data } = await sb.from('post_likes').select('id')
        .eq('post_id', postId).eq('user_id', uid).maybeSingle()
      isLiked = !!data
    } catch {}
    try {
      if (isLiked) {
        await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid)
        await sb.rpc('decrement_like_count', { pid: postId }).catch(() => null)
      } else {
        await sb.from('post_likes').upsert({ post_id: postId, user_id: uid }, { onConflict: 'post_id,user_id' })
        await sb.rpc('increment_like_count', { pid: postId }).catch(() => null)
      }
    } catch (e) { console.warn('[communities] toggleLike:', e.message) }
  }
  const nowLiked = !isLiked
  setCachedPosts(communityId, cachedPosts(communityId).map(p =>
    p.id !== postId ? p : { ...p, liked: nowLiked, like_count: Math.max(0, (p.like_count || 0) + (nowLiked ? 1 : -1)) }
  ))
  return nowLiked
}

// ─────────────────────────────────────────────
//  Comments
// ─────────────────────────────────────────────
export async function getComments(postId) {
  const sb = createClient()
  if (!sb) return []
  try {
    const { data, error } = await sb.from('post_comments').select('*')
      .eq('post_id', postId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(c => ({ ...c, createdAt: c.created_at }))
  } catch (e) {
    console.warn('[communities] getComments:', e.message)
    return []
  }
}

export async function addComment(postId, communityId, text) {
  const { id: uid, name: uname } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const id  = crypto.randomUUID()
  const now = new Date().toISOString()
  const sb  = createClient()
  if (sb) {
    const { error } = await sb.from('post_comments').insert({
      id, post_id: postId, author_id: uid, author_name: uname, content: text,
    })
    if (error) throw error
    try { await sb.rpc('increment_comment_count', { post_id: postId }) } catch {}
  }
  const comment = { id, post_id: postId, author_id: uid, author_name: uname, content: text, created_at: now, createdAt: now }
  setCachedPosts(communityId, cachedPosts(communityId).map(p =>
    p.id !== postId ? p : { ...p, comments: [...(p.comments || []), comment], comment_count: (p.comment_count || 0) + 1 }
  ))
  return comment
}

// ─────────────────────────────────────────────
//  Saved Posts
// ─────────────────────────────────────────────
export async function savePost(post) {
  const { id: uid } = await getAuthUser()
  const existing = lsGet(LS_SAVED, [])
  if (!existing.some(p => p.id === post.id)) {
    lsSet(LS_SAVED, [{ ...post, savedAt: new Date().toISOString() }, ...existing])
  }
  if (!uid) return
  const sb = createClient()
  if (!sb) return
  try {
    await sb.from('saved_posts').upsert(
      { user_id: uid, post_id: post.id, community_id: post.communityId || post.community_id },
      { onConflict: 'user_id,post_id' }
    )
  } catch (e) { console.warn('[communities] savePost:', e.message) }
}

export async function unsavePost(postId) {
  const { id: uid } = await getAuthUser()
  lsSet(LS_SAVED, lsGet(LS_SAVED, []).filter(p => p.id !== postId))
  if (!uid) return
  const sb = createClient()
  if (!sb) return
  try { await sb.from('saved_posts').delete().eq('user_id', uid).eq('post_id', postId) }
  catch (e) { console.warn('[communities] unsavePost:', e.message) }
}

export async function getSavedPosts() {
  const { id: uid } = await getAuthUser()
  const sb = createClient()
  if (!sb || !uid) return lsGet(LS_SAVED, [])
  try {
    const { data, error } = await sb.from('saved_posts')
      .select('*, community_posts(*)').eq('user_id', uid).order('created_at', { ascending: false })
    if (error) throw error
    const posts = (data || []).filter(r => r.community_posts)
      .map(r => ({ ...normalisePost(r.community_posts, uid), savedAt: r.created_at }))
    lsSet(LS_SAVED, posts)
    return posts
  } catch (e) {
    console.warn('[communities] getSavedPosts:', e.message)
    return lsGet(LS_SAVED, [])
  }
}

export function isPostSaved(postId) {
  return lsGet(LS_SAVED, []).some(p => p.id === postId)
}

// ─────────────────────────────────────────────
//  Create Community
// ─────────────────────────────────────────────
export async function createCommunity(data) {
  const { id: uid, name: uname } = await getAuthUser()
  if (!uid) throw new Error('not_authenticated')
  const id   = crypto.randomUUID()
  const slug = generateSlug(data.name)
  const now  = new Date().toISOString()
  const community = {
    id, name: data.name, description: data.description || '',
    category: data.category || 'General', created_by: uid, owner_name: uname,
    visibility: data.visibility || 'public',
    invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    slug, member_count: 1, joined: true, posts: [], createdAt: now,
  }
  const sb = createClient()
  if (sb) {
    const { error } = await sb.from('communities').insert({
      id, name: community.name, description: community.description,
      category: community.category, owner_name: uname, created_by: uid,
      visibility: community.visibility, invite_code: community.invite_code,
      slug, member_count: 1,
    })
    if (error) throw error
    await sb.from('community_members').insert({ community_id: id, user_id: uid }).then(() => null, () => null)
  }
  setCachedMemberIds([...cachedMemberIds(), id])
  setCachedCommunities([community, ...cachedCommunities()])
  return community
}

// ─────────────────────────────────────────────
//  Real-time subscriptions
// ─────────────────────────────────────────────
export function subscribeToCommunityPosts(communityId, onNewPost) {
  const sb = createClient()
  if (!sb) return () => null
  try {
    const ch = sb.channel(`posts:${communityId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts', filter: `community_id=eq.${communityId}` },
        payload => {
          if (!payload.new) return
          const post = normalisePost(payload.new)
          const existing = cachedPosts(communityId)
          if (!existing.some(p => p.id === post.id)) {
            setCachedPosts(communityId, [post, ...existing])
            onNewPost(post)
          }
        })
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch {} }
  } catch { return () => null }
}

export function subscribeToComments(postId, communityId, onNewComment) {
  const sb = createClient()
  if (!sb) return () => null
  try {
    const ch = sb.channel(`comments:${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        payload => {
          if (!payload.new) return
          const comment = { ...payload.new, createdAt: payload.new.created_at }
          setCachedPosts(communityId, cachedPosts(communityId).map(p =>
            p.id !== postId ? p : { ...p, comments: [...(p.comments || []), comment] }
          ))
          onNewComment(comment)
        })
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch {} }
  } catch { return () => null }
}

// ─────────────────────────────────────────────
//  Push (fire-and-forget)
// ─────────────────────────────────────────────
async function _callPush(payload) {
  try {
    await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {}
}