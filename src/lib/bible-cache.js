// ── src/lib/bible-cache.js ──
// IndexedDB-backed Bible content cache.
// Single source of truth for ALL offline Bible content in Daily Walk.
//
// TWO POPULATIONS:
//   1. Opportunistic  — written when any chapter is fetched in the reader
//   2. Plan-guaranteed — written when a plan is created/joined (next 7 days ahead)
//
// STORAGE KEY:  "{translationId}|{bookId}|{chapter}"
//   e.g.  "111|GEN|1"     (NIV11, Genesis 1)
//   e.g.  "ESV|GEN|1"     (ESV, Genesis 1)
//
// DB name:   daily_walk_bible
// Version:   1
// Stores:
//   chapters     — cached chapter content (both types)
//   cache_queue  — passages queued for background fetch (plan-guaranteed, offline-at-join)
//
// This module is browser-only. All functions are no-ops during SSR.

// ─────────────────────────────────────────────
//  DB bootstrap
//  Uses the native IndexedDB API directly.
//  No external dependency — idb is nice but 1 extra install we avoid.
// ─────────────────────────────────────────────

const DB_NAME    = 'daily_walk_bible'
const DB_VERSION = 1
const STORE_CHAPTERS = 'chapters'
const STORE_QUEUE    = 'cache_queue'

let _db = null

function openDB() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      // chapters store
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const store = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'cacheKey' })
        store.createIndex('by_plan',        'planId',        { unique: false })
        store.createIndex('by_translation', 'translationId', { unique: false })
        store.createIndex('by_cached_at',   'cachedAt',      { unique: false })
      }

      // queue store — passages waiting to be fetched
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const q = db.createObjectStore(STORE_QUEUE, { keyPath: 'cacheKey' })
        q.createIndex('by_plan',     'planId',    { unique: false })
        q.createIndex('by_priority', 'priority',  { unique: false })
      }
    }

    req.onsuccess = (e) => {
      _db = e.target.result
      resolve(_db)
    }

    req.onerror = () => reject(req.error)
  })
}

// ─────────────────────────────────────────────
//  Cache key convention
//  "{translationId}|{bookId}|{chapter}"
//  bookId is the USFM book code (GEN, PSA, MAT...)
// ─────────────────────────────────────────────
export function makeCacheKey(translationId, bookId, chapter) {
  return `${translationId}|${bookId}|${chapter}`
}

// Parse USFM into bookId + chapter
// Handles: "GEN.1", "PSA.119", "MAT.5.1-12" (returns book+chapter, ignores verse range)
export function usfmToBookChapter(usfm) {
  if (!usfm) return null
  const parts = usfm.split('.')
  return { bookId: parts[0], chapter: parseInt(parts[1]) || 1 }
}

// ─────────────────────────────────────────────
//  READ — check if cached
// ─────────────────────────────────────────────
export async function isCached(translationId, bookId, chapter) {
  try {
    const db  = await openDB()
    if (!db) return false
    const key = makeCacheKey(translationId, bookId, chapter)
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS).count(key)
      req.onsuccess = () => resolve(req.result > 0)
      req.onerror   = () => resolve(false)
    })
  } catch { return false }
}

// ─────────────────────────────────────────────
//  READ — get cached chapter
//  Returns null if not cached.
// ─────────────────────────────────────────────
export async function getCachedChapter(translationId, bookId, chapter) {
  try {
    const db  = await openDB()
    if (!db) return null
    const key = makeCacheKey(translationId, bookId, chapter)
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror   = () => resolve(null)
    })
  } catch { return null }
}

// ─────────────────────────────────────────────
//  WRITE — cache a chapter
//  Called after every successful API fetch.
//  planId is optional — set when this is a plan-guaranteed fetch.
//  priority: 'plan' | 'opportunistic'
// ─────────────────────────────────────────────
export async function cacheChapter(translationId, bookId, chapter, data, {
  planId   = null,
  priority = 'opportunistic',
} = {}) {
  try {
    const db = await openDB()
    if (!db) return

    const key = makeCacheKey(translationId, bookId, chapter)
    const record = {
      cacheKey:      key,
      translationId: String(translationId),
      bookId,
      chapter,
      planId,
      priority,          // 'plan' entries are never evicted; 'opportunistic' may be
      cachedAt:      new Date().toISOString(),
      // Bible data
      reference:     data.reference || `${bookId} ${chapter}`,
      content:       data.content   || '',
      verses:        data.verses    || [],
      source:        data.source    || 'unknown',
    }

    await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readwrite')
      const req = tx.objectStore(STORE_CHAPTERS).put(record)
      req.onsuccess = resolve
      req.onerror   = () => reject(req.error)
    })

    // Remove from queue if it was queued
    await dequeuePassage(key)
  } catch (e) {
    console.warn('[bible-cache] write error:', e?.message)
  }
}

// ─────────────────────────────────────────────
//  QUEUE — for plan passages that couldn't be
//  fetched at join time (user was offline)
// ─────────────────────────────────────────────
export async function queuePassage(translationId, bookId, chapter, planId, dayNumber) {
  try {
    const db = await openDB()
    if (!db) return
    const key = makeCacheKey(translationId, bookId, chapter)

    // Don't queue if already cached
    const already = await isCached(translationId, bookId, chapter)
    if (already) return

    const record = {
      cacheKey:      key,
      translationId: String(translationId),
      bookId,
      chapter,
      planId,
      dayNumber,
      priority:  dayNumber, // lower day = higher priority
      queuedAt:  new Date().toISOString(),
    }

    await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_QUEUE, 'readwrite')
      const req = tx.objectStore(STORE_QUEUE).put(record)
      req.onsuccess = resolve
      req.onerror   = () => reject(req.error)
    })
  } catch (e) {
    console.warn('[bible-cache] queue error:', e?.message)
  }
}

async function dequeuePassage(cacheKey) {
  try {
    const db = await openDB()
    if (!db) return
    await new Promise((resolve) => {
      const tx  = db.transaction(STORE_QUEUE, 'readwrite')
      tx.objectStore(STORE_QUEUE).delete(cacheKey)
      tx.oncomplete = resolve
      tx.onerror    = resolve // non-fatal
    })
  } catch {}
}

export async function getPendingQueue() {
  try {
    const db = await openDB()
    if (!db) return []
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_QUEUE, 'readonly')
      const req   = tx.objectStore(STORE_QUEUE)
        .index('by_priority').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })
  } catch { return [] }
}

// ─────────────────────────────────────────────
//  EVICTION — clear opportunistic entries when
//  storage is getting large (>50MB estimated)
//  Plan-guaranteed entries are never evicted.
// ─────────────────────────────────────────────
export async function evictOldOpportunisticCache(keepDays = 30) {
  try {
    const db = await openDB()
    if (!db) return
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - keepDays)
    const cutoffStr = cutoff.toISOString()

    const all = await new Promise((resolve) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS)
        .index('by_cached_at').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })

    const toDelete = all.filter(r =>
      r.priority === 'opportunistic' && r.cachedAt < cutoffStr
    )

    if (!toDelete.length) return

    await new Promise((resolve) => {
      const tx    = db.transaction(STORE_CHAPTERS, 'readwrite')
      const store = tx.objectStore(STORE_CHAPTERS)
      for (const r of toDelete) store.delete(r.cacheKey)
      tx.oncomplete = resolve
      tx.onerror    = resolve
    })

    console.log(`[bible-cache] evicted ${toDelete.length} old opportunistic entries`)
  } catch (e) {
    console.warn('[bible-cache] eviction error:', e?.message)
  }
}

// ─────────────────────────────────────────────
//  STATS — for settings/debug UI
// ─────────────────────────────────────────────
export async function getCacheStats() {
  try {
    const db = await openDB()
    if (!db) return { total: 0, plan: 0, opportunistic: 0, queuePending: 0 }

    const [all, queue] = await Promise.all([
      new Promise((resolve) => {
        const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
        const req = tx.objectStore(STORE_CHAPTERS).getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror   = () => resolve([])
      }),
      getPendingQueue(),
    ])

    return {
      total:         all.length,
      plan:          all.filter(r => r.priority === 'plan').length,
      opportunistic: all.filter(r => r.priority === 'opportunistic').length,
      queuePending:  queue.length,
    }
  } catch { return { total: 0, plan: 0, opportunistic: 0, queuePending: 0 } }
}

// ─────────────────────────────────────────────
//  CLEAR — remove all cache for a plan
//  Called when user leaves a plan
// ─────────────────────────────────────────────
export async function clearPlanCache(planId) {
  try {
    const db = await openDB()
    if (!db) return

    const planEntries = await new Promise((resolve) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS).index('by_plan').getAll(planId)
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })

    // Only delete if no other plan uses the same passage
    // (two plans might share Genesis 1)
    if (!planEntries.length) return

    await new Promise((resolve) => {
      const tx    = db.transaction(STORE_CHAPTERS, 'readwrite')
      const store = tx.objectStore(STORE_CHAPTERS)
      for (const r of planEntries) {
        // Only delete if this was exclusively for this plan
        if (r.planId === planId && r.priority === 'plan') {
          store.delete(r.cacheKey)
        }
      }
      tx.oncomplete = resolve
      tx.onerror    = resolve
    })
  } catch (e) {
    console.warn('[bible-cache] clearPlanCache error:', e?.message)
  }
}