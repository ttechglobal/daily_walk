// ── lib/supabase/communities.js ──
// Community CRUD — tries Supabase first, falls back to localStorage.
// Returns consistent shape regardless of source.

import { createClient } from './client'
import { SEED_COMMUNITIES } from '../constants'

function readLocal()    { try { const r = localStorage.getItem('dw_communities'); return r ? JSON.parse(r) : SEED_COMMUNITIES } catch { return SEED_COMMUNITIES } }
function writeLocal(d)  { try { localStorage.setItem('dw_communities', JSON.stringify(d)) } catch {} }
function genInvite()    { return Math.random().toString(36).slice(2, 8).toUpperCase() }

export async function getCommunities() {
  const sb = createClient()
  if (sb) {
    try {
      const { data } = await sb.from('communities').select('*').order('created_at', { ascending: false })
      if (data) return data
    } catch {}
  }
  return readLocal()
}

export async function getCommunityByInviteCode(code) {
  const sb = createClient()
  if (sb) {
    try {
      const { data } = await sb.from('communities').select('*').eq('invite_code', code.toUpperCase()).single()
      if (data) return data
    } catch {}
  }
  return readLocal().find(c => c.inviteCode === code.toUpperCase()) || null
}

export async function createCommunity(data) {
  const community = {
    ...data,
    id:          `cm_${Date.now()}`,
    inviteCode:  genInvite(),
    memberCount: 0,
    joined:      true,
    posts:       [],
    createdAt:   new Date().toISOString(),
  }
  const sb = createClient()
  if (sb) {
    try {
      await sb.from('communities').insert({
        name:        community.name,
        description: community.description,
        category:    community.category,
        owner_name:  community.createdBy,
        visibility:  community.visibility,
        invite_code: community.inviteCode,
      })
    } catch {}
  }
  writeLocal([community, ...readLocal()])
  return community
}

export async function joinCommunity(communityId, userId) {
  const sb = createClient()
  if (sb && userId) {
    try { await sb.from('community_members').insert({ community_id: communityId, user_id: userId }) } catch {}
  }
  writeLocal(readLocal().map(c =>
    c.id !== communityId ? c : { ...c, joined: true, memberCount: c.memberCount + 1 }
  ))
}

export async function leaveCommunity(communityId, userId) {
  const sb = createClient()
  if (sb && userId) {
    try { await sb.from('community_members').delete().match({ community_id: communityId, user_id: userId }) } catch {}
  }
  writeLocal(readLocal().map(c =>
    c.id !== communityId ? c : { ...c, joined: false, memberCount: Math.max(0, c.memberCount - 1) }
  ))
}

export async function createPost(communityId, post, userId) {
  const sb = createClient()
  if (sb && userId) {
    try {
      await sb.from('community_posts').insert({
        community_id: communityId,
        author_id:    userId,
        content:      post.content,
        passage:      post.passage,
        post_type:    post.type,
      })
    } catch {}
  }
  const communities = readLocal()
  writeLocal(communities.map(c =>
    c.id !== communityId ? c : { ...c, posts: [post, ...(c.posts || [])] }
  ))
}

export async function likePost(postId, communityId, userId) {
  const sb = createClient()
  if (sb && userId) {
    try {
      await sb.from('post_likes').insert({ post_id: postId, user_id: userId })
      await sb.rpc('increment_like_count', { post_id: postId })
    } catch {}
  }
  writeLocal(readLocal().map(c => {
    if (c.id !== communityId) return c
    return { ...c, posts: (c.posts || []).map(p => {
      if (p.id !== postId) return p
      const likedBy = [...(p.likedBy || []), 'local_user']
      return { ...p, likedBy }
    })}
  }))
}

export async function unlikePost(postId, communityId, userId) {
  const sb = createClient()
  if (sb && userId) {
    try {
      await sb.from('post_likes').delete().match({ post_id: postId, user_id: userId })
      await sb.rpc('decrement_like_count', { post_id: postId })
    } catch {}
  }
  writeLocal(readLocal().map(c => {
    if (c.id !== communityId) return c
    return { ...c, posts: (c.posts || []).map(p => {
      if (p.id !== postId) return p
      return { ...p, likedBy: (p.likedBy || []).filter(x => x !== 'local_user') }
    })}
  }))
}

export async function addComment(postId, communityId, comment, userId) {
  const sb = createClient()
  if (sb && userId) {
    try {
      await sb.from('post_comments').insert({
        post_id:   postId,
        author_id: userId,
        content:   comment.content,
      })
      await sb.rpc('increment_comment_count', { post_id: postId })
    } catch {}
  }
  writeLocal(readLocal().map(c => {
    if (c.id !== communityId) return c
    return { ...c, posts: (c.posts || []).map(p =>
      p.id !== postId ? p : { ...p, comments: [...(p.comments || []), comment] }
    )}
  }))
}

export async function deletePost(postId, communityId, userId) {
  const sb = createClient()
  if (sb && userId) {
    try { await sb.from('community_posts').delete().match({ id: postId, author_id: userId }) } catch {}
  }
  writeLocal(readLocal().map(c =>
    c.id !== communityId ? c : { ...c, posts: (c.posts || []).filter(p => p.id !== postId) }
  ))
}