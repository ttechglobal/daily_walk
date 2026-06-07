'use client'

// ── src/app/read/page.js ── v6
// FIXES IN THIS VERSION:
//   1. Translation sheet — removed .filter(tr => tr.enabled). Shows ALL translations.
//   2. Chapter nav pill — removed BookOpen icon.
//   3. Red-letter support — parses <J>...</J>, [WJ]...[/WJ], <WJ>...</WJ> in verse text.
//   4. Section headings — detects verses with number=0, type='heading', or text starting '='
//   5. getChapter() now preserves heading + wj data from the raw JSON (see bible.js patch below)

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, WifiOff, Sun, Moon,
  Plus, Minus, ChevronLeft, ChevronRight,
  Download, Check, Languages, X, ChevronDown,
  Copy, Highlighter, MessageSquarePlus, HelpCircle,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { getChapter, BIBLE_BOOK_LIST, normaliseBookId, getBookByName } from '../../lib/bible'
import {
  TRANSLATIONS, getActiveTranslation, setActiveTranslation, getDownloadedSet,
} from '../../lib/bib-translations'
import { downloadTranslation, subscribeToDownload } from '../../lib/translation-download'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const FONT_OPTIONS = [
  { id: 'lora',    label: 'Lora',    style: "'Lora', Georgia, serif" },
  { id: 'jakarta', label: 'Jakarta', style: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'georgia', label: 'Georgia', style: 'Georgia, serif' },
  { id: 'system',  label: 'System',  style: 'system-ui, sans-serif' },
]

const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#FFF176' },
  { id: 'green',  hex: '#C8E6C9' },
  { id: 'blue',   hex: '#BBDEFB' },
  { id: 'pink',   hex: '#F8BBD0' },
  { id: 'orange', hex: '#FFE0B2' },
]

// ─────────────────────────────────────────────
//  Red-letter parser
//  Handles: <J>text</J>  [WJ]text[/WJ]  <WJ>text</WJ>
// ─────────────────────────────────────────────
function parseVerseText(raw) {
  if (!raw) return [{ type: 'text', text: '' }]

  // Pick the right tag pair
  let open, close
  if (raw.includes('<J>'))   { open = '<J>';   close = '</J>'   }
  else if (raw.includes('[WJ]'))  { open = '[WJ]';  close = '[/WJ]'  }
  else if (raw.includes('<WJ>'))  { open = '<WJ>';  close = '</WJ>'  }
  else return [{ type: 'text', text: raw }]

  const segments = []
  let rest = raw
  while (rest.length > 0) {
    const s = rest.indexOf(open)
    if (s === -1) { segments.push({ type: 'text', text: rest }); break }
    if (s > 0) segments.push({ type: 'text', text: rest.slice(0, s) })
    const e = rest.indexOf(close, s + open.length)
    if (e === -1) { segments.push({ type: 'red', text: rest.slice(s + open.length) }); break }
    segments.push({ type: 'red', text: rest.slice(s + open.length, e) })
    rest = rest.slice(e + close.length)
  }
  return segments
}

// ─────────────────────────────────────────────
//  Heading detection
//  verse.number === 0 or verse.type === 'heading' or verse.heading field
// ─────────────────────────────────────────────
function isHeading(v) {
  if (!v) return false
  if (v.type === 'heading' || v.isHeading) return true
  if (v.number === 0 || v.number === '0') return true
  if (v.heading) return true
  if (typeof v.text === 'string' && v.text.startsWith('=')) return true
  return false
}
function headingText(v) {
  return v.heading || v.title || (typeof v.text === 'string' ? v.text.replace(/^=+/, '').trim() : '')
}

// ─────────────────────────────────────────────
//  Highlight storage
// ─────────────────────────────────────────────
const HL_KEY = 'dw_verse_highlights'
function loadHL()          { try { return JSON.parse(localStorage.getItem(HL_KEY) || '{}') } catch { return {} } }
function saveHL(m)         { try { localStorage.setItem(HL_KEY, JSON.stringify(m)) } catch {} }
function vKey(b, ch, n)    { return `${b}::${ch}::${n}` }

// ─────────────────────────────────────────────
//  Toast (inline, no dep)
// ─────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState(null)
  function fire(m) { setMsg(m); setTimeout(() => setMsg(null), 2400) }
  const el = (
    <AnimatePresence>
      {msg && (
        <motion.div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-lg"
          style={{ background: '#1A1A2E', pointerEvents: 'none' }}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
  return [fire, el]
}

// ─────────────────────────────────────────────
//  Navigator sheet  (NO BookOpen icon in pill)
// ─────────────────────────────────────────────
function NavigatorSheet({ currentBook, currentChapter, onSelect, onClose, t }) {
  const [search, setSearch]  = useState('')
  const [selBook, setSelBook] = useState(currentBook || 'John')
  const filtered     = BIBLE_BOOK_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
  const chapterCount = BIBLE_BOOK_LIST.find(b => b.name === selBook)?.chapters || 1

  const OT = filtered.filter(b => b.testament === 'OT')
  const NT = filtered.filter(b => b.testament === 'NT')

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background: t.bgCard, height: '82dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <p className="font-bold text-[18px]" style={{ color: t.text }}>Go to</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <X size={15} style={{ color: t.textMuted }} />
          </button>
        </div>
        <div className="px-4 pb-3 flex-shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search book…"
            className="w-full px-4 py-2.5 rounded-[12px] text-[14px] border focus:outline-none"
            style={{ background: t.bgMuted, borderColor: t.border, color: t.text }} />
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Book list */}
          <div className="w-[52%] overflow-y-auto border-r flex-shrink-0" style={{ borderColor: t.border }}>
            {[{ label: 'Old Testament', items: OT }, { label: 'New Testament', items: NT }]
              .filter(g => g.items.length)
              .map(({ label, items }) => (
                <div key={label}>
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest sticky top-0"
                    style={{ color: t.textFaint, background: t.bgCard }}>{label}</p>
                  {items.map(b => (
                    <button key={b.name} onClick={() => setSelBook(b.name)}
                      className="w-full text-left px-4 py-2.5 text-[14px] font-medium transition-all"
                      style={{
                        color:      selBook === b.name ? '#5B4FCF' : t.text,
                        background: selBook === b.name ? '#EDE9FF' : 'transparent',
                        fontWeight: selBook === b.name ? 700 : 500,
                      }}>{b.name}</button>
                  ))}
                </div>
              ))}
          </div>
          {/* Chapter grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1"
              style={{ color: t.textFaint }}>Chapter</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map(ch => {
                const cur = selBook === currentBook && ch === currentChapter
                return (
                  <button key={ch} onClick={() => { onSelect(selBook, ch); onClose() }}
                    className="aspect-square rounded-[12px] flex items-center justify-center font-bold text-[15px] transition-all active:scale-90"
                    style={{
                      background: cur ? '#5B4FCF' : t.bgMuted,
                      color:      cur ? 'white'   : t.text,
                      border:     cur ? 'none'    : `1px solid ${t.border}`,
                    }}>{ch}</button>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Translation sheet — ALL translations, no filter
// ─────────────────────────────────────────────
function TranslationSheet({ currentId, onSelect, onClose, t }) {
  const [dlStates, setDlStates] = useState({})
  const downloaded = getDownloadedSet()

  // FIX: use TRANSLATIONS directly — no .filter(tr => tr.enabled)
  const list = TRANSLATIONS

  useEffect(() => {
    const unsubs = list.map(tr =>
      subscribeToDownload(tr.id, state => setDlStates(prev => ({ ...prev, [tr.id]: state })))
    )
    return () => unsubs.forEach(u => u?.())
  }, []) // eslint-disable-line

  function handleSelect(id) { setActiveTranslation(id); onSelect(id); onClose() }
  function handleDownload(e, id) { e.stopPropagation(); downloadTranslation(id) }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
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
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
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
                style={{ borderBottom: `1px solid ${t.border}`, background: isActive ? '#5B4FCF08' : 'transparent' }}>
                {/* Abbreviation */}
                <span className="font-bold text-[17px] w-14 flex-shrink-0"
                  style={{ color: isActive ? '#5B4FCF' : t.text }}>
                  {tr.abbreviation}
                </span>
                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate" style={{ color: t.text }}>{tr.name}</p>
                  {isDownloading && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#5B4FCF', borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
                {/* Action */}
                <div className="flex-shrink-0">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#5B4FCF' }}>
                      <Check size={13} color="white" strokeWidth={3} />
                    </div>
                  ) : isDownloading ? (
                    <span className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{pct}%</span>
                  ) : isDone ? (
                    <span className="text-[11px] font-semibold" style={{ color: '#4A7C5F' }}>✓</span>
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

// ─────────────────────────────────────────────
//  Font settings sheet
// ─────────────────────────────────────────────
function FontSheet({ fontSize, fontId, onFontSize, onFontId, onClose, t }) {
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70]"
        style={{ background: t.bgCard }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: t.border }}>
          <p className="font-bold text-[17px]" style={{ color: t.text }}>Text settings</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.bgMuted }}>
            <X size={15} style={{ color: t.textMuted }} />
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div>
            <p className="text-[13px] font-bold mb-3" style={{ color: t.textMuted }}>Size</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onFontSize(Math.max(13, fontSize - 1))}
                className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: t.border }}>
                <Minus size={16} style={{ color: t.text }} />
              </button>
              <span className="flex-1 text-center font-bold text-[17px]" style={{ color: t.text }}>{fontSize}px</span>
              <button onClick={() => onFontSize(Math.min(26, fontSize + 1))}
                className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: t.border }}>
                <Plus size={16} style={{ color: t.text }} />
              </button>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold mb-3" style={{ color: t.textMuted }}>Font</p>
            <div className="flex flex-col gap-2">
              {FONT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => onFontId(f.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-2 transition-all"
                  style={{ borderColor: fontId === f.id ? '#5B4FCF' : t.border, background: fontId === f.id ? '#EDE9FF' : t.bgMuted }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: fontId === f.id ? '#5B4FCF' : t.border }}>
                    {fontId === f.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5B4FCF' }} />}
                  </div>
                  <span style={{ fontFamily: f.style, fontSize: 15, color: fontId === f.id ? '#5B4FCF' : t.text }}>
                    {f.label} — The quick brown fox
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Verse action sheet
// ─────────────────────────────────────────────
function VerseSheet({ verse, book, chapter, highlights, onHighlight, onClose, toast, t }) {
  const [showColors, setShowColors] = useState(false)
  const key = vKey(book, chapter, verse?.number)
  const hl  = highlights[key]

  function copy() {
    const text = `${verse.text?.replace(/<[^>]+>/g, '').replace(/\[[^\]]+\]/g, '')}\n— ${book} ${chapter}:${verse.number}`
    navigator.clipboard?.writeText(text).catch(() => null)
    onClose(); toast(`${book} ${chapter}:${verse.number} copied`)
  }
  function addReflection() {
    try { sessionStorage.setItem('dw_pending_reflection', JSON.stringify({ reference: `${book} ${chapter}:${verse.number}`, text: verse.rawText || verse.text, timestamp: Date.now() })) } catch {}
    onClose(); toast('Added to your reflection ✍️')
  }
  function addQuestion() {
    try { sessionStorage.setItem('dw_pending_question', JSON.stringify({ reference: `${book} ${chapter}:${verse.number}`, text: verse.rawText || verse.text, timestamp: Date.now() })) } catch {}
    onClose(); toast('Saved as a question 🤔')
  }
  function setColor(cid) {
    onHighlight(key, cid); onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[80]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[90]"
        style={{ background: t.bgCard, paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
        </div>
        <div className="px-5 py-3 border-b" style={{ borderColor: t.border }}>
          <p className="text-[12px] font-bold mb-1" style={{ color: '#5B4FCF' }}>{book} {chapter}:{verse?.number}</p>
          <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: t.text }}>
            {verse?.text?.replace(/<[^>]+>/g, '').replace(/\[[^\]]+\]/g, '')}
          </p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          {[
            { icon: Copy,              color: '#5B4FCF', bg: '#EDE9FF', label: 'Copy verse',        sub: 'Copy text + reference',           fn: copy },
            { icon: MessageSquarePlus, color: '#4A7C5F', bg: '#E8F5EE', label: 'Add to reflection', sub: 'Save to your reading plan notes',  fn: addReflection },
            { icon: HelpCircle,        color: '#E8A838', bg: '#FFF3DC', label: 'Add to questions',  sub: 'Note something to study further',  fn: addQuestion  },
          ].map(({ icon: Icon, color, bg, label, sub, fn }) => (
            <button key={label} onClick={fn}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] w-full text-left active:opacity-70 transition-opacity"
              style={{ background: t.bgMuted }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: bg }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div>
                <p className="font-semibold text-[14px]" style={{ color: t.text }}>{label}</p>
                <p className="text-[12px]" style={{ color: t.textMuted }}>{sub}</p>
              </div>
            </button>
          ))}

          {/* Highlight */}
          <button onClick={() => setShowColors(v => !v)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] w-full text-left active:opacity-70"
            style={{ background: t.bgMuted }}>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: '#F8BBD0' }}>
              <Highlighter size={17} style={{ color: '#E84060' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px]" style={{ color: t.text }}>Highlight</p>
              <p className="text-[12px]" style={{ color: t.textMuted }}>{hl ? 'Change or remove highlight' : 'Mark this verse'}</p>
            </div>
            <ChevronDown size={15} style={{ color: t.textFaint, transform: showColors ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          <AnimatePresence>
            {showColors && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c.id} onClick={() => setColor(c.id)}
                      className="w-10 h-10 rounded-full border-4 transition-all active:scale-90"
                      style={{ background: c.hex, borderColor: hl === c.id ? '#5B4FCF' : 'transparent' }} />
                  ))}
                  {hl && (
                    <button onClick={() => setColor(null)}
                      className="px-3 h-10 rounded-full text-[12px] font-semibold border"
                      style={{ borderColor: t.border, color: t.textMuted }}>
                      Remove
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Verse renderer — red letters + headings + highlights
// ─────────────────────────────────────────────
function VerseList({ verses, fontSize, fontStyle, t, dark, highlights, onVerseTap }) {
  return (
    <div className="pt-6 pb-6">
      {verses.map((verse, i) => {
        // Heading
        if (isHeading(verse)) {
          return (
            <p key={`h-${i}`}
              className="font-bold mt-6 mb-1.5 first:mt-2"
              style={{ fontSize: Math.max(12, fontSize - 3), color: t.textMuted, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {headingText(verse)}
            </p>
          )
        }

        const key  = vKey('', '', verse.number)
        const hlHex = highlights[key] ? HIGHLIGHT_COLORS.find(c => c.id === highlights[key])?.hex : null
        const segs  = parseVerseText(verse.text || '')

        return (
          <span key={`v-${i}`}
            onClick={() => onVerseTap(verse)}
            style={{ cursor: 'pointer', background: hlHex || 'transparent', borderRadius: 3, display: 'inline', transition: 'background 0.2s' }}>
            <sup style={{ fontSize: Math.max(9, fontSize - 7), color: '#5B4FCF', fontWeight: 700, marginRight: 3, verticalAlign: 'super', lineHeight: 0, userSelect: 'none' }}>
              {verse.number}
            </sup>
            {segs.map((seg, si) => (
              <span key={si} style={{ color: seg.type === 'red' ? '#C0392B' : (dark ? '#F0EBE1' : '#1A1A1A'), fontFamily: fontStyle, fontSize, lineHeight: 2.1 }}>
                {seg.text}
              </span>
            ))}{' '}
          </span>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main reader
// ─────────────────────────────────────────────
function ReaderInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const { t, dark, toggle: toggleDark } = useTheme()

  const [book,    setBook]    = useState(params?.get('book')    || 'John')
  const [chapter, setChapter] = useState(parseInt(params?.get('chapter') || '1'))
  const [tid,     setTid]     = useState(() => getActiveTranslation() || 'KJV')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [offline, setOffline] = useState(false)

  const [showNav,   setShowNav]   = useState(false)
  const [showTrans, setShowTrans] = useState(false)
  const [showFont,  setShowFont]  = useState(false)
  const [tapVerse,  setTapVerse]  = useState(null)

  const [fontSize,   setFontSize]   = useState(17)
  const [fontId,     setFontId]     = useState('lora')
  const [highlights, setHighlights] = useState({})
  const scrollRef = useRef(null)

  const [toast, toastEl] = useToast()

  const fontStyle    = FONT_OPTIONS.find(f => f.id === fontId)?.style || FONT_OPTIONS[0].style
  const bookInfo     = getBookByName(book)
  const totalChapters = bookInfo?.chapters || 1
  const verses       = data?.verses || []

  // Init prefs
  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem('dw_reader_prefs') || '{}'); setFontSize(p.fs || 17); setFontId(p.fi || 'lora') } catch {}
    setTid(getActiveTranslation() || 'KJV')
    setHighlights(loadHL())
  }, [])

  function savePrefs(fs, fi) { try { localStorage.setItem('dw_reader_prefs', JSON.stringify({ fs, fi })) } catch {} }

  // Load chapter
  const load = useCallback(async (b, ch, translationId) => {
    setLoading(true); setError(null); setOffline(false); setData(null)
    try {
      const res = await getChapter(b, ch, translationId)
      if (res.offline) { setOffline(true); setLoading(false); return }
      if (res.error)   { setError(res.error); setLoading(false); return }
      setData(res)
    } catch (e) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(book, chapter, tid) }, [book, chapter, tid]) // eslint-disable-line
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [book, chapter])

  // URL sync
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('book', book); url.searchParams.set('chapter', String(chapter))
    window.history.replaceState(null, '', url.toString())
  }, [book, chapter])

  function navigate(b, ch) { setBook(b); setChapter(ch) }

  function goPrev() {
    if (chapter > 1) { setChapter(c => c - 1); return }
    const i = BIBLE_BOOK_LIST.findIndex(b => b.name === book)
    if (i > 0) { const prev = BIBLE_BOOK_LIST[i - 1]; setBook(prev.name); setChapter(prev.chapters) }
  }
  function goNext() {
    if (chapter < totalChapters) { setChapter(c => c + 1); return }
    const i = BIBLE_BOOK_LIST.findIndex(b => b.name === book)
    if (i >= 0 && i < BIBLE_BOOK_LIST.length - 1) { setBook(BIBLE_BOOK_LIST[i + 1].name); setChapter(1) }
  }

  function handleHL(key, colorId) {
    setHighlights(prev => {
      const next = { ...prev }
      if (colorId === null) delete next[key]
      else next[key] = colorId
      saveHL(next)
      return next
    })
  }

  const prevBook = (() => { const i = BIBLE_BOOK_LIST.findIndex(b => b.name === book); return i > 0 ? BIBLE_BOOK_LIST[i - 1] : null })()
  const nextBook = (() => { const i = BIBLE_BOOK_LIST.findIndex(b => b.name === book); return i >= 0 && i < BIBLE_BOOK_LIST.length - 1 ? BIBLE_BOOK_LIST[i + 1] : null })()

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto relative" style={{ background: t.bg }}>
      {toastEl}

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: t.border, background: t.bgCard }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.bgMuted }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>

        {/* Chapter nav pill — NO BookOpen icon */}
        <button onClick={() => setShowNav(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full border-2 active:scale-[0.97] transition-all"
          style={{ borderColor: '#5B4FCF', background: dark ? '#2A2060' : '#EDE9FF' }}>
          <span className="font-bold text-[15px]" style={{ color: '#5B4FCF' }}>{book}</span>
          <span className="font-bold text-[15px]" style={{ color: '#5B4FCF', opacity: 0.7 }}>{chapter}</span>
          <ChevronDown size={13} style={{ color: '#5B4FCF' }} />
        </button>

        {/* Translation pill */}
        <button onClick={() => setShowTrans(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-full border-2 active:scale-95 flex-shrink-0"
          style={{ borderColor: t.border, background: t.bgMuted }}>
          <Languages size={12} style={{ color: t.textMuted }} />
          <span className="font-bold text-[12px]" style={{ color: t.text }}>{tid}</span>
        </button>

        <button onClick={toggleDark}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.bgMuted }}>
          {dark ? <Sun size={16} style={{ color: t.text }} /> : <Moon size={16} style={{ color: t.text }} />}
        </button>

        <button onClick={() => setShowFont(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[13px]"
          style={{ background: t.bgMuted, color: t.textMuted }}>
          Aa
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: 90 }}>
        {offline && (
          <div className="pt-20 flex flex-col items-center gap-3 text-center px-4">
            <WifiOff size={36} style={{ color: t.textMuted }} />
            <p className="font-semibold text-[16px]" style={{ color: t.text }}>You're offline</p>
            <p className="text-[13px]" style={{ color: t.textMuted }}>Download this translation to read offline.</p>
          </div>
        )}
        {loading && (
          <div className="pt-8 flex flex-col gap-4 animate-pulse">
            <div className="h-8 rounded-xl w-2/5 mx-auto" style={{ background: t.bgMuted }} />
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-4 rounded-xl" style={{ background: t.bgMuted, width: `${55 + (i % 5) * 9}%` }} />
            ))}
          </div>
        )}
        {error && !loading && !offline && (
          <div className="text-center py-20">
            <p className="text-[15px] font-semibold" style={{ color: t.text }}>Couldn't load passage</p>
            <button onClick={() => load(book, chapter, tid)} className="mt-4 px-5 py-2.5 rounded-full text-white font-bold" style={{ background: '#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}
        {!loading && !error && !offline && verses.length > 0 && (
          <>
            <div className="text-center pt-6 mb-2">
              <h1 className="font-bold" style={{ fontSize: 30, lineHeight: 1.2, color: t.text, letterSpacing: '-.02em' }}>{book}</h1>
              <p className="font-bold mt-1" style={{ fontSize: 22, color: '#5B4FCF' }}>Chapter {chapter}</p>
            </div>
            <VerseList verses={verses} fontSize={fontSize} fontStyle={fontStyle} t={t} dark={dark} highlights={highlights} onVerseTap={setTapVerse} />
            <p className="mt-4 text-[11px] text-center pb-4" style={{ color: t.textFaint }}>
              {tid} · {data?.fromCache ? '● Offline' : '○ Online'}
            </p>
          </>
        )}
      </div>

      {/* ── PREV / NEXT ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t"
        style={{ background: t.bgCard, borderColor: t.border, paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={goPrev}
          className="flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 min-h-[48px] border-2"
          style={{ borderColor: t.border }}>
          <ChevronLeft size={18} style={{ color: t.text }} />
          <div className="flex flex-col items-start leading-none">
            <span className="font-bold text-[14px]" style={{ color: t.text }}>Prev</span>
            <span className="text-[10px] mt-0.5" style={{ color: t.textFaint }}>
              {chapter > 1 ? `${book} ${chapter - 1}` : prevBook?.name || ''}
            </span>
          </div>
        </button>
        <button onClick={() => setShowNav(true)}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[12px] active:scale-95"
          style={{ background: t.bgMuted }}>
          <span className="font-bold text-[14px]" style={{ color: t.text }}>{chapter} / {totalChapters}</span>
          <span className="text-[10px]" style={{ color: t.textFaint }}>tap to jump</span>
        </button>
        <button onClick={goNext}
          className="flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 min-h-[48px] border-2"
          style={{ borderColor: t.border }}>
          <div className="flex flex-col items-end leading-none">
            <span className="font-bold text-[14px]" style={{ color: t.text }}>Next</span>
            <span className="text-[10px] mt-0.5" style={{ color: t.textFaint }}>
              {chapter < totalChapters ? `${book} ${chapter + 1}` : nextBook?.name || ''}
            </span>
          </div>
          <ChevronRight size={18} style={{ color: t.text }} />
        </button>
      </div>

      {/* ── SHEETS ── */}
      <AnimatePresence>
        {showNav    && <NavigatorSheet currentBook={book} currentChapter={chapter} onSelect={navigate} onClose={() => setShowNav(false)} t={t} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTrans  && <TranslationSheet currentId={tid} onSelect={id => { setTid(id); setActiveTranslation(id) }} onClose={() => setShowTrans(false)} t={t} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFont   && <FontSheet fontSize={fontSize} fontId={fontId} onFontSize={fs => { setFontSize(fs); savePrefs(fs, fontId) }} onFontId={fi => { setFontId(fi); savePrefs(fontSize, fi) }} onClose={() => setShowFont(false)} t={t} />}
      </AnimatePresence>
      <AnimatePresence>
        {tapVerse   && <VerseSheet verse={tapVerse} book={book} chapter={chapter} highlights={highlights} onHighlight={handleHL} onClose={() => setTapVerse(null)} toast={toast} t={t} />}
      </AnimatePresence>
    </div>
  )
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#5B4FCF' }} />
      </div>
    }>
      <ReaderInner />
    </Suspense>
  )
}