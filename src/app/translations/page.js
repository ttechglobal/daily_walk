'use client'

// ── src/app/translations/page.js ── v3
// FIX: removed TRANSLATIONS.filter(tr => tr.enabled) — that was the cause
//      of the blank list. TRANSLATIONS no longer has an enabled field.
//      All translations are shown. KJV is always available online.
//      Others show a Download/Get button.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Loader2, WifiOff } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import {
  TRANSLATIONS,
  getActiveTranslation,
  setActiveTranslation,
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
//  Single row
// ─────────────────────────────────────────────
function TranslationRow({ tr, isActive, isDownloaded, onActivate, onDownload, t }) {
  const [dlState,       setDlState]       = useState(() => getDownloadState(tr.id))
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => subscribeToDownload(tr.id, setDlState), [tr.id])

  const isDownloading = dlState?.status === 'downloading'
  const isPaused      = dlState?.status === 'paused'
  const isDone        = dlState?.status === 'done' || isDownloaded
  const isDeleting    = dlState?.status === 'deleting'
  const pct           = dlState?.pct ?? 0

  async function handleDelete() {
    setConfirmDelete(false)
    await deleteTranslation(tr.id)
    markDeleted(tr.id)
  }

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <button
        onClick={() => onActivate(tr.id)}
        className="w-full flex items-center gap-4 px-4 py-4 text-left active:opacity-70 transition-opacity"
        style={{ background: isActive ? '#5B4FCF08' : 'transparent' }}>

        {/* Abbreviation */}
        <span style={{
          width: 54, flexShrink: 0, fontSize: 18, fontWeight: 700,
          color: isActive ? '#5B4FCF' : isDone ? t.text : t.textMuted,
        }}>
          {tr.abbreviation}
        </span>

        {/* Name + progress bar */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, color: t.text }} className="truncate">
            {tr.name}
          </p>
          {isDownloading && (
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: '#5B4FCF', borderRadius: 99,
                transition: 'width 0.3s',
              }} />
            </div>
          )}
        </div>

        {/* Right action */}
        <div style={{ flexShrink: 0 }}>
          {isActive && (
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#5B4FCF', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={13} color="white" strokeWidth={3} />
            </div>
          )}

          {!isActive && tr.alwaysOnline && !isDone && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4A7C5F' }}>Online</span>
          )}

          {!isActive && isDone && !isDownloading && !isPaused && (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(v => !v) }}
              style={{
                fontSize: 11, fontWeight: 600, color: t.textMuted,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}>
              ✓ Saved
            </button>
          )}

          {!isActive && !isDone && !isDownloading && !isPaused && !isDeleting && (
            <button
              onClick={e => { e.stopPropagation(); onDownload(tr.id) }}
              style={{
                height: 32, padding: '0 16px', borderRadius: 16,
                background: '#5B4FCF', color: '#fff',
                fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}>
              Get
            </button>
          )}

          {isDownloading && (
            <button
              onClick={e => { e.stopPropagation(); pauseDownload(tr.id) }}
              style={{
                height: 32, padding: '0 14px', borderRadius: 16,
                background: t.bgMuted, color: t.text,
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              }}>
              Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={e => { e.stopPropagation(); resumeDownload(tr.id) }}
              style={{
                height: 32, padding: '0 14px', borderRadius: 16,
                background: '#5B4FCF', color: '#fff',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>
              Resume
            </button>
          )}

          {isDeleting && (
            <Loader2 size={17} className="animate-spin" style={{ color: t.textMuted }} />
          )}
        </div>
      </button>

      {/* Confirm delete */}
      {confirmDelete && isDone && !isActive && (
        <div className="flex items-center gap-2 px-4 pb-3 pt-0">
          <p style={{ fontSize: 12, color: t.textMuted, flex: 1 }}>
            Remove offline copy?
          </p>
          <button onClick={handleDelete}
            style={{
              height: 28, padding: '0 12px', borderRadius: 14,
              background: '#EF444420', color: '#EF4444',
              fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}>
            Remove
          </button>
          <button onClick={() => setConfirmDelete(false)}
            style={{
              height: 28, padding: '0 12px', borderRadius: 14,
              background: t.bgMuted, color: t.textMuted,
              fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
            }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
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
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Refresh downloaded set when any download completes
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

  // ── THE FIX: use TRANSLATIONS directly — no .filter(tr => tr.enabled)
  const list = TRANSLATIONS

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: t.bg }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 border-b"
        style={{ background: t.bg, borderColor: t.border }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgMuted }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: t.text }}>My Bibles</h1>
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ background: '#E8A83815', borderBottom: `1px solid ${t.border}` }}>
          <WifiOff size={14} style={{ color: '#B07000', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#B07000' }}>You're offline — downloads paused</p>
        </div>
      )}

      {/* Subtitle */}
      <p style={{
        fontSize: 13, color: t.textMuted, lineHeight: 1.5,
        padding: '10px 16px',
        borderBottom: `1px solid ${t.border}`,
      }}>
        KJV is always available. Download others to read offline.
      </p>

      {/* List — ALL translations, no filter */}
      <div className="flex-1">
        {list.map(tr => (
          <TranslationRow
            key={tr.id}
            tr={tr}
            isActive={activeId === tr.id}
            isDownloaded={downloadedIds.has(tr.id)}
            onActivate={handleActivate}
            onDownload={handleDownload}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}