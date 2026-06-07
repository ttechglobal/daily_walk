'use client'

// ── src/components/TranslationSheet.js ── v4
// Shows ALL translations — no filtering.
// Static list renders instantly. fetchTranslations() upgrades in background.
// KJV: always online. Others: Download button.
// One KJV — no duplicates.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Download } from 'lucide-react'
import {
  TRANSLATIONS,
  fetchTranslations,
  getDownloadedSet,
  setActiveTranslation,
} from '../lib/bib-translations'
import { downloadTranslation, getDownloadState, subscribeToDownload } from '../lib/translation-download'

export default function TranslationSheet({ currentId, onSelect, onClose, t }) {
  const [list,     setList]     = useState(TRANSLATIONS) // instant — no flicker
  const [dlStates, setDlStates] = useState({})
  const downloaded = getDownloadedSet()

  // Upgrade to live DB list silently in background
  useEffect(() => {
    fetchTranslations().then(live => { if (live?.length) setList(live) })
  }, [])

  // Track download progress per translation
  useEffect(() => {
    const unsubs = list.map(tr =>
      subscribeToDownload(tr.id, state =>
        setDlStates(prev => ({ ...prev, [tr.id]: state }))
      )
    )
    return () => unsubs.forEach(u => u?.())
  }, [list])

  function handleSelect(id) {
    setActiveTranslation(id)
    onSelect(id)
    onClose()
  }

  function handleDownload(e, id) {
    e.stopPropagation()
    downloadTranslation(id)
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />

      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background: t.bgCard, maxHeight: '80dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: t.border }}>
          <p className="font-bold text-[18px]" style={{ color: t.text }}>Translation</p>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <X size={15} style={{ color: t.textMuted }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {list.map(tr => {
            const isActive      = tr.id === currentId
            const dl            = dlStates[tr.id] || {}
            const isDone        = downloaded.has(tr.id) || dl.status === 'done'
            const isDownloading = dl.status === 'downloading'
            const pct           = dl.pct ?? 0

            return (
              <button key={tr.id} onClick={() => handleSelect(tr.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all active:opacity-70"
                style={{
                  borderBottom: `1px solid ${t.border}`,
                  background:   isActive ? '#5B4FCF08' : 'transparent',
                }}>

                {/* Abbreviation */}
                <span className="font-bold text-[17px] w-14 flex-shrink-0"
                  style={{ color: isActive ? '#5B4FCF' : t.text }}>
                  {tr.abbreviation}
                </span>

                {/* Name + download bar */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate" style={{ color: t.text }}>
                    {tr.name}
                  </p>
                  {isDownloading && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#5B4FCF', transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>

                {/* Right action */}
                <div className="flex-shrink-0">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#5B4FCF' }}>
                      <Check size={13} color="white" strokeWidth={3} />
                    </div>
                  ) : isDownloading ? (
                    <span className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{pct}%</span>
                  ) : isDone || tr.alwaysOnline ? (
                    <span className="text-[11px] font-semibold" style={{ color: '#4A7C5F' }}>
                      {tr.alwaysOnline ? 'Online' : '✓'}
                    </span>
                  ) : (
                    <button onClick={e => handleDownload(e, tr.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-bold"
                      style={{ borderColor: t.border, color: t.textMuted }}>
                      <Download size={11} /> Download
                    </button>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>
    </>
  )
}