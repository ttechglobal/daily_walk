'use client'

// ── src/components/OfflineBadge.js ──
// Offline indicators — v4 (bib-first).

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
//  useOfflineDrain — drains plan queue when back online
// ─────────────────────────────────────────────
export function useOfflineDrain() {
  const online = useOnlineStatus()
  useEffect(() => {
    if (!online) return
    import('../lib/plan-cache').then(({ drainCacheQueue }) => {
      import('../lib/bib-translations').then(({ getActiveTranslation }) => {
        drainCacheQueue(getActiveTranslation()).catch(() => null)
      })
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
    }).catch(() => setStatus('uncached'))
    return () => { cancelled = true }
  }, [planContent, frequency, currentDay, translationId])

  if (status === 'checking') return null

  if (status === 'cached') return (
    <div className="flex items-center gap-1">
      <CheckCircle2 size={11} style={{color:'#4A7C5F'}}/>
      <span className="text-[11px] font-semibold" style={{color:'#4A7C5F'}}>
        Available offline
      </span>
    </div>
  )

  if (!online) return (
    <div className="flex items-center gap-1">
      <WifiOff size={11} style={{color:'#E84038'}}/>
      <span className="text-[11px] font-semibold" style={{color:'#E84038'}}>
        Not downloaded
      </span>
    </div>
  )

  return null
}

// ─────────────────────────────────────────────
//  ReaderCacheBadge — small pill in reader header
// ─────────────────────────────────────────────
export function ReaderCacheBadge({ fromCache, translationId }) {
  const downloaded = translationId ? isTranslationDownloaded(translationId) : false
  if (downloaded) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{background:'#4A7C5F20', color:'#4A7C5F'}}>
      <CheckCircle2 size={9}/>
      Offline ready
    </span>
  )
  if (fromCache) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{background:'#5B4FCF20', color:'#5B4FCF'}}>
      Cached
    </span>
  )
  return null
}

// ─────────────────────────────────────────────
//  OfflineBanner — full-width, shown when offline
// ─────────────────────────────────────────────
export function OfflineBanner({ t }) {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className="px-4 py-2.5 flex items-center gap-2"
      style={{background:'#E8A83820', borderBottom:'1px solid #E8A83830'}}>
      <WifiOff size={13} style={{color:'#B07000', flexShrink:0}}/>
      <p className="text-[12px] font-semibold" style={{color:'#B07000'}}>
        You're offline — showing downloaded content only
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
//  TranslationPrompt — shown when no translation downloaded
// ─────────────────────────────────────────────
export function TranslationPrompt({ onPress }) {
  const { t } = useTheme()
  const activeId = getActiveTranslation()
  if (isTranslationDownloaded(activeId)) return null
  return (
    <button onClick={onPress}
      className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] w-full active:scale-98 transition-all"
      style={{background:'#E8A83815', border:'1.5px solid #E8A83840'}}>
      <Download size={14} style={{color:'#B07000', flexShrink:0}}/>
      <div className="flex-1 text-left">
        <p className="text-[12px] font-bold" style={{color:'#B07000'}}>
          Download a Bible translation
        </p>
        <p className="text-[11px]" style={{color:'#B07000', opacity:0.75}}>
          Read offline — free, one-time ~4 MB download
        </p>
      </div>
    </button>
  )
}