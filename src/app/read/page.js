'use client'

// ── /read — Bible reader (Updates 4a 4b 4c 4d) ──
// 4a: BottomNav hidden via useIsReadPage() in BottomNav itself
// 4b: Custom dropdown components (no native <select>)
// 4c: Floating Lightbulb FAB for nuggets (no + in header)
// 4d: Prev/Next with scroll-to-top + disabled states

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, X, CheckCircle2, Lightbulb } from 'lucide-react'
import { useCheckin } from '../../hooks/useCheckin'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS, todayStr } from '../../lib/constants'

// ─────────────────────────────────────────────
//  Custom Dropdown — Update 4b
// ─────────────────────────────────────────────
function Dropdown({ value, options, onChange, label, className = '' }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-1 bg-white border rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-text-primary transition-all ${
          open ? 'border-purple ring-2 ring-purple/20' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[12px] shadow-card-hover z-30 overflow-hidden"
          >
            <div className="overflow-y-auto scroll-hide" style={{ maxHeight: 240 }}>
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors ${
                    opt.value === value
                      ? 'bg-purple text-white font-bold'
                      : 'text-text-primary hover:bg-gray-50 font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 animate-pulse">
      {[80, 95, 70, 88, 60, 92, 75, 84, 66].map((w, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded-full" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Nugget modal — Update 4c
// ─────────────────────────────────────────────
function NuggetModal({ source, onClose }) {
  const [text, setText]       = useState('')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])

  function save() {
    const trimmed = text.trim()
    if (!trimmed) return
    setNuggets(prev => [{
      id: `nug_${Date.now()}`, date: todayStr(),
      text: trimmed, source, createdAt: new Date().toISOString(),
    }, ...(prev || [])])
    showToast('Nugget saved!')
    onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-5 pb-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber" />
            <p className="font-bold text-text-primary text-[16px]">Add a nugget</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted"><X size={15} /></button>
        </div>
        {source && <p className="text-text-muted text-[12px] mb-3">From {source} — saved to your Journey</p>}
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Write a nugget from this passage..."
          rows={4} autoFocus
          className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted mb-3"
        />
        <button onClick={save} disabled={!text.trim()}
          className="w-full bg-purple text-white rounded-pill py-3.5 font-bold text-[14px] disabled:opacity-40 transition-all active:scale-[0.97]">
          Save nugget
        </button>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function ReadPage() {
  const router = useRouter()
  const { performCheckin, isCheckedInToday } = useCheckin()

  const [bookIdx,  setBookIdx]  = useState(42) // John
  const [chapter,  setChapter]  = useState(1)
  const [transIdx, setTransIdx] = useState(0)  // KJV

  const [verses,  setVerses]  = useState(null)
  const [ref,     setRef]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [nuggetOpen, setNuggetOpen] = useState(false)

  // Ref for scroll-to-top on chapter nav — Update 4d
  const scrollRef = useRef(null)

  const currentBook = BIBLE_BOOKS[bookIdx]
  const translation = BIBLE_TRANSLATIONS[transIdx]
  const passageRef  = `${currentBook.name} ${chapter}`

  // Derived disabled states — Update 4d
  const isFirstChapter = bookIdx === 0 && chapter === 1
  const isLastChapter  = bookIdx === BIBLE_BOOKS.length - 1 && chapter === currentBook.chapters

  useEffect(() => { fetchPassage(bookIdx, chapter, transIdx) }, [])

  const fetchPassage = useCallback(async (bIdx, ch, tIdx) => {
    const book  = BIBLE_BOOKS[bIdx]
    const trans = BIBLE_TRANSLATIONS[tIdx]
    const query = encodeURIComponent(`${book.name} ${ch}`)
    setLoading(true); setError(null); setVerses(null)
    try {
      const res  = await fetch(`https://bible-api.com/${query}?translation=${trans.value}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVerses(data.verses || [])
      setRef(data.reference || `${book.name} ${ch}`)
    } catch {
      setError("Couldn't load this passage. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Update 4b: selecting chapter auto-fetches immediately
  function handleBookChange(idx) {
    const newIdx = Number(idx)
    setBookIdx(newIdx)
    setChapter(1)
    fetchPassage(newIdx, 1, transIdx)
  }

  function handleChapterChange(ch) {
    const newCh = Number(ch)
    setChapter(newCh)
    fetchPassage(bookIdx, newCh, transIdx)  // auto-fetch on chapter select
  }

  function handleVersionChange(idx) {
    const newIdx = Number(idx)
    setTransIdx(newIdx)
    // Version only fetches on Go (or chapter change) per spec — don't auto-fetch here
  }

  function handleGo() { fetchPassage(bookIdx, chapter, transIdx) }

  // Update 4d: scroll to top on navigation
  function prevChapter() {
    if (isFirstChapter) return
    let b = bookIdx, c = chapter - 1
    if (c < 1) { b = bookIdx - 1; c = BIBLE_BOOKS[b].chapters }
    setBookIdx(b); setChapter(c)
    fetchPassage(b, c, transIdx)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextChapter() {
    if (isLastChapter) return
    let b = bookIdx, c = chapter + 1
    if (c > BIBLE_BOOKS[b].chapters) { b = bookIdx + 1; c = 1 }
    setBookIdx(b); setChapter(c)
    fetchPassage(b, c, transIdx)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleMarkRead() {
    const did = performCheckin({ passage: passageRef, shared: false })
    if (did) {
      showToast('Marked as read!')
      setTimeout(() => router.push('/checkin'), 400)
    } else {
      showToast('Already checked in today')
    }
  }

  // Dropdown option arrays
  const bookOptions    = BIBLE_BOOKS.map((b, i) => ({ value: i, label: b.name }))
  const chapterOptions = Array.from({ length: currentBook.chapters }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))
  const versionOptions = BIBLE_TRANSLATIONS.map((t, i) => ({ value: i, label: t.label }))

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg overflow-x-hidden">

      {/* ── HEADER — back arrow + title, no + button (Update 4c) ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-text-primary hover:bg-gray-50 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-text-primary text-[16px]">Read</h1>
        {/* Spacer to keep title centred */}
        <div className="w-9" />
      </div>

      {/* ── Update 4b: CUSTOM DROPDOWNS ── */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 items-start">
          {/* Book — wider */}
          <Dropdown
            className="flex-1"
            value={bookIdx}
            options={bookOptions}
            onChange={handleBookChange}
            label="Book"
          />
          {/* Chapter */}
          <Dropdown
            className="w-[72px]"
            value={chapter}
            options={chapterOptions}
            onChange={handleChapterChange}
            label="Ch"
          />
          {/* Version */}
          <Dropdown
            className="w-[72px]"
            value={transIdx}
            options={versionOptions}
            onChange={handleVersionChange}
            label="Ver"
          />
          {/* Go button — triggers fetch for version changes */}
          <button
            onClick={handleGo}
            className="bg-purple text-white rounded-[12px] px-4 py-2.5 text-[13px] font-bold hover:bg-purple-dark active:scale-95 transition-all flex-shrink-0 h-[42px]"
          >
            Go
          </button>
        </div>
      </div>

      {/* ── PASSAGE CONTENT ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-hide">
        {loading && <Skeleton />}

        {error && !loading && (
          <div className="px-5 py-10 text-center">
            <p className="text-text-muted text-[14px] leading-relaxed">{error}</p>
          </div>
        )}

        {verses && !loading && (
          <motion.div key={ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-2 pb-28">
            <p className="font-bold text-purple text-[13px] mb-4">{ref} · {translation.label}</p>
            {verses.map(v => (
              <p key={v.verse} className="font-display text-[17px] leading-[1.9] text-text-primary mb-1">
                <span className="text-[12px] text-text-muted font-sans mr-2 select-none">{v.verse}</span>
                {v.text}
              </p>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Update 4d: CHAPTER NAV with disabled states ── */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-warm-bg">
        <button
          onClick={prevChapter}
          disabled={isFirstChapter}
          className="flex items-center gap-1 font-semibold text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-purple"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="text-text-muted text-[12px] font-semibold">{passageRef}</span>
        <button
          onClick={nextChapter}
          disabled={isLastChapter}
          className="flex items-center gap-1 font-semibold text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-purple"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* ── MARK AS READ ── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-warm-bg pb-8">
        {isCheckedInToday ? (
          <div className="w-full flex items-center justify-center gap-2 bg-sage-light text-sage rounded-pill py-4 font-bold text-[15px]">
            <CheckCircle2 size={18} />
            Already checked in today
          </div>
        ) : (
          <button
            onClick={handleMarkRead}
            disabled={!verses}
            className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark active:scale-[0.97] transition-all disabled:opacity-40"
          >
            ✓  Mark as read for today
          </button>
        )}
      </div>

      {/* ── Update 4c: FLOATING LIGHTBULB FAB ── */}
      <button
        onClick={() => setNuggetOpen(true)}
        className="fixed bottom-36 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-30"
        style={{ background: '#E8A838' }}
        aria-label="Add nugget"
      >
        <Lightbulb size={20} className="text-white" />
      </button>

      <AnimatePresence>
        {nuggetOpen && <NuggetModal source={passageRef} onClose={() => setNuggetOpen(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}