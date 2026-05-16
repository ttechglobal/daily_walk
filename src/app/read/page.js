'use client'

// ── src/app/read/page.js — Fixed top bar, dark mode synced with global toggle ──
// Top bar: position sticky/fixed, always visible.
// Dark mode: reads from global DarkModeContext (same toggle as rest of app).
// Layout: flex-col h-[100dvh], header + scrollable content + fixed bottom nav.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, WifiOff, Download, Check, X,
  Sun, Moon, Plus, Minus, Wifi, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import {
  getChapter, getAvailableVersions, getAllVersions,
  getPreferredVersionId, setPreferredVersionId,
  isVersionDownloaded, downloadVersion,
  seedDefaultVersionIfNeeded,
  DEFAULT_VERSION_ID, BIBLE_BOOK_LIST,
} from '../../lib/bible'
import { startBackgroundDownload, getDownloadStatus, subscribeToDownload } from '../../lib/downloadManager'

const ALLOWED = ['NIV11','NIVUK11','AMP','EEB','TPT','BSB','ASV']

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
  const filtered    = BIBLE_BOOK_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
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
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[16px]" style={{ color:t.text }}>Go to</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:t.bgMuted }}>
            <X size={14} style={{ color:t.textMuted }}/>
          </button>
        </div>
        <div className="px-4 pb-3">
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search books..."
            className="w-full rounded-full px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ background:t.bgMuted, color:t.text, border:`1px solid ${t.borderInput}` }}/>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Book list */}
          <div className="w-[52%] overflow-y-auto border-r scroll-hide" style={{ borderColor:t.border }}>
            {filtered.map(b => (
              <button key={b.name} onClick={() => setSelBook(b.name)}
                className="w-full text-left px-4 py-3 text-[14px] font-semibold transition-colors"
                style={{
                  color:      selBook===b.name ? '#5B4FCF' : t.text,
                  background: selBook===b.name ? t.purpleBg : 'transparent',
                  borderLeft: selBook===b.name ? '3px solid #5B4FCF' : '3px solid transparent',
                }}>
                {b.name}
              </button>
            ))}
          </div>
          {/* Chapter grid */}
          <div className="flex-1 overflow-y-auto px-3 py-3 scroll-hide">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color:t.textFaint }}>
              {selBook} — {chapterCount} chapters
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({length:chapterCount},(_,i)=>i+1).map(ch=>(
                <button key={ch}
                  onClick={() => { onSelect(selBook,ch); onClose() }}
                  className="aspect-square rounded-[10px] flex items-center justify-center text-[13px] font-bold transition-all active:scale-90"
                  style={{
                    background: ch===currentChapter && selBook===currentBook ? '#5B4FCF' : t.bgMuted,
                    color:      ch===currentChapter && selBook===currentBook ? 'white' : t.text,
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
//  Font modal
// ─────────────────────────────────────────────
function FontModal({ fontSize, fontId, onFontSize, onFontId, onClose, t }) {
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] px-5 pt-5 pb-10"
        style={{ background:t.bgCard }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background:t.border }}/>
        </div>
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-[17px]" style={{ color:t.text }}>Reading Settings</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:t.bgMuted }}>
            <X size={14} style={{ color:t.textMuted }}/>
          </button>
        </div>
        {/* Font size */}
        <div className="flex flex-col gap-3 mb-5">
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color:t.textFaint }}>
            Text Size
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => onFontSize(Math.max(13,fontSize-1))}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background:t.bgMuted }}>
              <Minus size={16} style={{ color:t.text }}/>
            </button>
            <span className="flex-1 text-center font-bold text-[18px]" style={{ color:t.text }}>
              {fontSize}px
            </span>
            <button onClick={() => onFontSize(Math.min(26,fontSize+1))}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background:t.bgMuted }}>
              <Plus size={16} style={{ color:t.text }}/>
            </button>
          </div>
        </div>
        {/* Font style */}
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color:t.textFaint }}>
            Font
          </p>
          {FONT_OPTIONS.map(f => (
            <button key={f.id} onClick={() => onFontId(f.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-2 transition-all"
              style={{
                background:   fontId===f.id ? t.purpleBg : t.bgMuted,
                borderColor:  fontId===f.id ? '#5B4FCF' : 'transparent',
              }}>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor:fontId===f.id?'#5B4FCF':t.borderInput }}>
                {fontId===f.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }}/>}
              </div>
              <span style={{ fontFamily:f.style, fontSize:15, color:fontId===f.id?'#5B4FCF':t.text }}>
                {f.label} — The quick brown fox
              </span>
            </button>
          ))}
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
  const [showNav,    setShowNav]   = useState(false)
  const [showVer,    setShowVer]   = useState(false)
  const [showFont,   setShowFont]  = useState(false)
  const [fontSize,   setFontSize]  = useState(17)
  const [fontId,     setFontId]    = useState('lora')

  useEffect(() => {
    try {
      const s = localStorage.getItem('dw_reader_prefs')
      if (s) { const p=JSON.parse(s); setFontSize(p.fs||17); setFontId(p.fi||'lora') }
    } catch {}
    const id = getPreferredVersionId()
    setVersionId(id)
    seedDefaultVersionIfNeeded()
  }, [])

  function savePrefs(fs, fi) {
    try { localStorage.setItem('dw_reader_prefs', JSON.stringify({ fs, fi })) } catch {}
  }

  const fontStyle = FONT_OPTIONS.find(f=>f.id===fontId)?.style || FONT_OPTIONS[0].style

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
      const found = list.find(v => v.id===id || v.abbreviation===id)
      if (found) setAbbr(found.abbreviation)
    })
  }

  function navigate(b, ch) { setBook(b); setChapter(ch) }
  function goNext() {
    const bd = BIBLE_BOOK_LIST.find(b=>b.name===book)
    if (bd && chapter < bd.chapters) setChapter(c=>c+1)
  }
  function goPrev() { if (chapter>1) setChapter(c=>c-1) }

  const verses        = data?.verses || []
  const content       = data?.content || ''
  const reference     = data?.reference || `${book} ${chapter}`
  const bookData      = BIBLE_BOOK_LIST.find(b=>b.name===book)
  const totalChapters = bookData?.chapters || 1

  return (
    <div className="flex flex-col" style={{ height:'100dvh', background:t.bg }}>

      {/* ── FIXED TOP BAR — never scrolls away ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
        style={{
          background:  t.bgCard,
          borderBottom:`1px solid ${t.border}`,
          position:    'sticky',
          top:          0,
          zIndex:       40,
          minHeight:    52,
        }}
      >
        {/* Back */}
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>

        {/* Book + Chapter — full tap target, grows to fill */}
        <button onClick={() => setShowNav(true)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-[14px] active:opacity-80 flex-1 min-w-0"
          style={{ background:t.bgMuted }}>
          <span className="font-bold text-[15px] truncate" style={{ color:t.text }}>{book}</span>
          <span className="font-bold text-[15px] flex-shrink-0" style={{ color:'#5B4FCF' }}>
            {chapter}
          </span>
        </button>

        {/* Version */}
        <button onClick={() => setShowVer(true)}
          className="flex items-center justify-center px-3 py-2 rounded-[14px] flex-shrink-0"
          style={{ background:'#5B4FCF', minWidth:52, minHeight:40 }}>
          <span className="font-bold text-[13px] text-white">{versionAbbr}</span>
        </button>

        {/* Font */}
        <button onClick={() => setShowFont(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[13px]"
          style={{ background:t.bgMuted, color:t.text }}>
          Aa
        </button>

        {/* Dark / light toggle — synced with global toggle */}
        <button
          onClick={toggleDark}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:t.bgMuted, color:t.text }}
          aria-label={dark?'Light mode':'Dark mode'}
        >
          {dark ? <Sun size={16}/> : <Moon size={16}/>}
        </button>
      </div>

      {/* Offline / cached badge */}
      {fromCache && (
        <div className="flex-shrink-0 mx-4 mt-2 self-start flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background:t.sageBg }}>
          <Check size={11} style={{ color:'#4A7C5F' }}/>
          <span className="text-[11px] font-semibold" style={{ color:'#4A7C5F' }}>Saved offline</span>
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto scroll-hide px-5" style={{ paddingBottom:80 }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor:'#5B4FCF' }}/>
            <p className="text-[13px]" style={{ color:t.textMuted }}>
              Loading {book} {chapter}...
            </p>
          </div>
        )}

        {!loading && error && isOffline && (
          <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background:t.amberBg }}>
              <WifiOff size={24} style={{ color:'#E8A838' }}/>
            </div>
            <p className="font-bold text-[17px]" style={{ color:t.text }}>You're offline</p>
            <p className="text-[14px] leading-relaxed" style={{ color:t.textMuted }}>
              Connect once to cache this chapter forever.
            </p>
          </div>
        )}

        {!loading && error && !isOffline && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="text-[15px] font-semibold" style={{ color:t.text }}>Couldn't load passage</p>
            <p className="text-[13px] px-4" style={{ color:t.textMuted }}>{error}</p>
            <button onClick={() => load(book,chapter,versionId)}
              className="text-[14px] font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ background:'#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="pt-4 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-5"
              style={{ color:t.textFaint }}>
              {reference} · {versionAbbr}
            </p>
            {verses.length > 0 && verses[0]?.number > 0 ? (
              <p style={{ fontSize, color:t.text, fontFamily:fontStyle, lineHeight:2.2 }}>
                {verses.map((v,i) => (
                  <span key={i}>
                    <sup style={{
                      fontSize:Math.max(9,fontSize-6), color:'#5B4FCF',
                      fontWeight:700, marginRight:3, verticalAlign:'super',
                      lineHeight:0, userSelect:'none',
                    }}>
                      {v.number}
                    </sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            ) : (
              <VerseParser content={content} fontSize={fontSize} fontStyle={fontStyle} textColor={t.text}/>
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
          background:  t.bgCard,
          borderColor: t.border,
          position:    'fixed',
          bottom:       0,
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '100%',
          maxWidth:     430,
          zIndex:       40,
          paddingBottom:'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button onClick={goPrev} disabled={chapter<=1}
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

        <button onClick={goNext} disabled={chapter>=totalChapters}
          className="flex items-center gap-2 px-5 py-3 rounded-full border-2 disabled:opacity-30 active:scale-95 transition-all min-h-[44px]"
          style={{ borderColor:t.border, color:t.text }}>
          <span className="font-semibold text-[14px]">Next</span>
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {showNav && <NavigatorSheet currentBook={book} currentChapter={chapter} onSelect={navigate} onClose={()=>setShowNav(false)} t={t}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showFont && (
          <FontModal
            fontSize={fontSize} fontId={fontId}
            onFontSize={fs=>{setFontSize(fs);savePrefs(fs,fontId)}}
            onFontId={fi=>{setFontId(fi);savePrefs(fontSize,fi)}}
            onClose={()=>setShowFont(false)} t={t}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[100dvh]" style={{ background:'var(--bg,#FAF8F5)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor:'#5B4FCF' }}/>
      </div>
    }>
      <BibleReaderInner/>
    </Suspense>
  )
}