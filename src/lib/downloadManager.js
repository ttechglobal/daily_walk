// ── lib/downloadManager.js — Bible download manager ──
// Singleton — survives React navigation.
// Chunked: one chapter every 1200ms, never hammers the API.
// Resumable: skips already-cached chapters on restart.
// Progress: live via subscriptions + window events.

const CHAPTER_DELAY_MS = 1200  // ~50 req/min — well within free tier limits

const DOWNLOADS = {}   // { [versionId]: DownloadState }
const LISTENERS = new Map()   // Map<versionId, Set<fn>>

// DownloadState shape:
// { status: 'idle'|'running'|'paused'|'done'|'error',
//   done, total, pct, bookName, chapter, startedAt, error }

export function getDownloadStatus(versionId) {
  return DOWNLOADS[String(versionId)] || null
}

export function getAllDownloads() {
  return { ...DOWNLOADS }
}

export function subscribeToDownload(versionId, fn) {
  const key = String(versionId)
  if (!LISTENERS.has(key)) LISTENERS.set(key, new Set())
  LISTENERS.get(key).add(fn)
  // Immediately emit current state
  if (DOWNLOADS[key]) fn({ ...DOWNLOADS[key] })
  return () => LISTENERS.get(key)?.delete(fn)
}

function emit(versionId) {
  const key    = String(versionId)
  const status = DOWNLOADS[key]
  if (!status) return
  LISTENERS.get(key)?.forEach(fn => fn({ ...status }))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dw-bible-download', {
      detail: { versionId: key, ...status }
    }))
  }
}

function setStatus(versionId, update) {
  const key = String(versionId)
  DOWNLOADS[key] = { ...(DOWNLOADS[key] || {}), ...update }
  emit(key)
}

// ─────────────────────────────────────────────
//  Start or resume a download
// ─────────────────────────────────────────────

export async function startBackgroundDownload(versionId, getChapterFn, bookList) {
  const key = String(versionId)

  // Already running
  if (DOWNLOADS[key]?.status === 'running') return
  // Already fully done
  if (DOWNLOADS[key]?.status === 'done')    return

  const total = bookList.reduce((s, b) => s + b.chapters, 0)

  // Count already-cached chapters (resume support)
  let alreadyCached = 0
  for (const book of bookList) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (isChapterCachedLocally(versionId, book.id, ch)) alreadyCached++
    }
  }

  setStatus(key, {
    status:    'running',
    done:      alreadyCached,
    total,
    pct:       Math.round((alreadyCached / total) * 100),
    bookName:  '',
    chapter:   0,
    startedAt: Date.now(),
  })

  // Run download in background (no await — intentional)
  runDownload(key, versionId, getChapterFn, bookList, total)
}

async function runDownload(key, versionId, getChapterFn, bookList, total) {
  let done = 0

  for (const book of bookList) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      // Check if cancelled externally
      if (DOWNLOADS[key]?.status === 'paused') {
        setStatus(key, { status: 'paused', done, bookName: book.name, chapter: ch })
        return
      }

      // Skip already-cached chapters — resume support
      if (isChapterCachedLocally(versionId, book.id, ch)) {
        done++
        // Update progress every 20 chapters to avoid thrashing
        if (done % 20 === 0) {
          setStatus(key, { done, total, pct: Math.round((done / total) * 100), bookName: book.name, chapter: ch })
        }
        continue
      }

      // Fetch and cache this chapter
      try {
        await getChapterFn(versionId, book.name, ch)
      } catch {
        // Single chapter failure is non-fatal — keep going
      }

      done++
      setStatus(key, {
        done,
        total,
        pct:      Math.round((done / total) * 100),
        bookName: book.name,
        chapter:  ch,
        status:   'running',
      })

      // Gentle delay — never hammers the API
      await sleep(CHAPTER_DELAY_MS)
    }
  }

  // Mark complete + persist
  setStatus(key, { status: 'done', done: total, total, pct: 100, bookName: '', chapter: 0 })
  try { localStorage.setItem(`dw_yv_downloaded_${versionId}`, 'true') } catch {}
}

export function pauseDownload(versionId) {
  const key = String(versionId)
  if (DOWNLOADS[key]?.status === 'running') {
    setStatus(key, { status: 'paused' })
  }
}

export function resumeDownload(versionId, getChapterFn, bookList) {
  const key = String(versionId)
  if (DOWNLOADS[key]?.status === 'paused') {
    setStatus(key, { status: 'running' })
    const total = bookList.reduce((s, b) => s + b.chapters, 0)
    runDownload(key, versionId, getChapterFn, bookList, total)
  }
}

// ─────────────────────────────────────────────
//  Cache check — avoids re-downloading
// ─────────────────────────────────────────────

function isChapterCachedLocally(versionId, bookId, chapter) {
  try {
    const key = `dw_yv_${versionId}_${bookId}_${chapter}`
    return !!localStorage.getItem(key)
  } catch { return false }
}

export function isVersionDownloaded(versionId) {
  try {
    return localStorage.getItem(`dw_yv_downloaded_${versionId}`) === 'true'
  } catch { return false }
}

// ─────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }