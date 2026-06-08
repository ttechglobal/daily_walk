// ── src/lib/offline-queue.js — v2 ──
// Offline write queue — stores user actions done while offline.
// When the user comes back online, these are replayed against Supabase.
//
// Supported operations:
//   - checkin: daily reading check-in
//   - post_create: new community post
//   - like: liking a post
//   - comment: adding a comment
//   - plan_complete_day: marking a plan day complete
//   - bookmark: add/remove bookmark
//   - highlight: add/remove highlight
//   - note: save a note
//   - plan_create: create a new local plan
//   - plan_update: update plan settings
//   - progress_update: update reading progress
//
// Storage: localStorage key 'dw_offline_queue' (small payloads, max 100 items)
// IndexedDB is used for Bible content only — actions go in localStorage.
//
// v2 changes:
//   • Registers a Background Sync tag with the SW on every enqueue
//     so the browser retries the drain even after the tab is closed.
//   • Extended operation types for bookmarks, highlights, notes, progress.
//   • Max retries = 5 (was 3).

const QUEUE_KEY  = 'dw_offline_queue'
const MAX_ITEMS  = 100
const MAX_RETRY  = 5
const SYNC_TAG   = 'dw-offline-queue'

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function writeQueue(items) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))) } catch {}
}

// ── Register Background Sync tag with the SW ──
// Called after every enqueue so the browser will retry drain when back online,
// even if the user has closed all tabs.
async function registerSync() {
  try {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
    const reg = await navigator.serviceWorker.ready
    await reg.sync.register(SYNC_TAG)
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

  // Kick off Background Sync — fire and forget
  registerSync().catch(() => null)

  return item.id
}

export function getOfflineQueue()  { return readQueue() }
export function removeFromQueue(id) { writeQueue(readQueue().filter(i => i.id !== id)) }
export function clearOfflineQueue() { try { localStorage.removeItem(QUEUE_KEY) } catch {} }
export function getPendingCount()   { return readQueue().length }

// ─────────────────────────────────────────────
//  Drain — replay queued actions against Supabase
// ─────────────────────────────────────────────
export async function drainOfflineQueue() {
  const queue = readQueue()
  if (!queue.length) return

  const { createClient } = await import('./supabase/client')
  const sb = createClient()
  if (!sb) return

  let user = null
  try {
    const { data } = await sb.auth.getUser()
    user = data?.user || null
  } catch {}

  for (const item of queue) {
    try {
      await replayAction(sb, user?.id || null, item)
      removeFromQueue(item.id)
    } catch (e) {
      console.warn(`[offline-queue] replay failed for ${item.type}:`, e.message)
      const updated = readQueue().map(q =>
        q.id === item.id ? { ...q, retries: (q.retries || 0) + 1 } : q
      )
      // Give up after MAX_RETRY failures
      writeQueue(updated.filter(q => q.id !== item.id || (q.retries || 0) < MAX_RETRY))
    }
  }
}

// ─────────────────────────────────────────────
//  replayAction — dispatch individual queue item to Supabase
// ─────────────────────────────────────────────
async function replayAction(sb, userId, item) {
  const { type, payload } = item

  switch (type) {
    // ── Check-in ──
    case 'checkin': {
      if (!userId) return  // can't sync without auth
      await sb.from('checkins').upsert({
        user_id:         userId,
        checked_in_date: payload.date,
        passage:         payload.passage   || null,
        reflection:      payload.reflection || null,
      }, { onConflict: 'user_id,checked_in_date', ignoreDuplicates: true })
      break
    }

    // ── Plan day complete ──
    case 'plan_complete_day': {
      if (!userId) return
      await sb.from('plan_progress').upsert({
        user_id:  userId,
        plan_id:  payload.planId,
        day:      payload.day,
        completed_at: payload.completedAt || new Date().toISOString(),
      }, { onConflict: 'user_id,plan_id,day', ignoreDuplicates: true })
      break
    }

    // ── Progress update ──
    case 'progress_update': {
      if (!userId) return
      await sb.from('reading_progress').upsert({
        user_id:  userId,
        book:     payload.book,
        chapter:  payload.chapter,
        read_at:  payload.readAt || new Date().toISOString(),
      }, { onConflict: 'user_id,book,chapter' })
      break
    }

    // ── Bookmark ──
    case 'bookmark_add': {
      if (!userId) return
      await sb.from('bookmarks').upsert({
        user_id:       userId,
        book:          payload.book,
        chapter:       payload.chapter,
        verse:         payload.verse,
        translation_id: payload.translationId,
        created_at:    payload.createdAt || new Date().toISOString(),
      }, { onConflict: 'user_id,book,chapter,verse,translation_id', ignoreDuplicates: true })
      break
    }
    case 'bookmark_remove': {
      if (!userId) return
      await sb.from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('book',    payload.book)
        .eq('chapter', payload.chapter)
        .eq('verse',   payload.verse)
      break
    }

    // ── Highlight ──
    case 'highlight_add': {
      if (!userId) return
      await sb.from('highlights').upsert({
        user_id:       userId,
        book:          payload.book,
        chapter:       payload.chapter,
        verse:         payload.verse,
        color:         payload.color || 'yellow',
        translation_id: payload.translationId,
        created_at:    payload.createdAt || new Date().toISOString(),
      }, { onConflict: 'user_id,book,chapter,verse,translation_id' })
      break
    }
    case 'highlight_remove': {
      if (!userId) return
      await sb.from('highlights')
        .delete()
        .eq('user_id', userId)
        .eq('book',    payload.book)
        .eq('chapter', payload.chapter)
        .eq('verse',   payload.verse)
      break
    }

    // ── Note ──
    case 'note_save': {
      if (!userId) return
      await sb.from('notes').upsert({
        user_id:       userId,
        book:          payload.book,
        chapter:       payload.chapter,
        verse:         payload.verse || null,
        content:       payload.content,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'user_id,book,chapter,verse' })
      break
    }
    case 'note_delete': {
      if (!userId) return
      await sb.from('notes')
        .delete()
        .eq('user_id', userId)
        .eq('book',    payload.book)
        .eq('chapter', payload.chapter)
      break
    }

    // ── Community post ──
    case 'post_create': {
      if (!userId) return
      await sb.from('posts').insert({
        user_id:      userId,
        community_id: payload.communityId,
        content:      payload.content,
        passage:      payload.passage || null,
        type:         payload.type    || 'general',
      })
      break
    }

    // ── Like ──
    case 'like': {
      if (!userId) return
      await sb.from('likes').upsert({
        user_id: userId,
        post_id: payload.postId,
      }, { onConflict: 'user_id,post_id', ignoreDuplicates: true })
      break
    }

    // ── Comment ──
    case 'comment': {
      if (!userId) return
      await sb.from('comments').insert({
        user_id: userId,
        post_id: payload.postId,
        content: payload.content,
      })
      break
    }

    default:
      console.warn('[offline-queue] unknown action type:', type)
  }
}