// ── lib/downloadManager.js — Background download manager ──
// Downloads run in a global singleton — survive navigation away from screen.
// Components can subscribe to progress via events.

const DOWNLOADS = {}   // { [versionId]: { done, total, status } }
const LISTENERS = {}   // { [versionId]: Set<fn> }

export function getDownloadStatus(versionId) {
  return DOWNLOADS[versionId] || null
}

export function subscribeToDownload(versionId, fn) {
  if (!LISTENERS[versionId]) LISTENERS[versionId] = new Set()
  LISTENERS[versionId].add(fn)
  return () => LISTENERS[versionId]?.delete(fn)
}

function emit(versionId) {
  const status = DOWNLOADS[versionId]
  if (!status) return
  LISTENERS[versionId]?.forEach(fn => fn({ ...status }))
  // Also fire a global event for any component that wants to listen
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dw-bible-download', {
      detail: { versionId, ...status }
    }))
  }
}

export async function startBackgroundDownload(versionId, downloadFn) {
  // Already running or done
  if (DOWNLOADS[versionId]?.status === 'running') return
  if (DOWNLOADS[versionId]?.status === 'done') return

  DOWNLOADS[versionId] = { done: 0, total: 1189, status: 'running', pct: 0 }
  emit(versionId)

  try {
    await downloadFn(versionId, (done, total) => {
      DOWNLOADS[versionId] = { done, total, status: 'running', pct: Math.round((done/total)*100) }
      emit(versionId)
    })
    DOWNLOADS[versionId] = { done: 1189, total: 1189, status: 'done', pct: 100 }
    emit(versionId)
  } catch {
    DOWNLOADS[versionId] = { ...DOWNLOADS[versionId], status: 'error' }
    emit(versionId)
  }
}