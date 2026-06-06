// ── src/lib/plan-cache.js ──
// Plan-guaranteed offline caching — v4 (bib-first).
// Pre-fetches plan passages into IndexedDB from Supabase Storage.

import { isCached, cacheChapter, queuePassage, getPendingQueue } from './bible-cache'
import { getActiveTranslation, getChapterUrl } from './bib-translations'
import { parseRef, BIBLE_BOOK_LIST } from './bible'

const DAYS_AHEAD  = 7
const FETCH_DELAY = 300

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function tid(translationId) {
  return String(translationId || getActiveTranslation() || 'KJV')
}

// Extract unique {bookId, chapter} pairs from content items
function extractChapters(items) {
  const seen = new Set()
  const out  = []
  for (const item of (items || [])) {
    const { bookId, chapter } = parseRef(item.reference || `${item.book} ${item.chapter}`)
    const k = `${bookId}.${chapter}`
    if (!seen.has(k)) { seen.add(k); out.push({ bookId, chapter }) }
  }
  return out
}

// Fetch + cache one chapter from Supabase Storage
async function fetchOne(translationId, bookId, chapter, opts = {}) {
  const already = await isCached(translationId, bookId, chapter)
  if (already) return 'hit'

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!online) {
    await queuePassage(translationId, bookId, chapter, opts.planId, opts.dayNumber)
    return 'queued'
  }

  try {
    const url = getChapterUrl(translationId, bookId, chapter)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const verses = (data.verses||[]).map(v => ({
      number: v.n ?? v.number ?? 0,
      text:   v.t ?? v.text   ?? '',
    }))
    await cacheChapter(translationId, bookId, chapter, {
      verses, book:data.book||'', bookId, chapter, source:'storage',
    }, { planId:opts.planId, priority:'plan' })
    return 'cached'
  } catch {
    await queuePassage(translationId, bookId, chapter, opts.planId, opts.dayNumber)
    return 'queued'
  }
}

// ─────────────────────────────────────────────
//  triggerPlanCache — call on plan join
// ─────────────────────────────────────────────
export async function triggerPlanCache(planId, content, frequency, currentDay, translationId) {
  const t = tid(translationId)
  const { getSliceForDay } = await import('./plan-schedule')
  for (let d = currentDay; d < currentDay + DAYS_AHEAD; d++) {
    const slice = getSliceForDay(content, frequency, d)
    if (!slice?.content?.length) continue
    for (const { bookId, chapter } of extractChapters(slice.content)) {
      await fetchOne(t, bookId, chapter, { planId, dayNumber:d })
      await sleep(FETCH_DELAY)
    }
  }
}

// ─────────────────────────────────────────────
//  advancePlanCache — call on mark-as-read
// ─────────────────────────────────────────────
export async function advancePlanCache(planId, content, frequency, newCurrentDay, translationId) {
  const t = tid(translationId)
  const targetDay = newCurrentDay + DAYS_AHEAD - 1
  const { getSliceForDay } = await import('./plan-schedule')
  const slice = getSliceForDay(content, frequency, targetDay)
  if (!slice?.content?.length) return
  for (const { bookId, chapter } of extractChapters(slice.content)) {
    await fetchOne(t, bookId, chapter, { planId, dayNumber:targetDay })
    await sleep(FETCH_DELAY)
  }
}

// ─────────────────────────────────────────────
//  drainCacheQueue — call when back online
// ─────────────────────────────────────────────
export async function drainCacheQueue(translationId) {
  const t     = tid(translationId)
  const queue = await getPendingQueue()
  for (const item of (queue||[])) {
    await fetchOne(t, item.bookId, item.chapter, {
      planId:item.planId, dayNumber:item.dayNumber,
    })
    await sleep(FETCH_DELAY)
  }
}

// ─────────────────────────────────────────────
//  isDayCached
// ─────────────────────────────────────────────
export async function isDayCached(content, frequency, currentDay, translationId) {
  const t = tid(translationId)
  try {
    const { getSliceForDay } = await import('./plan-schedule')
    const slice = getSliceForDay(content, frequency, currentDay)
    if (!slice?.content?.length) return false
    for (const { bookId, chapter } of extractChapters(slice.content)) {
      if (!(await isCached(t, bookId, chapter))) return false
    }
    return true
  } catch { return false }
}