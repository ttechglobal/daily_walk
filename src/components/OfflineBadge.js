'use client'

// ── src/components/OfflineBadge.js ──
// Shows offline cache status on plan cards and the reader.
// Two variants:
//   'plan'   — "✓ Available offline" / "Downloading…" / "Partial" on plan cards
//   'reader' — small pill in the reader header showing cache status
//
// Also exports useOfflineDrain — call this once on app startup to drain the queue.

import { useState, useEffect } from 'react'
import { WifiOff, CheckCircle2, Download, CloudOff } from 'lucide-react'
import { useTheme } from '../lib/theme'

// ─────────────────────────────────────────────
//  useOnlineStatus — reactive network status
// ─────────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// ─────────────────────────────────────────────
//  useOfflineDrain
//  Call once in a top-level layout/provider.
//  Drains the queue when the user comes online.
// ─────────────────────────────────────────────
export function useOfflineDrain() {
  const online = useOnlineStatus()

  useEffect(() => {
    if (!online) return
    // Dynamic import so this never runs on SSR
    import('../lib/plan-cache')
      .then(({ drainCacheQueue }) => {
        import('../lib/bible').then(({ getPreferredVersionId }) => {
          drainCacheQueue(getPreferredVersionId()).catch(() => null)
        })
      })
      .catch(() => null)
  }, [online])
}

// ─────────────────────────────────────────────
//  PlanOfflineBadge
//  Shows on plan cards. Checks if today's reading is cached.
//  Props:
//    planContent   : ContentItem[]
//    frequency     : { unit, count }
//    currentDay    : number
//    versionId     : string | number
// ─────────────────────────────────────────────
export function PlanOfflineBadge({ planContent, frequency, currentDay, versionId }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'cached' | 'uncached'
  const online = useOnlineStatus()

  useEffect(() => {
    if (!planContent?.length || !frequency) { setStatus('uncached'); return }
    let cancelled = false
    import('../lib/plan-cache').then(({ isDayCached }) => {
      isDayCached(planContent, frequency, currentDay, versionId)
        .then(cached => { if (!cancelled) setStatus(cached ? 'cached' : 'uncached') })
        .catch(() => { if (!cancelled) setStatus('uncached') })
    })
    return () => { cancelled = true }
  }, [planContent, frequency, currentDay, versionId])

  if (status === 'checking') return null

  if (status === 'cached') {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle2 size={11} style={{ color: '#4A7C5F' }} />
        <span className="text-[10px] font-semibold" style={{ color: '#4A7C5F' }}>
          Available offline
        </span>
      </div>
    )
  }

  // Not cached — show only if offline (online users don't need to see this)
  if (!online) {
    return (
      <div className="flex items-center gap-1">
        <CloudOff size={11} style={{ color: '#E8A838' }} />
        <span className="text-[10px] font-semibold" style={{ color: '#E8A838' }}>
          Not downloaded
        </span>
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────
//  ReaderCacheBadge
//  Tiny pill in the Bible reader header.
//  Shows "Offline" when reading cached content without network.
// ─────────────────────────────────────────────
export function ReaderCacheBadge({ fromCache, cacheType, isOffline }) {
  const { t } = useTheme()

  if (isOffline && fromCache) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{ background: '#E8F4ED' }}>
        <WifiOff size={10} style={{ color: '#4A7C5F' }} />
        <span className="text-[10px] font-bold" style={{ color: '#4A7C5F' }}>Offline</span>
      </div>
    )
  }

  if (isOffline && !fromCache) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{ background: '#FDECEA' }}>
        <WifiOff size={10} style={{ color: '#E84060' }} />
        <span className="text-[10px] font-bold" style={{ color: '#E84060' }}>No connection</span>
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────
//  OfflineBanner
//  Full-width banner shown when offline and content not cached.
//  Drop into any page that fetches Bible content.
// ─────────────────────────────────────────────
export function OfflineBanner({ t: theme }) {
  const { t: defaultTheme } = useTheme()
  const t = theme || defaultTheme

  return (
    <div className="mx-4 rounded-[16px] px-4 py-3.5 flex items-start gap-3"
      style={{ background: '#FFF8E6', border: '1px solid #E8A83840' }}>
      <WifiOff size={18} style={{ color: '#E8A838', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="font-bold text-[13px]" style={{ color: '#92681A' }}>
          You're offline
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: '#B8841F' }}>
          This passage hasn't been downloaded yet. Connect to the internet to read it.
        </p>
      </div>
    </div>
  )
}