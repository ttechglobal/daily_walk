// ── src/lib/plan-cache.js ──
// Plan-guaranteed offline caching orchestrator.
//
// STRATEGY (Option B — confirmed):
//   On plan create/join → fetch the next 7 days of passages silently
//   On each "Mark as Read" → fetch the next 7 days from the new currentDay
//   On app open (online) → drain the pending queue from any offline-at-join sessions
//
// API COST:
//   A plan with daily reading = 7 API calls at join, then 1 call per day read
//   (because each "mark as read" fetches 1 new day to stay 7 ahead)
//   This is the most API-efficient strategy possible.
//
// RATE LIMITING:
//   500ms between fetches — never hammers the API
//   All fetches are fire-and-forget — never blocks the UI

import {
  isCached, cacheChapter, queuePassage,
  getPendingQueue, usfmToBookChapter, makeCacheKey,
} from './bible-cache'
import { getSliceForDay } from './plan-schedule'
import { passageToUsfm, getChapter as fetchChapterFromAPI, getPreferredVersionId } from './bible'

const DAYS_AHEAD    = 7
const FETCH_DELAY   = 500  // ms between each API call

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─────────────────────────────────────────────
//  Resolve translation ID for cache key
//  Normalises numeric (YouVersion) and string (API.Bible) IDs
// ─────────────────────────────────────────────
function resolveTranslationId(versionIdOrAbbr) {
  return String(versionIdOrAbbr || getPreferredVersionId() || '111')
}

// ─────────────────────────────────────────────
//  Core: cache a single chapter
//  Checks IndexedDB first — skips if already cached.
//  Writes result back to IndexedDB on success.
//  Queues for later if fetch fails (offline).
// ─────────────────────────────────────────────
async function cacheOneChapter(translationId, bookId, chapter, { planId, dayNumber } = {}) {
  // Skip if already cached
  const already = await isCached(translationId, bookId, chapter)
  if (already) return 'hit'

  // Check online status
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!online) {
    await queuePassage(translationId, bookId, chapter, planId, dayNumber)
    return 'queued'
  }

  try {
    // Fetch from API
    const result = await fetchChapterFromAPI(translationId, bookId, chapter)
    if (result?.error || result?.offline) {
      await queuePassage(translationId, bookId, chapter, planId, dayNumber)
      return 'queued'
    }

    await cacheChapter(translationId, bookId, chapter, result, {
      planId,
      priority: planId ? 'plan' : 'opportunistic',
    })
    return 'cached'
  } catch {
    await queuePassage(translationId, bookId, chapter, planId, dayNumber)
    return 'queued'
  }
}

// ─────────────────────────────────────────────
//  Extract unique chapters from a content slice
//  A slice may span multiple chapters (e.g. 2 chapters/day).
//  Returns deduplicated [{bookId, chapter}] array.
// ─────────────────────────────────────────────
function extractChapters(contentSlice) {
  if (!contentSlice?.length) return []
  const seen = new Set()
  const result = []
  for (const item of contentSlice) {
    const usfm    = item.usfm || passageToUsfm(item.reference)
    const parsed  = usfm ? usfmToBookChapter(usfm) : { bookId: item.book?.toUpperCase().slice(0,3) || 'UNK', chapter: item.chapter || 1 }
    if (!parsed) continue
    const key = `${parsed.bookId}|${parsed.chapter}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(parsed)
    }
  }
  return result
}

// ─────────────────────────────────────────────
//  Main: cache N days ahead starting from currentDay
//  Called at: plan join, mark-as-read
//  Non-blocking — runs in background.
// ─────────────────────────────────────────────
export async function cacheDaysAhead({
  planContent,    // ContentItem[] — the plan's full content array
  frequency,      // { unit: 'verse'|'chapter', count: number }
  currentDay,     // which day the user is currently on
  personalDays,   // total days in the user's schedule
  planId,
  versionIdOrAbbr,
  daysAhead = DAYS_AHEAD,
}) {
  if (!planContent?.length || !frequency) return

  const translationId = resolveTranslationId(versionIdOrAbbr)
  const maxDay = Math.min(currentDay + daysAhead - 1, personalDays || 9999)

  for (let day = currentDay; day <= maxDay; day++) {
    const slice = getSliceForDay(planContent, frequency, day)
    if (!slice?.length) break

    const chapters = extractChapters(slice)
    for (const { bookId, chapter } of chapters) {
      const status = await cacheOneChapter(translationId, bookId, chapter, {
        planId,
        dayNumber: day,
      })
      if (status === 'cached') {
        // Small delay after each real API call — never when hitting cache
        await sleep(FETCH_DELAY)
      }
    }
  }
}

// ─────────────────────────────────────────────
//  Entry point: called at plan create/join
//  Fire-and-forget — does not block UI.
// ─────────────────────────────────────────────
export function triggerPlanCache({
  planContent,
  frequency,
  currentDay = 1,
  personalDays,
  planId,
  versionIdOrAbbr,
}) {
  // Validate inputs
  if (!planContent?.length || !frequency || !planId) return

  // Run in background — never await this
  cacheDaysAhead({
    planContent,
    frequency,
    currentDay,
    personalDays,
    planId,
    versionIdOrAbbr,
  }).catch(e => console.warn('[plan-cache] background cache error:', e?.message))
}

// ─────────────────────────────────────────────
//  Entry point: called after "Mark as Read"
//  Advances the cache window by 1 day.
//  Only fetches the NEW day that's now in the window.
// ─────────────────────────────────────────────
export function advancePlanCache({
  planContent,
  frequency,
  newCurrentDay,   // the day AFTER marking complete (current_day + 1)
  personalDays,
  planId,
  versionIdOrAbbr,
}) {
  if (!planContent?.length || !frequency || !planId) return

  // Only need to fetch the new trailing day (newCurrentDay + DAYS_AHEAD - 1)
  const newTrailingDay = newCurrentDay + DAYS_AHEAD - 1
  if (newTrailingDay > (personalDays || 9999)) return

  const translationId = resolveTranslationId(versionIdOrAbbr)

  const fetchTrailing = async () => {
    const slice = getSliceForDay(planContent, frequency, newTrailingDay)
    if (!slice?.length) return

    const chapters = extractChapters(slice)
    for (const { bookId, chapter } of chapters) {
      const status = await cacheOneChapter(translationId, bookId, chapter, {
        planId,
        dayNumber: newTrailingDay,
      })
      if (status === 'cached') await sleep(FETCH_DELAY)
    }
  }

  fetchTrailing().catch(e => console.warn('[plan-cache] advance cache error:', e?.message))
}

// ─────────────────────────────────────────────
//  Entry point: drain the queue
//  Called on app open when online.
//  Processes queued passages that failed at join time.
// ─────────────────────────────────────────────
export async function drainCacheQueue(versionIdOrAbbr) {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!online) return

  const queue = await getPendingQueue()
  if (!queue.length) return

  console.log(`[plan-cache] draining ${queue.length} queued passages`)

  const translationId = resolveTranslationId(versionIdOrAbbr)

  for (const item of queue) {
    // Use the translation from the queue item if available
    const tid = item.translationId || translationId
    const status = await cacheOneChapter(tid, item.bookId, item.chapter, {
      planId:    item.planId,
      dayNumber: item.dayNumber,
    })
    if (status === 'cached') await sleep(FETCH_DELAY)
  }
}

// ─────────────────────────────────────────────
//  Check if a specific day's content is fully cached
//  Used by the plan card to show "✓ Available offline"
// ─────────────────────────────────────────────
export async function isDayCached(planContent, frequency, dayNumber, versionIdOrAbbr) {
  if (!planContent?.length || !frequency) return false
  const slice = getSliceForDay(planContent, frequency, dayNumber)
  if (!slice?.length) return false

  const translationId = resolveTranslationId(versionIdOrAbbr)
  const chapters = extractChapters(slice)
  if (!chapters.length) return false

  for (const { bookId, chapter } of chapters) {
    const cached = await isCached(translationId, bookId, chapter)
    if (!cached) return false
  }
  return true
}