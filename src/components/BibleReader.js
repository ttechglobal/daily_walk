'use client'

// ── Update 3: Inline Bible Reader bottom sheet ──
// Uses the free bible-api.com — no API key required.
// KJV, WEB, ASV translations all supported.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, CheckCircle2, BookOpen, ChevronDown } from 'lucide-react'

const TRANSLATIONS = [
  { value: 'kjv', label: 'KJV' },
  { value: 'web', label: 'WEB' },
  { value: 'asv', label: 'ASV' },
]

const DEFAULT_PASSAGE = 'john 1'

export default function BibleReader({ isOpen, onClose, onMarkRead }) {
  const [query,       setQuery]       = useState(DEFAULT_PASSAGE)
  const [translation, setTranslation] = useState('kjv')
  const [passage,     setPassage]     = useState(null)   // { reference, text, verses }
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const inputRef = useRef(null)

  // Fetch default passage when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchPassage(DEFAULT_PASSAGE, 'kjv')
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [isOpen])

  async function fetchPassage(q = query, t = translation) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setPassage(null)
    try {
      const encoded = encodeURIComponent(q.trim())
      const res = await fetch(`https://bible-api.com/${encoded}?translation=${t}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPassage(data)
    } catch {
      setError('Passage not found — try again (e.g. "John 3", "Psalm 23")')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchPassage(query, translation)
  }

  function handleTranslationChange(t) {
    setTranslation(t)
    if (passage) fetchPassage(query, t)
  }

  function handleMarkRead() {
    const passageRef = passage?.reference || query
    onMarkRead(passageRef)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-50 flex flex-col"
            style={{ maxHeight: '92dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-purple" />
                <span className="font-display font-semibold text-[17px] text-text-primary">Bible Reader</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search bar + translation */}
            <div className="px-4 pb-3 flex flex-col gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. John 3, Psalm 23"
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-input text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 bg-purple text-white rounded-input text-[14px] font-bold hover:bg-purple-dark active:scale-95 transition-all"
                >
                  Go
                </button>
              </form>

              {/* Translation picker */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted font-semibold">Translation:</span>
                <div className="flex gap-1">
                  {TRANSLATIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => handleTranslationChange(t.value)}
                      className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
                        translation === t.value
                          ? 'bg-purple text-white'
                          : 'bg-purple-light text-purple hover:bg-purple/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-4" />

            {/* Content area — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scroll-hide">

              {/* Loading skeleton */}
              {loading && (
                <div className="flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                  ))}
                </div>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <BookOpen size={32} className="text-gray-300" />
                  <p className="text-text-muted text-[14px]">{error}</p>
                  <button
                    onClick={() => fetchPassage()}
                    className="text-purple text-[13px] font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Passage text */}
              {passage && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[11px] font-bold text-purple uppercase tracking-widest mb-4">
                    {passage.reference} — {TRANSLATIONS.find(t => t.value === translation)?.label}
                  </p>

                  {/* Render verse by verse for clean formatting */}
                  <div className="flex flex-col gap-2">
                    {passage.verses?.map(v => (
                      <div key={v.verse} className="flex gap-3">
                        <span className="text-[11px] font-bold text-purple/50 mt-[3px] w-5 flex-shrink-0 text-right">
                          {v.verse}
                        </span>
                        <p className="font-display text-[17px] leading-[1.9] text-text-primary flex-1">
                          {v.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bottom padding so text doesn't hide behind button */}
                  <div className="h-28" />
                </motion.div>
              )}
            </div>

            {/* Mark as read — sticky at bottom, only shown when passage loaded */}
            <AnimatePresence>
              {passage && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-4 pb-8 pt-3 border-t border-gray-100 bg-warm-bg"
                >
                  <button
                    onClick={handleMarkRead}
                    className="w-full flex items-center justify-center gap-2 bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark active:scale-[0.97] transition-all"
                  >
                    <CheckCircle2 size={18} />
                    Mark as read for today
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}