// ── lib/supabase/communities.js ──
// Single source of truth for all community data.
// Supabase-first, localStorage cache for offline/fallback.
// Never silently fails — errors are surfaced or gracefully degraded.

import { createClient } from './client'

// ─────────────────────────────────────────────
//  localStorage cache keys (v3 to avoid stale data from old versions)
// ─────────────────────────────────────────────
const LS_COMMS     = 'dw_communities_v3'
const LS_POSTS_KEY = id => `dw_posts_v3_${id}`

function lsGet(k, fb = null) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
}
function localCommunities()        { return lsGet(LS_COMMS, []) }
function saveLocalCommunities(d)   { lsSet(LS_COMMS, d) }
function localPosts(id)            { return lsGet(LS_POSTS_KEY(id), []) }
function saveLocalPosts(id, posts) { lsSet(LS_POSTS_KEY(id), posts) }

// ─────────────────────────────────────────────
//  User helpers
// ─────────────────────────────────────────────
export function localUser() {
  try { const u = localStorage.getItem('dw_user'); return u ? JSON.parse(u) : null } catch { return null }
}
export function localUserId()   { return localUser()?.id       || 'local_user' }
export function localUserName() { return localUser()?.username || localUser()?.name || 'Anonymous' }

// ─────────────────────────────────────────────
//  Slug generator
// ─────────────────────────────────────────────
function generateSlug(name) {
  const base = (name || 'community')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 5)
  return `${base}-${suffix}`
}

// ─────────────────────────────────────────────
//  Communities — READ
// ─────────────────────────────────────────────

export async function getCommunities() {
  const sb  = createClient()
  const uid = localUserId()

  if (!sb) return localCommunities()

  try {
    const { data, error } = await sb
      .from('communities')
      .select('*, community_members!left(user_id)')
      .order('created_at', { ascending: true })
    if (error) throw error

    const result = (data || []).map(c => ({
      ...c,
      joined:     (c.community_members || []).some(m => m.user_id === uid),
      posts:      localPosts(c.id),
      inviteCode: c.invite_code,
    }))
    saveLocalCommunities(result)
    return result
  } catch (e) {
    console.warn('[communities] getCommunities:', e.message)
    return localCommunities()
  }
}

export async function getCommunityById(id) {
  if (!id) return null
  const sb  = createClient()
  const uid = localUserId()

  if (sb) {
    try {
      const { data, error } = await sb
        .from('communities')
        .select('*, community_members!left(user_id)')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) return {
        ...data,
        joined:     (data.community_members || []).some(m => m.user_id === uid),
        inviteCode: data.invite_code,
        posts:      localPosts(id),
      }
    } catch (e) {
      console.warn('[communities] getCommunityById:', e.message)
    }
  }
  return localCommunities().find(c => c.id === id) || null
}

export async function getCommunityBySlug(slug) {
  if (!slug) return null
  const sb  = createClient()
  const uid = localUserId()

  if (sb) {
    try {
      // First check if slug column exists by trying the query
      const { data, error } = await sb
        .from('communities')
        .select('*, community_members!left(user_id)')
        .eq('slug', slug)
        .maybeSingle()  // maybeSingle() returns null instead of error when no row found

      // If error is about column not existing, fall through to name-based lookup
      if (error) {
        if (error.message?.includes('column') || error.code === '42703') {
          // slug column doesn't exist yet — try matching by name-based slug
          return await getCommunityByNameSlug(slug, uid, sb)
        }
        throw error
      }

      if (data) return {
        ...data,
        joined:     (data.community_members || []).some(m => m.user_id === uid),
        inviteCode: data.invite_code,
        posts:      localPosts(data.id),
      }
      return null
    } catch (e) {
      console.warn('[communities] getCommunityBySlug:', e.message)
    }
  }

  // Fallback: check local cache
  return localCommunities().find(c => c.slug === slug) || null
}

// Derive slug from community name for communities without a slug column yet
async function getCommunityByNameSlug(slug, uid, sb) {
  try {
    const { data } = await sb
      .from('communities')
      .select('*, community_members!left(user_id)')
    if (!data) return null
    const match = data.find(c => {
      const derived = (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return slug.startsWith(derived)
    })
    if (!match) return null
    return {
      ...match,
      joined:     (match.community_members || []).some(m => m.user_id === uid),
      inviteCode: match.invite_code,
      posts:      localPosts(match.id),
    }
  } catch { return null }
}

export async function getCommunityByInviteCode(code) {
  const sb = createClient()
  if (sb) {
    try {
      const { data } = await sb.from('communities').select('*').eq('invite_code', code.toUpperCase()).maybeSingle()
      if (data) return { ...data, inviteCode: data.invite_code }
    } catch (e) { console.warn('[communities] getCommunityByInviteCode:', e.message) }
  }
  return localCommunities().find(c => c.inviteCode === code || c.invite_code === code) || null
}

// ─────────────────────────────────────────────
//  Communities — CREATE
// ─────────────────────────────────────────────

export async function createCommunity(data) {
  const sb    = createClient()
  const uid   = localUserId()
  const uname = localUserName()
  const slug  = generateSlug(data.name)

  const community = {
    id:           `cm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name:         data.name,
    description:  data.description || '',
    category:     data.category    || 'General',
    created_by:   uid,
    owner_name:   uname,
    visibility:   data.visibility  || 'public',
    invite_code:  Math.random().toString(36).slice(2, 8).toUpperCase(),
    slug,
    member_count: 1,
    joined:       true,
    posts:        [],
    createdAt:    new Date().toISOString(),
  }

  saveLocalCommunities([community, ...localCommunities()])

  if (sb) {
    try {
      const { error } = await sb.from('communities').insert({
        id:           community.id,
        name:         community.name,
        description:  community.description,
        category:     community.category,
        owner_name:   uname,
        created_by:   uid,
        visibility:   community.visibility,
        invite_code:  community.invite_code,
        slug,
        member_count: 1,
      })
      if (error) console.warn('[communities] createCommunity insert:', error.message)
      else {
        await sb.from('community_members')
          .insert({ community_id: community.id, user_id: uid })
          .then(() => null, () => null)
      }
    } catch (e) { console.warn('[communities] createCommunity:', e.message) }
  }

  return community
}

// ─────────────────────────────────────────────
//  Membership — JOIN / LEAVE
// ─────────────────────────────────────────────

export async function joinCommunity(communityId) {
  const sb  = createClient()
  const uid = localUserId()

  // Update local cache
  saveLocalCommunities(localCommunities().map(c =>
    c.id === communityId ? { ...c, joined: true, member_count: (c.member_count || 0) + 1 } : c
  ))

  if (!sb) return

  // Insert member row
  try {
    await sb.from('community_members')
      .upsert({ community_id: communityId, user_id: uid }, { onConflict: 'community_id,user_id' })
  } catch (e) { console.warn('[communities] joinCommunity member upsert:', e.message) }

  // Increment count — try RPC first, fall back to manual update
  try {
    const { error } = await sb.rpc('increment_member_count', { cid: communityId })
    if (error) throw error
  } catch {
    try {
      const { data: current } = await sb
        .from('communities').select('member_count').eq('id', communityId).single()
      await sb.from('communities')
        .update({ member_count: (current?.member_count || 0) + 1 })
        .eq('id', communityId)
    } catch (e) { console.warn('[communities] joinCommunity count update:', e.message) }
  }
}

export async function leaveCommunity(communityId) {
  const sb  = createClient()
  const uid = localUserId()

  saveLocalCommunities(localCommunities().map(c =>
    c.id === communityId ? { ...c, joined: false, member_count: Math.max(0, (c.member_count || 1) - 1) } : c
  ))

  if (!sb) return

  try {
    await sb.from('community_members')
      .delete().eq('community_id', communityId).eq('user_id', uid)
  } catch (e) { console.warn('[communities] leaveCommunity delete:', e.message) }

  try {
    const { error } = await sb.rpc('decrement_member_count', { cid: communityId })
    if (error) throw error
  } catch {
    try {
      const { data: current } = await sb
        .from('communities').select('member_count').eq('id', communityId).single()
      await sb.from('communities')
        .update({ member_count: Math.max(0, (current?.member_count || 1) - 1) })
        .eq('id', communityId)
    } catch (e) { console.warn('[communities] leaveCommunity count update:', e.message) }
  }
}

// ─────────────────────────────────────────────
//  Posts
// ─────────────────────────────────────────────

export async function createPost(communityId, postData, user) {
  const sb    = createClient()
  const uid   = user?.id       || localUserId()
  const uname = user?.username || user?.name || localUserName()
  const ini   = uname.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const now   = new Date().toISOString()

  const post = {
    id:              postData.idempotencyKey || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    community_id:    communityId,
    author_id:       uid,
    author_name:     uname,
    author_initials: ini,
    content:         postData.content,
    passage:         postData.passage  || null,
    post_type:       postData.type     || 'general',
    like_count:      0,
    comment_count:   0,
    comments:        [],
    likedBy:         [],
    liked:           false,
    created_at:      now,
    createdAt:       now,
  }

  saveLocalPosts(communityId, [post, ...localPosts(communityId)])

  if (sb) {
    try {
      const { error } = await sb.from('community_posts').insert({
        id:               post.id,
        community_id:     communityId,
        author_id:        uid,
        author_name:      uname,
        content:          post.content,
        passage:          post.passage,
        post_type:        post.post_type,
        idempotency_key:  post.id,
      })
      if (error) {
        // Unique constraint violation = duplicate — silently ignore
        if (error.code !== '23505') {
          console.warn('[communities] createPost:', error.message)
        }
      } else {
        await notifyServerNewPost(communityId, uname, post.content)
      }
    } catch (e) { console.warn('[communities] createPost exception:', e.message) }
  }

  return post
}

export async function getPosts(communityId) {
  const sb = createClient()
  if (!sb) return localPosts(communityId)

  try {
    const { data, error } = await sb
      .from('community_posts')
      .select('*, post_likes(user_id), post_comments(id, content, created_at)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const uid   = localUserId()
    const posts = (data || []).map(p => ({
      ...p,
      likedBy:    (p.post_likes    || []).map(l => l.user_id),
      liked:      (p.post_likes    || []).some(l => l.user_id === uid),
      comments:   (p.post_comments || []).map(c => ({ ...c, createdAt: c.created_at })),
      createdAt:  p.created_at,
      authorName: p.author_name,
      authorId:   p.author_id,
    }))

    saveLocalPosts(communityId, posts)
    return posts
  } catch (e) {
    console.warn('[communities] getPosts:', e.message)
    return localPosts(communityId)
  }
}

export async function deletePost(postId, communityId) {
  saveLocalPosts(communityId, localPosts(communityId).filter(p => p.id !== postId))
  const sb = createClient()
  if (sb) {
    try { await sb.from('community_posts').delete().eq('id', postId) }
    catch (e) { console.warn('[communities] deletePost:', e.message) }
  }
}

// ─────────────────────────────────────────────
//  Likes
// ─────────────────────────────────────────────

export async function toggleLike(postId, communityId, uid = localUserId()) {
  const posts = localPosts(communityId)
  const post  = posts.find(p => p.id === postId)
  if (!post) return false

  const liked = post.liked || (post.likedBy || []).includes(uid)
  const next  = !liked

  saveLocalPosts(communityId, posts.map(p => p.id !== postId ? p : {
    ...p,
    liked:      next,
    likedBy:    next ? [...(p.likedBy || []), uid] : (p.likedBy || []).filter(x => x !== uid),
    like_count: Math.max(0, (p.like_count || 0) + (next ? 1 : -1)),
  }))

  const sb = createClient()
  if (sb) {
    if (next) {
      try { await sb.from('post_likes').upsert({ post_id: postId, user_id: uid }, { onConflict: 'post_id,user_id' }) } catch {}
      try { await sb.rpc('increment_like_count', { post_id: postId }) } catch {}
      if (post.author_id && post.author_id !== uid) {
        await notifyServerLike(post.author_id, localUserName(), post.content)
      }
    } else {
      try { await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid) } catch {}
      try { await sb.rpc('decrement_like_count', { post_id: postId }) } catch {}
    }
  }

  return next
}

// ─────────────────────────────────────────────
//  Comments
// ─────────────────────────────────────────────

export async function addComment(postId, communityId, content, user) {
  const sb    = createClient()
  const uid   = user?.id       || localUserId()
  const uname = user?.username || user?.name || localUserName()
  const now   = new Date().toISOString()

  const comment = {
    id:          `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    post_id:     postId,
    author_id:   uid,
    author_name: uname,
    content,
    created_at:  now,
    createdAt:   now,
  }

  saveLocalPosts(communityId, localPosts(communityId).map(p =>
    p.id !== postId ? p : {
      ...p,
      comments:      [...(p.comments || []), comment],
      comment_count: (p.comment_count || 0) + 1,
    }
  ))

  if (sb) {
    try {
      const { error } = await sb.from('post_comments').insert({
        id:          comment.id,
        post_id:     postId,
        author_id:   uid,
        author_name: uname,
        content,
      })
      if (!error) {
        try { await sb.rpc('increment_comment_count', { post_id: postId }) } catch {}
        const post = localPosts(communityId).find(p => p.id === postId)
        if (post?.author_id && post.author_id !== uid) {
          await notifyServerComment(post.author_id, uname, post.content)
        }
      } else {
        console.warn('[communities] addComment:', error.message)
      }
    } catch (e) { console.warn('[communities] addComment exception:', e.message) }
  }

  return comment
}

// ─────────────────────────────────────────────
//  Real-time subscriptions
// ─────────────────────────────────────────────

export function subscribeToCommunityPosts(communityId, onNewPost) {
  const sb = createClient()
  if (!sb) return () => null
  try {
    const ch = sb.channel(`posts:${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_posts',
        filter: `community_id=eq.${communityId}`,
      }, payload => {
        if (!payload.new) return
        const post = {
          ...payload.new,
          likedBy:    [],
          liked:      false,
          comments:   [],
          createdAt:  payload.new.created_at,
          authorName: payload.new.author_name,
          authorId:   payload.new.author_id,
        }
        const existing = localPosts(communityId)
        if (!existing.some(p => p.id === post.id)) {
          saveLocalPosts(communityId, [post, ...existing])
          onNewPost(post)
        }
      })
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch {} }
  } catch (e) {
    console.warn('[communities] subscribeToCommunityPosts:', e.message)
    return () => null
  }
}

export function subscribeToComments(postId, communityId, onNewComment) {
  const sb = createClient()
  if (!sb) return () => null
  try {
    const ch = sb.channel(`comments:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      }, payload => {
        if (!payload.new) return
        const comment = { ...payload.new, createdAt: payload.new.created_at }
        saveLocalPosts(communityId, localPosts(communityId).map(p =>
          p.id !== postId ? p : { ...p, comments: [...(p.comments || []), comment] }
        ))
        onNewComment(comment)
      })
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch {} }
  } catch (e) {
    console.warn('[communities] subscribeToComments:', e.message)
    return () => null
  }
}

// ─────────────────────────────────────────────
//  Server-side push triggers (fire-and-forget)
// ─────────────────────────────────────────────

async function callPush(payload) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {}
}

async function notifyServerNewPost(communityId, author, content) {
  await callPush({ type:'community_post', title:`💬 ${author} posted`, body:content.slice(0,100), url:`/community/${communityId}`, community_id:communityId })
}
async function notifyServerComment(authorId, commenter, postContent) {
  await callPush({ type:'comment', title:`💬 ${commenter} commented`, body:`On: "${postContent.slice(0,60)}"`, url:'/communities', user_ids:[authorId] })
}
async function notifyServerLike(authorId, liker, postContent) {
  await callPush({ type:'like', title:`❤️ ${liker} liked your post`, body:`"${postContent.slice(0,80)}"`, url:'/communities', user_ids:[authorId] })
}