'use client'

// ── /read — Bible Reader ──
// All 9 UI improvements applied.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowLeft, WifiOff, Download, Check, X, Sun, Moon, Plus, Minus, Wifi } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import {
  getChapter, getAvailableVersions, getAllVersions,
  getPreferredVersionId, setPreferredVersionId,
  isVersionDownloaded, downloadVersion,
  seedDefaultVersionIfNeeded,
  DEFAULT_VERSION_ID, BIBLE_BOOK_LIST,
} from '../../lib/bible'
import { startBackgroundDownload, getDownloadStatus, subscribeToDownload } from '../../lib/downloadManager'

// ── Allowed translations only ──
const ALLOWED = ['NIV11','NIVUK11','AMP','EEB','TPT','BSB','ASV']

// ── Fonts ──
const FONT_OPTIONS = [
  { id:'lora',    label:'Lora',      style:"'Lora', Georgia, serif" },
  { id:'jakarta', label:'Jakarta',   style:"'Plus Jakarta Sans', system-ui, sans-serif" },
  { id:'georgia', label:'Georgia',   style:'Georgia, serif' },
  { id:'system',  label:'System',    style:'system-ui, sans-serif' },
]

// ── Book/Chapter navigator — book list left, chapter grid right ──
function NavigatorSheet({ currentBook, currentChapter, onSelect, onClose, darkMode }) {
  const [search,  setSearch]  = useState('')
  const [selBook, setSelBook] = useState(currentBook || 'John')
  const filtered     = BIBLE_BOOK_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
  const chapterCount = BIBLE_BOOK_LIST.find(b => b.name === selBook)?.chapters || 1
  const bg   = darkMode ? '#1A1A2E' : 'white'
  const text = darkMode ? '#F5F5F0' : '#1A1A2E'

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:bg, height:'78dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{ background:darkMode?'#333':'#E5E7EB' }} /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[16px]" style={{ color:text }}>Go to</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:darkMode?'#2A2A3E':'#F5F5F5', color:text }}><X size={15} /></button>
        </div>
        <div className="px-4 mb-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..." autoFocus
            className="w-full border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ color:text, background:darkMode?'#0F1117':'white', borderColor:darkMode?'#333':'#E5E7EB' }} />
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Books list */}
          <div className="w-1/2 overflow-y-auto border-r scroll-hide" style={{ borderColor:darkMode?'#2A2A3E':'#F0F0F0' }}>
            {filtered.map(b => (
              <button key={b.name} onClick={() => setSelBook(b.name)}
                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors"
                style={{ background:selBook===b.name?(darkMode?'#2A2A3E':'#EDE9FF'):'transparent',
                         color:selBook===b.name?'#5B4FCF':text,
                         fontWeight:selBook===b.name?700:400 }}>
                {b.name}
              </button>
            ))}
          </div>
          {/* Chapters grid */}
          <div className="w-1/2 overflow-y-auto px-3 py-2 scroll-hide">
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: chapterCount }, (_, i) => i+1).map(ch => (
                <button key={ch} onClick={() => { onSelect(selBook, ch); onClose() }}
                  className="aspect-square rounded-xl flex items-center justify-center text-[13px] font-semibold transition-all active:scale-95"
                  style={{ background:(selBook===currentBook&&ch===currentChapter)?'#5B4FCF':(darkMode?'#2A2A3E':'#F5F5F5'),
                           color:(selBook===currentBook&&ch===currentChapter)?'white':text }}>
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

// ── Version picker with background download ──
function VersionSheet({ currentId, onSelect, onClose, darkMode }) {
  const [versions,    setVersions]   = useState([])
  const [loading,     setLoading]    = useState(true)
  const [dlStatus,    setDlStatus]   = useState({})
  const isOnline = useOnlineStatus()

  const bg   = darkMode ? '#1A1A2E' : 'white'
  const text = darkMode ? '#F5F5F0' : '#1A1A2E'

  useEffect(() => {
    // Load initial download status from manager
    const status = {}
    ALLOWED.forEach(abbr => {
      const s = getDownloadStatus(abbr)
      if (s) status[abbr] = s
    })
    // Check localStorage for completed downloads
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('dw_yv_downloaded_')) {
          const id = k.replace('dw_yv_downloaded_', '')
          if (!status[id]) status[id] = { status:'done', pct:100 }
        }
      }
    } catch {}
    setDlStatus(status)

    getAvailableVersions().then(list => {
      setVersions(list)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    // Subscribe to download progress for all versions
    const unsubs = ALLOWED.map(abbr =>
      subscribeToDownload(abbr, (s) => setDlStatus(p => ({ ...p, [abbr]: s })))
    )
    return () => unsubs.forEach(fn => fn())
  }, [])

  function handleDownload(e, v) {
    e.stopPropagation()
    if (!isOnline) { alert('Connect to internet to download'); return }
    const abbr = v.abbreviation
    // Start background download — survives navigation away
    startBackgroundDownload(abbr, (id, onProgress) =>
      downloadVersion(v.id, onProgress)
    )
    setDlStatus(p => ({ ...p, [abbr]: { status:'running', pct:0 } }))
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:bg, maxHeight:'80dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{ background:darkMode?'#333':'#E5E7EB' }} /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor:darkMode?'#2A2A3E':'#F5F5F5' }}>
          <div>
            <p className="font-bold text-[16px]" style={{ color:text }}>Bible Version</p>
            <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>Tap to switch · Download for offline</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:darkMode?'#2A2A3E':'#F5F5F5', color:text }}><X size={15} /></button>
        </div>
        <div className="overflow-y-auto scroll-hide pb-8">
          {loading && <div className="flex items-center justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} /></div>}
          {versions.map(v => {
            const isCurrent = v.id === currentId || v.abbreviation === currentId
            const ds        = dlStatus[v.abbreviation]
            const isDone    = ds?.status === 'done'
            const isRunning = ds?.status === 'running'
            const pct       = ds?.pct || 0
            return (
              <button key={v.id || v.abbreviation}
                onClick={() => { onSelect(v.id || v.abbreviation); onClose() }}
                className="w-full flex items-center px-5 py-4 gap-3 text-left border-b transition-colors"
                style={{ borderColor:darkMode?'#2A2A3E':'#F5F5F5', background:isCurrent?(darkMode?'#2A2A3E':'#F8F7FF'):'transparent' }}>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor:isCurrent?'#5B4FCF':'#E5E7EB' }}>
                  {isCurrent && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[15px]" style={{ color:isCurrent?'#5B4FCF':text }}>{v.abbreviation}</p>
                    {isDone && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:'#E8F4ED', color:'#4A7C5F' }}>✓ Offline</span>}
                    {isRunning && <span className="text-[10px] font-bold" style={{ color:'#5B4FCF' }}>{pct}%</span>}
                  </div>
                  <p className="text-[12px] truncate mt-0.5" style={{ color:'#9CA3AF' }}>{v.name}</p>
                  {isRunning && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden w-full" style={{ background:darkMode?'#333':'#E8E5E0' }}>
                      <motion.div className="h-full rounded-full" style={{ background:'#5B4FCF' }} animate={{ width:`${pct}%` }} />
                    </div>
                  )}
                </div>
                {/* API.Bible + bible-api.com = online only, no download */}
                {(v.source === 'apibible' || v.source === 'bibleapi') && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: darkMode?'#1A2A3A':'#EBF5FB', color:'#5B9BD5' }}>
                    <Wifi size={9} />
                    Online
                  </span>
                )}
                {/* YouVersion = downloadable */}
                {v.source === 'youversion' && !isDone && !isRunning && (
                  <button onClick={e => handleDownload(e, v)}
                    className="text-[12px] font-bold px-3 py-1.5 rounded-full flex-shrink-0 active:scale-95"
                    style={{ color:'#5B4FCF', background:darkMode?'#2A2A3E':'#EDE9FF' }}>
                    Download
                  </button>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
    </>
  )
}

// ── Font settings modal ──
function FontModal({ fontSize, fontId, onFontSize, onFontId, onClose, darkMode }) {
  const bg     = darkMode ? '#1A1A2E' : 'white'
  const text   = darkMode ? '#F5F5F0' : '#1A1A2E'
  const border = darkMode ? '#2A2A3E' : '#F0EDE8'

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] rounded-t-[28px] z-[70] px-5 pt-5 pb-10"
        style={{ background:bg }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full" style={{ background:darkMode?'#333':'#E5E7EB' }} /></div>
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-[17px]" style={{ color:text }}>Text Settings</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:darkMode?'#2A2A3E':'#F5F5F5', color:text }}><X size={15} /></button>
        </div>

        {/* Font size */}
        <div className="mb-5">
          <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color:'#9CA3AF' }}>Font Size</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onFontSize(Math.max(13, fontSize - 1))}
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center active:scale-95"
              style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
              <Minus size={16} />
            </button>
            <div className="flex-1 flex flex-col items-center gap-1">
              <p className="font-bold text-[22px]" style={{ color:'#5B4FCF' }}>{fontSize}</p>
              <p className="text-[11px]" style={{ color:'#9CA3AF' }}>pt</p>
            </div>
            <button onClick={() => onFontSize(Math.min(28, fontSize + 1))}
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center active:scale-95"
              style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
              <Plus size={16} />
            </button>
          </div>
          {/* Slider */}
          <input type="range" min={13} max={28} value={fontSize}
            onChange={e => onFontSize(parseInt(e.target.value))}
            className="w-full mt-3 accent-purple-600" />
        </div>

        {/* Font face */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color:'#9CA3AF' }}>Typeface</p>
          <div className="flex flex-col gap-2">
            {FONT_OPTIONS.map(f => (
              <button key={f.id} onClick={() => onFontId(f.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all"
                style={{ borderColor:fontId===f.id?'#5B4FCF':border, background:fontId===f.id?(darkMode?'#2A2A3E':'#F8F7FF'):'transparent' }}>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor:fontId===f.id?'#5B4FCF':'#E5E7EB' }}>
                  {fontId===f.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }} />}
                </div>
                <span style={{ fontFamily:f.style, fontSize:15, color:fontId===f.id?'#5B4FCF':text }}>
                  {f.label} — The quick brown fox
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// Translation display names
const TRANSLATION_NAMES = {
  NIV11:   'New International Version 2011',
  NIVUK11: 'NIV UK 2011',
  AMP:     'Amplified Bible',
  EEB:     'Easy English Bible 2024',
  TPT:     'The Passion Translation',
  BSB:     'Berean Standard Bible',
  ASV:     'American Standard Version',
}

// ─────────────────────────────────────────────
//  Main reader
// ─────────────────────────────────────────────
function BibleReaderInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [book,       setBook]      = useState(searchParams?.get('book')    || 'John')
  const [chapter,    setChapter]   = useState(parseInt(searchParams?.get('chapter') || '1'))
  const [versionId,  setVersionId] = useState(DEFAULT_VERSION_ID)
  const [versionAbbr,setAbbr]      = useState('NIV11')
  const [data,       setData]      = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)
  const [isOffline,  setIsOffline] = useState(false)
  const [fromCache,  setFromCache] = useState(false)
  const [showNav,    setShowNav]   = useState(false)
  const [showVer,    setShowVer]   = useState(false)
  const [showFont,   setShowFont]  = useState(false)
  const [fontSize,   setFontSize]  = useState(17)
  const [fontId,     setFontId]    = useState('lora')
  const [darkMode,   setDarkMode]  = useState(false)

  // Persist font/dark preferences
  useEffect(() => {
    try {
      const s = localStorage.getItem('dw_reader_prefs')
      if (s) { const p = JSON.parse(s); setFontSize(p.fs||17); setFontId(p.fi||'lora'); setDarkMode(p.dm||false) }
    } catch {}
    const id = getPreferredVersionId()
    setVersionId(id)
    seedDefaultVersionIfNeeded()
  }, [])

  function savePrefs(fs, fi, dm) {
    try { localStorage.setItem('dw_reader_prefs', JSON.stringify({ fs, fi, dm })) } catch {}
  }

  const fontStyle = FONT_OPTIONS.find(f => f.id === fontId)?.style || FONT_OPTIONS[0].style

  // Dark mode colours
  const bg    = darkMode ? '#0F1117' : '#FAF8F5'
  const bg2   = darkMode ? '#1A1A2E' : 'white'
  const text  = darkMode ? '#E8E4DC' : '#1A1A2E'
  const muted = darkMode ? '#6B7280' : '#9CA3AF'
  const border= darkMode ? '#2A2A3E' : '#F0F0F0'

  const load = useCallback(async (b, ch, vid) => {
    setLoading(true); setError(null); setIsOffline(false)
    const result = await getChapter(vid, b, ch)
    if (result.error) { setError(result.error); setIsOffline(!!result.offline) }
    else { setData(result); setFromCache(!!result.fromCache) }
    setLoading(false)
  }, [])

  useEffect(() => { load(book, chapter, versionId) }, [book, chapter, versionId, load])

  function selectVersion(id) {
    setPreferredVersionId(id); setVersionId(id)
    getAvailableVersions().then(list => {
      const found = list.find(v => v.id === id || v.abbreviation === id)
      if (found) setAbbr(found.abbreviation)
    })
  }

  function navigate(b, ch) { setBook(b); setChapter(ch) }

  function goNext() {
    const bd = BIBLE_BOOK_LIST.find(b => b.name === book)
    if (bd && chapter < bd.chapters) setChapter(c => c + 1)
  }
  function goPrev() { if (chapter > 1) setChapter(c => c - 1) }

  const verses        = data?.verses || []
  const content       = data?.content || ''
  const reference     = data?.reference || `${book} ${chapter}`
  const bookData      = BIBLE_BOOK_LIST.find(b => b.name === book)
  const totalChapters = bookData?.chapters || 1

  return (
    <div className="flex flex-col" style={{ height:'100dvh', background:bg }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0"
        style={{ background:bg }}>
        {/* Back */}
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background:bg2, color:text }}>
          <ArrowLeft size={18} />
        </button>

        {/* Book + Chapter — grows to fill space, no truncation for long names */}
        <button onClick={() => setShowNav(true)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-2xl shadow-sm active:opacity-80"
          style={{ background:bg2, flex:'1 1 0', minWidth:0, overflow:'hidden' }}>
          <span className="font-bold text-[16px] leading-tight text-center px-1"
            style={{ color:text, wordBreak:'break-word', overflowWrap:'anywhere', maxWidth:'100%' }}>
            {book}
          </span>
          <span className="font-bold text-[16px] flex-shrink-0" style={{ color:'#5B4FCF' }}>
            {chapter}
          </span>
        </button>

        {/* Version — compact fixed width */}
        <button onClick={() => setShowVer(true)}
          className="flex items-center justify-center px-3 py-2.5 rounded-2xl shadow-sm active:opacity-80 flex-shrink-0"
          style={{ background:'#5B4FCF', minWidth:56 }}>
          <span className="font-bold text-[13px] text-white">{versionAbbr}</span>
        </button>

        {/* Font settings */}
        <button onClick={() => setShowFont(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm font-bold text-[13px]"
          style={{ background:bg2, color:text }}>
          Aa
        </button>

        {/* Dark mode toggle */}
        <button onClick={() => { setDarkMode(d => { savePrefs(fontSize, fontId, !d); return !d }) }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background:bg2, color:text }}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Offline cached badge */}
      {fromCache && (
        <div className="mx-4 mb-1 self-start flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background:darkMode?'#1A3A2A':'#E8F4ED' }}>
          <Check size={11} style={{ color:'#4A7C5F' }} />
          <span className="text-[11px] font-semibold" style={{ color:'#4A7C5F' }}>Saved offline</span>
        </div>
      )}

      {/* ── SCROLLABLE CONTENT — paddingBottom clears the fixed nav bar ── */}
      <div className="flex-1 overflow-y-auto scroll-hide px-5" style={{ paddingBottom: 80 }}>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} />
            <p className="text-[13px]" style={{ color:muted }}>Loading {book} {chapter}...</p>
          </div>
        )}

        {!loading && error && isOffline && (
          <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#FFF4DC' }}>
              <WifiOff size={24} style={{ color:'#E8A838' }} />
            </div>
            <p className="font-bold text-[17px]" style={{ color:text }}>You're offline</p>
            <p className="text-[14px] leading-relaxed" style={{ color:muted }}>
              Connect once to cache this chapter forever.
            </p>
          </div>
        )}

        {!loading && error && !isOffline && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="text-[15px] font-semibold" style={{ color:text }}>Couldn't load passage</p>
            <p className="text-[13px] px-4" style={{ color:muted }}>{error}</p>
            <button onClick={() => load(book, chapter, versionId)}
              className="text-[14px] font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ background:'#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="pt-4 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-5" style={{ color:muted }}>
              {reference} · {versionAbbr}
            </p>

            {/* ── VERSE RENDERING ── */}
            {verses.length > 0 && verses[0]?.number > 0 ? (
              // Inline paragraph style — verse number as superscript inline with text
              // Matches how printed Bibles look — natural reading flow
              <p style={{ fontSize, color:text, fontFamily:fontStyle, lineHeight:2.2, letterSpacing:'0.01em' }}>
                {verses.map((v, i) => (
                  <span key={i}>
                    <sup style={{ fontSize: Math.max(9, fontSize - 6), color:'#5B4FCF',
                                  fontWeight:700, marginRight:3, verticalAlign:'super',
                                  lineHeight:0, userSelect:'none' }}>
                      {v.number}
                    </sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            ) : (
              <VerseParser content={content} fontSize={fontSize} fontStyle={fontStyle} textColor={text} accentColor="#5B4FCF" />
            )}

            <p className="mt-10 text-[11px] text-center" style={{ color:darkMode?'#333':'#D1CEC9' }}>
              {versionAbbr} Bible
            </p>
          </div>
        )}
      </div>

      {/* ── FIXED BOTTOM NAV — position:fixed so it never scrolls ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t"
        style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
                 width:'100%', maxWidth:420, background:bg2, borderColor:border,
                 borderTopWidth:1, borderTopStyle:'solid', zIndex:10 }}>
        <button onClick={goPrev} disabled={chapter <= 1}
          className="flex items-center gap-2 px-5 py-3 rounded-full border-2 disabled:opacity-30 active:scale-95 transition-all"
          style={{ borderColor:darkMode?'#333':'#E5E7EB', color:text }}>
          <ChevronLeft size={16} />
          <span className="text-[14px] font-semibold">Prev</span>
        </button>

        <button onClick={() => setShowNav(true)}
          className="text-[13px] font-semibold" style={{ color:muted }}>
          {chapter} / {totalChapters}
        </button>

        <button onClick={goNext} disabled={chapter >= totalChapters}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-white disabled:opacity-30 active:scale-95 transition-all"
          style={{ background:'#5B4FCF' }}>
          <span className="text-[14px] font-semibold">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <AnimatePresence>
        {showNav  && <NavigatorSheet currentBook={book} currentChapter={chapter} onSelect={navigate} onClose={() => setShowNav(false)} darkMode={darkMode} />}
        {showVer  && <VersionSheet currentId={versionId} onSelect={selectVersion} onClose={() => setShowVer(false)} darkMode={darkMode} />}
        {showFont && <FontModal fontSize={fontSize} fontId={fontId}
          onFontSize={s => { setFontSize(s); savePrefs(s, fontId, darkMode) }}
          onFontId={id => { setFontId(id); savePrefs(fontSize, id, darkMode) }}
          onClose={() => setShowFont(false)} darkMode={darkMode} />}
      </AnimatePresence>
    </div>
  )
}

// ── Smart verse parser for plain-text content ──
function VerseParser({ content, fontSize, fontStyle, textColor, accentColor }) {
  // Try to extract verse numbers from plain text like "1 In the beginning..."
  const lines = content.split('\n').filter(Boolean)
  const parsed = []
  for (const line of lines) {
    const m = line.match(/^(\d{1,3})\s+(.+)/)
    if (m) parsed.push({ number: m[1], text: m[2] })
    else parsed.push({ number: null, text: line })
  }
  const hasNumbers = parsed.some(p => p.number)

  if (hasNumbers) {
    return (
      <div className="flex flex-col gap-1">
        {parsed.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            {p.number
              ? <span className="flex-shrink-0 font-bold select-none"
                  style={{ fontSize: Math.max(10, fontSize-5), color: accentColor, minWidth:20, paddingTop:3 }}>
                  {p.number}
                </span>
              : <span style={{ minWidth:20 }} />
            }
            <span style={{ fontSize, color:textColor, fontFamily:fontStyle, lineHeight:1.9 }}>{p.text}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <p style={{ fontSize, color:textColor, fontFamily:fontStyle, lineHeight:1.9 }}>
      {content}
    </p>
  )
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background:'#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} />
      </div>
    }>
      <BibleReaderInner />
    </Suspense>
  )
}