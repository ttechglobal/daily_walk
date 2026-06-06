'use client'

// ── src/app/read/page.js ──
// v3 — Offline cache integration.
// Changes from v2:
//   • Imports ReaderCacheBadge from OfflineBadge
//   • ReaderCacheBadge shown in top bar between back button and nav
//   • getChapter now writes to IndexedDB automatically (handled in bible.js v3)
//   • OfflineBanner shown when offline + content not cached
//   • cacheType tracked from result for badge display

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, WifiOff, Download, Check, X,
  Sun, Moon, Plus, Minus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import {
  getChapter, getAllVersions,
  getPreferredVersionId, setPreferredVersionId,
  isVersionDownloaded, downloadVersion,
  seedDefaultVersionIfNeeded,
  DEFAULT_VERSION_ID, BIBLE_BOOK_LIST,
} from '../../lib/bible'
import { startBackgroundDownload, getDownloadStatus, subscribeToDownload } from '../../lib/downloadManager'
import { ReaderCacheBadge, OfflineBanner } from '../../components/OfflineBadge'

const FONT_OPTIONS = [
  { id:'lora',    label:'Lora',    style:"'Lora', Georgia, serif" },
  { id:'jakarta', label:'Jakarta', style:"'Plus Jakarta Sans', system-ui, sans-serif" },
  { id:'georgia', label:'Georgia', style:'Georgia, serif' },
  { id:'system',  label:'System',  style:'system-ui, sans-serif' },
]

// ─────────────────────────────────────────────
//  Navigator sheet
// ─────────────────────────────────────────────
function NavigatorSheet({ currentBook, currentChapter, onSelect, onClose, t }) {
  const [search,  setSearch]  = useState('')
  const [selBook, setSelBook] = useState(currentBook || 'John')
  const filtered     = BIBLE_BOOK_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
  const chapterCount = BIBLE_BOOK_LIST.find(b => b.name === selBook)?.chapters || 1

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:t.bgCard, height:'78dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
      >
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full" style={{ background:t.border }}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <p className="font-bold text-[17px]" style={{ color:t.text }}>Go to</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:t.bgMuted }}>
            <X size={14} style={{ color:t.textMuted }}/>
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex gap-0 min-h-0">
          {/* Book list */}
          <div className="w-[45%] flex flex-col border-r" style={{ borderColor:t.border }}>
            <div className="px-3 py-2 flex-shrink-0">
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-[10px] text-[13px] focus:outline-none"
                style={{ background:t.bgMuted, color:t.text }}/>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(b => (
                <button key={b.name} onClick={()=>setSelBook(b.name)}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium"
                  style={{
                    background: selBook===b.name ? (t.purpleBg||'#EDE9FF') : 'transparent',
                    color:      selBook===b.name ? '#5B4FCF' : t.text,
                  }}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          {/* Chapter grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color:t.textFaint }}>{selBook}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: chapterCount }, (_,i) => i+1).map(ch => (
                <button key={ch}
                  onClick={() => { onSelect(selBook, ch); onClose() }}
                  className="aspect-square rounded-[10px] flex items-center justify-center text-[13px] font-bold transition-all active:scale-90"
                  style={{
                    background: selBook===currentBook && ch===currentChapter ? '#5B4FCF' : t.bgMuted,
                    color:      selBook===currentBook && ch===currentChapter ? 'white'   : t.text,
                  }}>
                  {ch}
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
//  Version sheet
// ─────────────────────────────────────────────
function VersionSheet({ currentId, onSelect, onClose, t }) {
  const versions = getAllVersions()
  const [dlStatus, setDlStatus] = useState({})

  useEffect(() => {
    const map = {}
    versions.forEach(v => {
      if (v.downloadable) map[v.id] = isVersionDownloaded(v.id)
    })
    setDlStatus(map)
  }, [])

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:t.bgCard, maxHeight:'70dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
      >
        <div className="flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background:t.border }}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <p className="font-bold text-[17px]" style={{ color:t.text }}>Translation</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:t.bgMuted }}>
            <X size={14} style={{ color:t.textMuted }}/>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {versions.map(v => {
            const id       = v.id || v.abbreviation
            const selected = id === currentId || v.abbreviation === currentId
            const dl       = dlStatus[id]
            return (
              <button key={id}
                onClick={() => { onSelect(id, v.abbreviation); onClose() }}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] mb-1.5 text-left transition-all"
                style={{
                  background:  selected ? (t.purpleBg||'#EDE9FF') : t.bgCard,
                  border:      `1.5px solid ${selected ? '#5B4FCF' : t.border}`,
                }}>
                <div>
                  <p className="font-bold text-[14px]"
                    style={{ color: selected ? '#5B4FCF' : t.text }}>
                    {v.abbreviation}
                  </p>
                  <p className="text-[12px]" style={{ color:t.textFaint }}>{v.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!v.downloadable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:t.bgMuted, color:t.textFaint }}>
                      Online only
                    </span>
                  )}
                  {v.downloadable && dl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
                      ✓ Downloaded
                    </span>
                  )}
                  {selected && <Check size={16} style={{ color:'#5B4FCF' }}/>}
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
//  Font modal
// ─────────────────────────────────────────────
function FontModal({ fontSize, fontId, onFontSize, onFontId, onClose, t }) {
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] px-5 pt-4 pb-10"
        style={{ background:t.bgCard }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background:t.border }}/>
        </div>
        <div className="flex flex-col gap-5">
          {/* Font size */}
          <div>
            <p className="font-bold text-[14px] mb-3" style={{ color:t.text }}>Font size</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onFontSize(Math.max(13, fontSize-1))}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background:t.bgMuted }}>
                <Minus size={16} style={{ color:t.text }}/>
              </button>
              <span className="flex-1 text-center font-bold text-[18px]"
                style={{ color:t.text }}>{fontSize}px</span>
              <button onClick={() => onFontSize(Math.min(26, fontSize+1))}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background:t.bgMuted }}>
                <Plus size={16} style={{ color:t.text }}/>
              </button>
            </div>
          </div>
          {/* Font family */}
          <div>
            <p className="font-bold text-[14px] mb-3" style={{ color:t.text }}>Font</p>
            <div className="flex flex-col gap-2">
              {FONT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => onFontId(f.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-left transition-all"
                  style={{
                    background: fontId===f.id ? (t.purpleBg||'#EDE9FF') : t.bgMuted,
                    border:     `2px solid ${fontId===f.id ? '#5B4FCF' : 'transparent'}`,
                  }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: fontId===f.id ? '#5B4FCF' : t.borderInput }}>
                    {fontId===f.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }}/>}
                  </div>
                  <span style={{ fontFamily:f.style, fontSize:15, color:fontId===f.id?'#5B4FCF':t.text }}>
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
//  Verse renderer
// ─────────────────────────────────────────────
function VerseParser({ content, fontSize, fontStyle, textColor }) {
  if (!content) return null
  const lines = content.split('\n').filter(Boolean)
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line,i) => (
        <p key={i} style={{ fontSize, color:textColor, fontFamily:fontStyle, lineHeight:1.9 }}>
          {line}
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main reader
// ─────────────────────────────────────────────
function BibleReaderInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t, dark, toggle: toggleDark } = useTheme()

  const [book,       setBook]      = useState(searchParams?.get('book')    || 'John')
  const [chapter,    setChapter]   = useState(parseInt(searchParams?.get('chapter') || '1'))
  const [versionId,  setVersionId] = useState(DEFAULT_VERSION_ID)
  const [versionAbbr,setAbbr]      = useState('NIV11')
  const [data,       setData]      = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)
  const [isOffline,  setIsOffline] = useState(false)
  const [fromCache,  setFromCache] = useState(false)
  const [cacheType,  setCacheType] = useState(null)   // ← NEW: 'indexeddb' | 'localstorage' | null
  const [showNav,    setShowNav]   = useState(false)
  const [showVer,    setShowVer]   = useState(false)
  const [showFont,   setShowFont]  = useState(false)
  const [fontSize,   setFontSize]  = useState(17)
  const [fontId,     setFontId]    = useState('lora')

  useEffect(() => {
    try {
      const s = localStorage.getItem('dw_reader_prefs')
      if (s) { const p = JSON.parse(s); setFontSize(p.fs||17); setFontId(p.fi||'lora') }
    } catch {}
    const id = getPreferredVersionId()
    setVersionId(id)
    seedDefaultVersionIfNeeded()
    const versions = getAllVersions()
    const found    = versions.find(v => v.id===id || v.abbreviation===id)
    if (found) setAbbr(found.abbreviation)
  }, [])

  function savePrefs(fs, fi) {
    try { localStorage.setItem('dw_reader_prefs', JSON.stringify({ fs, fi })) } catch {}
  }

  const fontStyle = FONT_OPTIONS.find(f => f.id===fontId)?.style || FONT_OPTIONS[0].style

  // ── Load chapter — cache-first via bible.js v3 ──
  // IndexedDB is checked inside getChapter automatically.
  // On success, result is written to IndexedDB automatically.
  // Nothing extra needed here — just track cacheType for the badge.
  const load = useCallback(async (b, ch, vid) => {
    setLoading(true); setError(null); setIsOffline(false)
    const result = await getChapter(vid, b, ch)
    if (result.error) {
      if (result.offline) {
        setIsOffline(true)
        setError(null)
      } else {
        setError(result.error)
        setIsOffline(false)
      }
    } else {
      setData(result)
      setFromCache(!!result.fromCache)
      setCacheType(result.cacheType || null)   // ← track cache source
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(book, chapter, versionId) }, [book, chapter, versionId, load])

  function selectVersion(id, abbr) {
    setPreferredVersionId(id)
    setVersionId(id)
    if (abbr) setAbbr(abbr)
    else {
      const list  = getAllVersions()
      const found = list.find(v => v.id===id || v.bibleId===id || v.abbreviation===id)
      if (found) setAbbr(found.abbreviation)
    }
  }

  function navigate(b, ch) { setBook(b); setChapter(ch) }
  function goNext() {
    const bd = BIBLE_BOOK_LIST.find(b => b.name===book)
    if (bd && chapter < bd.chapters) setChapter(c => c+1)
  }
  function goPrev() { if (chapter > 1) setChapter(c => c-1) }

  const verses        = data?.verses || []
  const content       = data?.content || ''
  const reference     = data?.reference || `${book} ${chapter}`
  const bookData      = BIBLE_BOOK_LIST.find(b => b.name===book)
  const totalChapters = bookData?.chapters || 1

  return (
    <div className="flex flex-col" style={{ height:'100dvh', background:t.bg }}>

      {/* ── FIXED TOP BAR ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
        style={{
          background:   t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          position:     'sticky',
          top:           0,
          zIndex:        40,
          minHeight:     52,
        }}
      >
        {/* Back */}
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>

        {/* ← NEW: Offline cache badge — shows between back and navigator */}
        <ReaderCacheBadge
          fromCache={fromCache}
          cacheType={cacheType}
          isOffline={isOffline}
        />

        {/* Book + Chapter navigator */}
        <button onClick={() => setShowNav(true)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-[14px] active:opacity-80 flex-1 min-w-0"
          style={{ background:t.bgMuted }}>
          <span className="font-bold text-[15px] truncate" style={{ color:t.text }}>{book}</span>
          <span className="font-bold text-[15px] flex-shrink-0" style={{ color:t.textMuted }}>{chapter}</span>
        </button>

        {/* Translation */}
        <button onClick={() => setShowVer(true)}
          className="px-3 py-1.5 rounded-[10px] flex-shrink-0"
          style={{ background:t.bgMuted }}>
          <span className="font-bold text-[12px]" style={{ color:t.text }}>{versionAbbr}</span>
        </button>

        {/* Font settings */}
        <button onClick={() => setShowFont(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted }}>
          <span className="font-bold text-[13px]" style={{ color:t.text }}>Aa</span>
        </button>

        {/* Dark mode toggle */}
        <button onClick={toggleDark}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted }}>
          {dark
            ? <Sun  size={17} style={{ color:t.text }}/>
            : <Moon size={17} style={{ color:t.text }}/>
          }
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: 100 }}>

        {/* Loading skeleton */}
        {loading && (
          <div className="pt-8 flex flex-col gap-3 animate-pulse">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="h-4 rounded-full"
                style={{ background:t.bgMuted, width:`${70+Math.random()*25}%` }}/>
            ))}
          </div>
        )}

        {/* ← NEW: Offline + not cached state */}
        {!loading && isOffline && (
          <div className="pt-6">
            <OfflineBanner t={t} />
            <div className="text-center pt-8">
              <p className="text-[14px] font-semibold" style={{ color:t.textMuted }}>
                {book} {chapter} hasn't been downloaded yet.
              </p>
              <p className="text-[13px] mt-1" style={{ color:t.textFaint }}>
                Connect to the internet to read it — it'll be saved for next time.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && !isOffline && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="text-[15px] font-semibold" style={{ color:t.text }}>Couldn't load passage</p>
            <p className="text-[13px] px-4" style={{ color:t.textMuted }}>{error}</p>
            <button onClick={() => load(book, chapter, versionId)}
              className="text-[14px] font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ background:'#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && !isOffline && (
          <div className="pt-6 pb-4">
            {/* Chapter heading */}
            <div className="text-center mb-8">
              <h1 className="font-display font-bold"
                style={{ fontSize:34, lineHeight:1.2, color:t.text, letterSpacing:'-0.02em' }}>
                {book}
              </h1>
              <p className="font-display font-bold mt-1"
                style={{ fontSize:28, lineHeight:1, color:'#5B4FCF' }}>
                Chapter {chapter}
              </p>
            </div>

            {/* Verses */}
            {verses.length > 0 && verses[0]?.number > 0 ? (
              <p style={{ fontSize, color:t.text, fontFamily:fontStyle, lineHeight:2.2 }}>
                {verses.map((v, i) => (
                  <span key={i}>
                    <sup style={{
                      fontSize:     Math.max(9, fontSize-6),
                      color:        '#5B4FCF',
                      fontWeight:   700,
                      marginRight:  3,
                      verticalAlign:'super',
                      lineHeight:   0,
                      userSelect:   'none',
                    }}>
                      {v.number}
                    </sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            ) : (
              <VerseParser
                content={content}
                fontSize={fontSize}
                fontStyle={fontStyle}
                textColor={t.text}
              />
            )}

            <p className="mt-10 text-[11px] text-center" style={{ color:t.textFaint }}>
              {versionAbbr} Bible
            </p>
          </div>
        )}
      </div>

      {/* ── FIXED BOTTOM PREV/NEXT NAV ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t"
        style={{
          background:   t.bgCard,
          borderColor:  t.border,
          position:     'fixed',
          bottom:        0,
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '100%',
          maxWidth:      430,
          zIndex:        40,
          paddingBottom:'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button onClick={goPrev} disabled={chapter <= 1}
          className="flex items-center gap-2 px-5 py-3 rounded-full border-2 disabled:opacity-30 active:scale-95 transition-all min-h-[44px]"
          style={{ borderColor:t.border, color:t.text }}>
          <ChevronLeft size={18}/>
          <span className="font-semibold text-[14px]">Prev</span>
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-bold text-[14px]" style={{ color:t.text }}>
            {book} {chapter}
          </span>
          <span className="text-[11px]" style={{ color:t.textFaint }}>
            {chapter} / {totalChapters}
          </span>
        </div>

        <button onClick={goNext} disabled={chapter >= totalChapters}
          className="flex items-center gap-2 px-5 py-3 rounded-full border-2 disabled:opacity-30 active:scale-95 transition-all min-h-[44px]"
          style={{ borderColor:t.border, color:t.text }}>
          <span className="font-semibold text-[14px]">Next</span>
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* ── SHEETS ── */}
      <AnimatePresence>
        {showNav && (
          <NavigatorSheet
            currentBook={book} currentChapter={chapter}
            onSelect={navigate} onClose={() => setShowNav(false)} t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVer && (
          <VersionSheet
            currentId={versionId}
            onSelect={selectVersion}
            onClose={() => setShowVer(false)}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFont && (
          <FontModal
            fontSize={fontSize} fontId={fontId}
            onFontSize={fs => { setFontSize(fs); savePrefs(fs, fontId) }}
            onFontId={fi   => { setFontId(fi);   savePrefs(fontSize, fi) }}
            onClose={() => setShowFont(false)} t={t}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[100dvh]"
        style={{ background:'var(--bg,#FAF8F5)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor:'#5B4FCF' }}/>
      </div>
    }>
      <BibleReaderInner/>
    </Suspense>
  )
}