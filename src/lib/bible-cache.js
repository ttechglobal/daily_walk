// ── src/lib/bible-cache.js ──
// IndexedDB-backed Bible content cache.
//
// CACHE KEY:  "{translationId}|{bookId}|{chapter}"
//   e.g.  "KJV|GEN|1"   "WEB|JHN|3"   "ASV|REV|22"
//
// DB: daily_walk_bible  (version 2)
// Stores: chapters, cache_queue

const DB_NAME        = 'daily_walk_bible'
const DB_VERSION     = 2
const STORE_CHAPTERS = 'chapters'
const STORE_QUEUE    = 'cache_queue'

let _db = null

function openDB() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db     = e.target.result
      const oldVer = e.oldVersion

      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const s = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'cacheKey' })
        s.createIndex('by_translation', 'translationId', { unique: false })
        s.createIndex('by_plan',        'planId',        { unique: false })
        s.createIndex('by_cached_at',   'cachedAt',      { unique: false })
        s.createIndex('by_priority',    'priority',      { unique: false })
      } else if (oldVer < 2) {
        // Safe upgrade: add missing indexes
        const tx = e.target.transaction
        const s  = tx.objectStore(STORE_CHAPTERS)
        if (!s.indexNames.contains('by_priority')) {
          s.createIndex('by_priority', 'priority', { unique: false })
        }
      }

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const q = db.createObjectStore(STORE_QUEUE, { keyPath: 'cacheKey' })
        q.createIndex('by_plan',     'planId',   { unique: false })
        q.createIndex('by_priority', 'priority', { unique: false })
      }
    }

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror   = ()  => reject(req.error)
  })
}

// ─────────────────────────────────────────────
//  Key helpers
// ─────────────────────────────────────────────
export function makeCacheKey(translationId, bookId, chapter) {
  return `${translationId}|${bookId}|${chapter}`
}

// ─────────────────────────────────────────────
//  READ
// ─────────────────────────────────────────────
export async function getCachedChapter(translationId, bookId, chapter) {
  try {
    const db  = await openDB()
    if (!db) return null
    const key = makeCacheKey(translationId, bookId, chapter)
    return new Promise(resolve => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror   = () => resolve(null)
    })
  } catch { return null }
}

export async function isCached(translationId, bookId, chapter) {
  const r = await getCachedChapter(translationId, bookId, chapter)
  return !!(r?.verses?.length)
}

// ─────────────────────────────────────────────
//  WRITE
// ─────────────────────────────────────────────
export async function cacheChapter(translationId, bookId, chapter, data, opts = {}) {
  try {
    const db  = await openDB()
    if (!db) return
    const key = makeCacheKey(translationId, bookId, chapter)

    await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readwrite')
      tx.objectStore(STORE_CHAPTERS).put({
        cacheKey:      key,
        translationId: String(translationId),
        bookId,
        chapter:       parseInt(chapter),
        verses:        data.verses  || [],
        book:          data.book    || '',
        source:        data.source  || 'storage',
        priority:      opts.priority || 'opportunistic',
        planId:        opts.planId   || null,
        cachedAt:      new Date().toISOString(),
      })
      tx.oncomplete = resolve
      tx.onerror    = () => reject(tx.error)
    })

    // Remove from queue if it was pending
    await _dequeue(key)
  } catch (e) {
    console.warn('[bible-cache] write error:', e?.message)
  }
}

// ─────────────────────────────────────────────
//  DELETE all chapters for a translation
// ─────────────────────────────────────────────
export async function deleteTranslationCache(translationId) {
  try {
    const db = await openDB()
    if (!db) return

    const keys = await new Promise(resolve => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS)
        .index('by_translation')
        .getAllKeys(IDBKeyRange.only(String(translationId)))
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })

    // Delete in batches of 100
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100)
      await new Promise(resolve => {
        const tx    = db.transaction(STORE_CHAPTERS, 'readwrite')
        const store = tx.objectStore(STORE_CHAPTERS)
        batch.forEach(k => store.delete(k))
        tx.oncomplete = resolve
        tx.onerror    = resolve
      })
    }
  } catch (e) {
    console.warn('[bible-cache] deleteTranslationCache error:', e?.message)
  }
}

// ─────────────────────────────────────────────
//  COUNT cached chapters for a translation
// ─────────────────────────────────────────────
export async function countCachedChapters(translationId) {
  try {
    const db = await openDB()
    if (!db) return 0
    return new Promise(resolve => {
      const tx  = db.transaction(STORE_CHAPTERS, 'readonly')
      const req = tx.objectStore(STORE_CHAPTERS)
        .index('by_translation')
        .count(IDBKeyRange.only(String(translationId)))
      req.onsuccess = () => resolve(req.result || 0)
      req.onerror   = () => resolve(0)
    })
  } catch { return 0 }
}

// ─────────────────────────────────────────────
//  QUEUE — plan passages to fetch when online
// ─────────────────────────────────────────────
export async function queuePassage(translationId, bookId, chapter, planId, dayNumber) {
  try {
    const db = await openDB()
    if (!db) return
    const key     = makeCacheKey(translationId, bookId, chapter)
    const already = await isCached(translationId, bookId, chapter)
    if (already) return

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite')
      tx.objectStore(STORE_QUEUE).put({
        cacheKey:      key,
        translationId: String(translationId),
        bookId,
        chapter,
        planId,
        dayNumber,
        priority:  dayNumber,
        queuedAt:  new Date().toISOString(),
      })
      tx.oncomplete = resolve
      tx.onerror    = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[bible-cache] queue error:', e?.message)
  }
}

async function _dequeue(cacheKey) {
  try {
    const db = await openDB()
    if (!db) return
    await new Promise(resolve => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite')
      tx.objectStore(STORE_QUEUE).delete(cacheKey)
      tx.oncomplete = resolve
      tx.onerror    = resolve
    })
  } catch {}
}

export async function getPendingQueue() {
  try {
    const db = await openDB()
    if (!db) return []
    return new Promise(resolve => {
      const tx  = db.transaction(STORE_QUEUE, 'readonly')
      const req = tx.objectStore(STORE_QUEUE).index('by_priority').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })
  } catch { return [] }
}