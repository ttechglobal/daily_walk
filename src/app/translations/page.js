'use client'

// ── src/app/translations/page.js ──
// My Bibles — simplified translation library.
//
// UX PRINCIPLES:
//   1. KJV always works online — no download needed ever
//   2. Download = offline access only (clearly communicated)
//   3. One action per translation: Get / Switch / Active
//   4. Zero info overload — name, status, button. That's it.
//   5. Downloading shows a slim progress bar, nothing else

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Loader2, WifiOff } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import {
  TRANSLATIONS,
  getActiveTranslation,
  setActiveTranslation,
  isTranslationDownloaded,
  getDownloadedSet,
  markDeleted,
} from '../../lib/bib-translations'
import {
  downloadTranslation,
  deleteTranslation,
  getDownloadState,
  subscribeToDownload,
  pauseDownload,
  resumeDownload,
} from '../../lib/translation-download'

// ─────────────────────────────────────────────
//  Single translation row
// ─────────────────────────────────────────────
function TranslationRow({ tr, isActive, isDownloaded, onActivate, onDownload, onDelete, t }) {
  const [dlState, setDlState] = useState(() => getDownloadState(tr.id))
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    return subscribeToDownload(tr.id, setDlState)
  }, [tr.id])

  const isDownloading = dlState?.status === 'downloading'
  const isPaused      = dlState?.status === 'paused'
  const isDone        = dlState?.status === 'done' || isDownloaded
  const isDeleting    = dlState?.status === 'deleting'
  const pct           = dlState?.pct ?? 0

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-3 px-4 py-4">

        {/* Abbreviation */}
        <div style={{
          width:      52,
          flexShrink: 0,
          fontSize:   18,
          fontWeight: 600,
          color:      isActive ? '#5B4FCF' : isDone ? '#4A7C5F' : t.textMuted,
        }}>
          {tr.abbreviation}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 15, fontWeight: 500, color: t.text }}>
            {tr.name}
          </p>
          {isActive && (
            <p style={{ fontSize: 12, color: '#5B4FCF', marginTop: 1 }}>
              Reading now · Online
            </p>
          )}
          {isDone && !isActive && (
            <p style={{ fontSize: 12, color: '#4A7C5F', marginTop: 1 }}>
              Downloaded · Offline ready
            </p>
          )}
          {isDownloading && (
            <p style={{ fontSize: 12, color: '#5B4FCF', marginTop: 1 }}>
              Downloading {pct}%…
            </p>
          )}
          {isPaused && (
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>
              Paused at {pct}%
            </p>
          )}
          {!isDone && !isDownloading && !isPaused && !isDeleting && (
            <p style={{ fontSize: 12, color: t.textFaint, marginTop: 1 }}>
              {tr.license}
            </p>
          )}
          {isDeleting && (
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>
              Removing…
            </p>
          )}

          {/* Progress bar — only shown while downloading */}
          {(isDownloading || isPaused) && (
            <div style={{
              height:       2,
              background:   t.border,
              borderRadius: 1,
              marginTop:    6,
              overflow:     'hidden',
            }}>
              <motion.div
                style={{ height: 2, background: '#5B4FCF', borderRadius: 1 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active state — no action needed */}
          {isActive && !confirmDelete && (
            <div style={{
              width:        28, height:      28,
              borderRadius: 14,
              background:   '#5B4FCF',
              display:      'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={14} color="#fff" />
            </div>
          )}

          {/* Downloaded, not active → Switch button */}
          {isDone && !isActive && !confirmDelete && (
            <>
              <button
                onClick={() => onActivate(tr.id)}
                style={{
                  height:       32,
                  padding:      '0 14px',
                  borderRadius: 16,
                  background:   '#5B4FCF12',
                  color:        '#5B4FCF',
                  fontSize:     13,
                  fontWeight:   600,
                  border:       'none',
                  cursor:       'pointer',
                }}>
                Switch
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  height:       32,
                  padding:      '0 10px',
                  borderRadius: 16,
                  background:   'transparent',
                  color:        t.textFaint,
                  fontSize:     12,
                  border:       'none',
                  cursor:       'pointer',
                }}>
                Remove
              </button>
            </>
          )}

          {/* Confirm delete */}
          {confirmDelete && (
            <>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize:12, color:t.textMuted, border:'none', background:'transparent', cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmDelete(false); onDelete(tr.id) }}
                style={{
                  height:32, padding:'0 12px', borderRadius:16,
                  background:'#E8403812', color:'#E84038',
                  fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                }}>
                Remove
              </button>
            </>
          )}

          {/* Not downloaded → Get button */}
          {!isDone && !isDownloading && !isPaused && !isDeleting && !confirmDelete && (
            <button
              onClick={() => onDownload(tr.id)}
              style={{
                height:       32,
                padding:      '0 16px',
                borderRadius: 16,
                background:   '#5B4FCF',
                color:        '#fff',
                fontSize:     13,
                fontWeight:   600,
                border:       'none',
                cursor:       'pointer',
              }}>
              Get
            </button>
          )}

          {/* Downloading → pause */}
          {isDownloading && (
            <button onClick={() => pauseDownload(tr.id)}
              style={{
                height:32, padding:'0 14px', borderRadius:16,
                background:t.bgMuted, color:t.text,
                fontSize:13, fontWeight:500, border:'none', cursor:'pointer',
              }}>
              Pause
            </button>
          )}

          {/* Paused → resume */}
          {isPaused && (
            <button onClick={() => resumeDownload(tr.id)}
              style={{
                height:32, padding:'0 14px', borderRadius:16,
                background:'#5B4FCF', color:'#fff',
                fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
              }}>
              Resume
            </button>
          )}

          {/* Deleting */}
          {isDeleting && <Loader2 size={18} style={{ color:t.textMuted }} className="animate-spin"/>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function TranslationsPage() {
  const router = useRouter()
  const { t }  = useTheme()

  const [activeId,      setActiveId]      = useState(getActiveTranslation)
  const [downloadedIds, setDownloadedIds] = useState(getDownloadedSet)
  const [online,        setOnline]        = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOnline(navigator.onLine)
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Refresh downloaded list when any download completes
  useEffect(() => {
    const h = () => setDownloadedIds(getDownloadedSet())
    window.addEventListener('dw-translation-download', h)
    return () => window.removeEventListener('dw-translation-download', h)
  }, [])

  const handleActivate = useCallback((id) => {
    setActiveTranslation(id)
    setActiveId(id)
  }, [])

  const handleDownload = useCallback((id) => {
    if (!online) return
    downloadTranslation(id)
  }, [online])

  const handleDelete = useCallback(async (id) => {
    await deleteTranslation(id)
    setDownloadedIds(getDownloadedSet())
  }, [])

  const enabled = TRANSLATIONS.filter(tr => tr.enabled)

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: t.bg }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 border-b"
        style={{ background: t.bg, borderColor: t.border }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: t.bgMuted }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: t.text }}>
          My Bibles
        </h1>
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ background: '#E8A83815', borderBottom: `1px solid ${t.border}` }}>
          <WifiOff size={14} style={{ color: '#B07000', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#B07000' }}>
            You're offline — downloads paused
          </p>
        </div>
      )}

      {/* Explainer — one line, not a wall of text */}
      <p style={{
        fontSize:     13,
        color:        t.textMuted,
        padding:      '12px 16px',
        borderBottom: `1px solid ${t.border}`,
        lineHeight:   1.5,
      }}>
        KJV is always available. Download others to read offline.
      </p>

      {/* Translation list */}
      <div className="flex-1">
        <AnimatePresence>
          {enabled.map(tr => (
            <motion.div key={tr.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <TranslationRow
                tr={tr}
                isActive={activeId === tr.id}
                isDownloaded={downloadedIds.has(tr.id)}
                onActivate={handleActivate}
                onDownload={handleDownload}
                onDelete={handleDelete}
                t={t}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  )
}