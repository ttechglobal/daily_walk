'use client'

// ── src/components/OfflineBadge.js ──
// OFFLINE-FIRST — v5
// Drains BOTH:
//   1. Bible passage cache queue (plan chapters to pre-fetch)
//   2. User write action queue (check-ins, likes, posts done offline)

import { useState, useEffect } from 'react'
import { WifiOff, CheckCircle2, Download } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { getActiveTranslation, isTranslationDownloaded } from '../lib/bib-translations'

// ─────────────────────────────────────────────
//  useOnlineStatus
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
//  Runs when the device comes back online.
//  Drains Bible cache queue + user write action queue.
// ─────────────────────────────────────────────
export function useOfflineDrain() {
  const online = useOnlineStatus()

  useEffect(() => {
    if (!online) return

    // 1. Drain Bible passage pre-fetch queue
    import('../lib/plan-cache').then(({ drainCacheQueue }) => {
      import('../lib/bib-translations').then(({ getActiveTranslation }) => {
        drainCacheQueue(getActiveTranslation()).catch(() => null)
      })
    }).catch(() => null)

    // 2. Drain user write action queue (check-ins, likes, posts done offline)
    import('../lib/offline-queue').then(({ drainOfflineQueue }) => {
      drainOfflineQueue().catch(() => null)
    }).catch(() => null)

  }, [online])
}

// ─────────────────────────────────────────────
//  PlanOfflineBadge — shown on plan cards
// ─────────────────────────────────────────────
export function PlanOfflineBadge({ planContent, frequency, currentDay, translationId }) {
  const [status, setStatus] = useState('checking')
  const online = useOnlineStatus()

  useEffect(() => {
    if (!planContent?.length || !frequency) { setStatus('uncached'); return }
    let cancelled = false
    const tid = translationId || getActiveTranslation()
    import('../lib/plan-cache').then(({ isDayCached }) => {
      isDayCached(planContent, frequency, currentDay, tid)
        .then(cached => { if (!cancelled) setStatus(cached ? 'cached' : 'uncached') })
        .catch(() => { if (!cancelled) setStatus('uncached') })
    }).catch(() => { if (!cancelled) setStatus('uncached') })
    return () => { cancelled = true }
  }, [planContent, frequency, currentDay, translationId, online])

  const { t } = useTheme()

  if (status === 'checking') return null

  if (status === 'cached') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: '#4A7C5F' }}>
        <CheckCircle2 size={12} /> Offline ready
      </span>
    )
  }

  if (!online) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: '#E8A838' }}>
        <WifiOff size={12} /> Connect to cache
      </span>
    )
  }

  return null
}

// ─────────────────────────────────────────────
//  TranslationOfflineBadge — shown on translation cards
// ─────────────────────────────────────────────
export function TranslationOfflineBadge({ translationId }) {
  const downloaded = isTranslationDownloaded(translationId)
  const { t } = useTheme()

  if (!downloaded) return null

  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold"
      style={{ color: '#4A7C5F' }}>
      <Download size={12} /> Downloaded
    </span>
  )
}