// ── src/lib/offline-queue.js ──
// Offline write queue — stores user actions done while offline.
// When the user comes back online, these are replayed against Supabase.
//
// Supported operations:
//   - checkin: daily reading check-in
//   - post_create: new community post
//   - like: liking a post
//   - comment: adding a comment
//   - plan_complete_day: marking a plan day complete
//
// Storage: localStorage key 'dw_offline_queue' (small payloads, max 100 items)
// IndexedDB is used for Bible content only — actions go in localStorage.

const QUEUE_KEY  = 'dw_offline_queue'
const MAX_ITEMS  = 100

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch { return [] }
}

function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {}
}

export function enqueueOfflineAction(type, payload) {
  const queue = readQueue()
  const item = {
    id:        `oq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries:   0,
  }
  queue.push(item)
  writeQueue(queue)
  return item.id
}

export function getOfflineQueue() {
  return readQueue()
}

export function removeFromQueue(id) {
  writeQueue(readQueue().filter(item => item.id !== id))
}

export function clearOfflineQueue() {
  try { localStorage.removeItem(QUEUE_KEY) } catch {}
}

export function getPendingCount() {
  return readQueue().length
}

// ─────────────────────────────────────────────
//  Drain — replay queued actions against Supabase
//  Called by AppInit/useOfflineDrain when back online.
// ─────────────────────────────────────────────
export async function drainOfflineQueue() {
  const queue = readQueue()
  if (!queue.length) return

  const { createClient } = await import('./supabase/client')
  const sb = createClient()
  if (!sb) return

  const { data: { user } } = await sb.auth.getUser().catch(() => ({ data: { user: null } }))
  if (!user) return  // can't write without auth

  for (const item of queue) {
    try {
      await replayAction(sb, user.id, item)
      removeFromQueue(item.id)
    } catch (e) {
      console.warn(`[offline-queue] replay failed for ${item.type}:`, e.message)
      // Mark as retried — remove after 3 failures
      const updated = readQueue().map(q =>
        q.id === item.id ? { ...q, retries: (q.retries || 0) + 1 } : q
      )
      writeQueue(updated.filter(q => q.retries < 3))
    }
  }
}

async function replayAction(sb, userId, item) {
  const { type, payload } = item

  switch (type) {

    case 'checkin': {
      await sb.from('checkins').upsert({
        user_id:          userId,
        checked_in_date:  payload.date,
        passage:          payload.passage  || null,
        reflection:       payload.reflection || null,
        created_at:       payload.createdAt || new Date().toISOString(),
      }, { onConflict: 'user_id,checked_in_date', ignoreDuplicates: true })
      break
    }

    case 'plan_complete_day': {
      await sb.from('daily_completions').upsert({
        user_id:     userId,
        plan_id:     payload.planId,
        day_number:  payload.dayNumber,
        completed_at: payload.completedAt || new Date().toISOString(),
      }, { onConflict: 'user_id,plan_id,day_number', ignoreDuplicates: true })
      break
    }

    case 'post_create': {
      // Don't replay old posts — only replay if within 24h
      const age = Date.now() - new Date(item.createdAt).getTime()
      if (age > 24 * 60 * 60 * 1000) break
      await sb.from('posts').insert({
        community_id: payload.communityId,
        user_id:      userId,
        content:      payload.content,
        passage:      payload.passage  || null,
        post_type:    payload.postType || 'general',
      })
      break
    }

    case 'like': {
      await sb.from('likes').upsert({
        post_id: payload.postId,
        user_id: userId,
      }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
      break
    }

    case 'comment': {
      const age = Date.now() - new Date(item.createdAt).getTime()
      if (age > 24 * 60 * 60 * 1000) break
      await sb.from('comments').insert({
        post_id: payload.postId,
        user_id: userId,
        content: payload.content,
      })
      break
    }

    default:
      console.warn('[offline-queue] unknown action type:', type)
  }
}