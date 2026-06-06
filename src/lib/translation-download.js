// ── src/lib/translation-download.js ──
// Downloads all 1,189 chapter files for a translation into IndexedDB.
// Singleton — safe to call multiple times, survives React navigation.

import { BIBLE_BOOK_LIST } from './bible'
import { getChapterUrl, markDownloaded, markDeleted } from './bib-translations'

const BATCH_SIZE  = 8    // parallel fetches per batch
const BATCH_DELAY = 200  // ms between batches

// ── Singleton state
const STATES    = {}              // { [id]: DownloadState }
const LISTENERS = new Map()       // Map<id, Set<fn>>

// DownloadState:
// { status:'idle'|'downloading'|'paused'|'done'|'error'|'deleting',
//   done, total, pct, currentBook, error }

export function getDownloadState(id) {
  return STATES[String(id)] || null
}

export function subscribeToDownload(id, fn) {
  const key = String(id)
  if (!LISTENERS.has(key)) LISTENERS.set(key, new Set())
  LISTENERS.get(key).add(fn)
  if (STATES[key]) fn({ ...STATES[key] })
  return () => LISTENERS.get(key)?.delete(fn)
}

function _set(id, patch) {
  const key = String(id)
  STATES[key] = { ...(STATES[key] || {}), ...patch }
  LISTENERS.get(key)?.forEach(fn => fn({ ...STATES[key] }))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dw-translation-download', {
      detail: { translationId:key, ...STATES[key] }
    }))
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Build flat chapter list
function buildChapterList() {
  const list = []
  for (const book of BIBLE_BOOK_LIST) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      list.push({ bookId:book.bookId, bookName:book.name, chapter:ch })
    }
  }
  return list
}

// ─────────────────────────────────────────────
//  downloadTranslation — main entry point
// ─────────────────────────────────────────────
export async function downloadTranslation(translationId) {
  const id = String(translationId)
  if (STATES[id]?.status === 'downloading') return

  const chapters = buildChapterList()
  const total    = chapters.length

  _set(id, { status:'downloading', done:0, total, pct:0, currentBook:'Genesis', error:null })

  const { isCached, cacheChapter } = await import('./bible-cache')
  let done = 0

  for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
    // Pause support
    while (STATES[id]?.status === 'paused') {
      await sleep(300)
    }
    if (STATES[id]?.status === 'error') return

    const batch = chapters.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async ({ bookId, bookName, chapter }) => {
      try {
        if (await isCached(id, bookId, chapter)) { done++; return }

        const url = getChapterUrl(id, bookId, chapter)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        const verses = (data.verses || []).map(v => ({
          number: v.n ?? v.number ?? 0,
          text:   v.t ?? v.text   ?? '',
        }))

        await cacheChapter(id, bookId, chapter, {
          verses, book:data.book || bookName, bookId, chapter, source:'storage',
        }, { priority:'downloaded' })

        done++
        _set(id, { done, total, pct:Math.round((done/total)*100), currentBook:bookName })
      } catch {
        done++
      }
    }))

    await sleep(BATCH_DELAY)
  }

  _set(id, { status:'done', done:total, total, pct:100, currentBook:'' })
  markDownloaded(id)
}

export function pauseDownload(id) {
  if (STATES[String(id)]?.status === 'downloading') {
    _set(String(id), { status:'paused' })
  }
}

export function resumeDownload(id) {
  if (STATES[String(id)]?.status === 'paused') {
    _set(String(id), { status:'downloading' })
  }
}

// ─────────────────────────────────────────────
//  deleteTranslation
// ─────────────────────────────────────────────
export async function deleteTranslation(translationId) {
  const id = String(translationId)
  _set(id, { status:'deleting', pct:0 })
  try {
    const { deleteTranslationCache } = await import('./bible-cache')
    await deleteTranslationCache(id)
    markDeleted(id)
    _set(id, { status:'idle', done:0, total:0, pct:0 })
  } catch (err) {
    _set(id, { status:'error', error:err.message })
  }
}

// ─────────────────────────────────────────────
//  getDownloadProgress — reads actual IndexedDB count
//  Used on mount to restore progress state
// ─────────────────────────────────────────────
export async function getDownloadProgress(translationId) {
  try {
    const { countCachedChapters } = await import('./bible-cache')
    const cached = await countCachedChapters(String(translationId))
    const total  = 1189
    return { cached, total, pct:Math.round((cached/total)*100) }
  } catch {
    return { cached:0, total:1189, pct:0 }
  }
}