'use client'

export const dynamic = 'force-dynamic'

// ── /read — Bible Reader ──
// Uses YouVersion Platform SDK (@youversion/platform-core)
// Requires: NEXT_PUBLIC_YOUVERSION_APP_KEY in .env.local
// KJV (id:1) is default. All chapters cached in localStorage.

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowLeft, WifiOff, Download, Check, BookOpen, X } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import {
  getChapter, getAvailableVersions,
  getPreferredVersionId, setPreferredVersionId,
  isVersionDownloaded, downloadVersion,
  seedDefaultVersionIfNeeded,
  DEFAULT_VERSION_ID, BIBLE_BOOK_LIST,
} from '../../lib/bible'

// ─────────────────────────────────────────────
//  Book / chapter navigator
// ─────────────────────────────────────────────
function NavigatorSheet({ currentBook, currentChapter, onSelect, onClose }) {
  const [search,  setSearch]  = useState('')
  const [selBook, setSelBook] = useState(currentBook || 'John')
  const filtered     = BIBLE_BOOK_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
  const chapterCount = BIBLE_BOOK_LIST.find(b => b.name === selBook)?.chapters || 1

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ height:'78dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Go to</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="px-4 mb-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..." autoFocus
            className="w-full border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple"
            style={{ color:'#1A1A2E' }} />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 overflow-y-auto border-r border-gray-100 scroll-hide">
            {filtered.map(b => (
              <button key={b.name} onClick={() => setSelBook(b.name)}
                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors"
                style={{ background:selBook===b.name?'#EDE9FF':'transparent', color:selBook===b.name?'#5B4FCF':'#1A1A2E', fontWeight:selBook===b.name?700:400 }}>
                {b.name}
              </button>
            ))}
          </div>
          <div className="w-1/2 overflow-y-auto px-3 py-2 scroll-hide">
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: chapterCount }, (_, i) => i+1).map(ch => (
                <button key={ch} onClick={() => { onSelect(selBook, ch); onClose() }}
                  className="aspect-square rounded-xl flex items-center justify-center text-[13px] font-semibold transition-all active:scale-95"
                  style={{ background:(selBook===currentBook&&ch===currentChapter)?'#5B4FCF':'#F5F5F5', color:(selBook===currentBook&&ch===currentChapter)?'white':'#1A1A2E' }}>
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
//  Version picker
// ─────────────────────────────────────────────
function VersionSheet({ currentId, onSelect, onClose }) {
  const [versions,    setVersions]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState({}) // { [id]: 0-100 }
  const [downloaded,  setDownloaded]  = useState({}) // { [id]: true }
  const isOnline = useOnlineStatus()

  useEffect(() => {
    // Check which are already downloaded
    const dl = {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('dw_yv_downloaded_')) {
          dl[k.replace('dw_yv_downloaded_', '')] = true
        }
      }
    } catch {}
    setDownloaded(dl)

    getAvailableVersions().then(list => { setVersions(list); setLoading(false) })
  }, [])

  async function handleDownload(e, id) {
    e.stopPropagation()
    if (!isOnline) { alert('Connect to the internet to download'); return }
    setDownloading(p => ({ ...p, [id]: 0 }))
    await downloadVersion(id, (done, total) => {
      setDownloading(p => ({ ...p, [id]: Math.round((done/total)*100) }))
    })
    setDownloaded(p => ({ ...p, [id]: true }))
    setDownloading(p => { const n = {...p}; delete n[id]; return n })
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'80dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Bible Version</p>
            <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>Tap a version to switch · Download for offline</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto scroll-hide pb-8">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
                <Download size={20} style={{ color:'#9CA3AF' }} />
              </motion.div>
            </div>
          )}
          {versions.map(v => {
            const isCurrent  = v.id === currentId
            const isDl       = downloaded[String(v.id)] || v.id === DEFAULT_VERSION_ID
            const dlProgress = downloading[v.id]
            return (
              <button key={v.id} onClick={() => { onSelect(v.id); onClose() }}
                className="w-full flex items-center px-5 py-3.5 border-b hover:bg-gray-50 transition-colors gap-3 text-left"
                style={{ borderColor:'#F5F5F5' }}>
                {/* Selected radio */}
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor:isCurrent?'#5B4FCF':'#E5E7EB' }}>
                  {isCurrent && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[14px]" style={{ color:isCurrent?'#5B4FCF':'#1A1A2E' }}>
                      {v.abbreviation}
                    </p>
                    {isDl && !dlProgress && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background:'#E8F4ED', color:'#4A7C5F' }}>✓ Offline</span>
                    )}
                  </div>
                  <p className="text-[12px] truncate" style={{ color:'#6B7280' }}>{v.name}</p>
                  {typeof dlProgress === 'number' && (
                    <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
                      <motion.div className="h-full rounded-full" style={{ background:'#5B4FCF', width:`${dlProgress}%` }} />
                    </div>
                  )}
                </div>
                {/* Download button — only if not downloaded and not downloading */}
                {!isDl && typeof dlProgress === 'undefined' && (
                  <button
                    onClick={e => handleDownload(e, v.id)}
                    className="text-[12px] font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all active:scale-95"
                    style={{ color:'#5B4FCF', background:'#EDE9FF' }}>
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

// ─────────────────────────────────────────────
//  Main reader
// ─────────────────────────────────────────────
export default function BibleReaderPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isOnline     = useOnlineStatus()

  const [book,       setBook]      = useState(searchParams?.get('book')    || 'John')
  const [chapter,    setChapter]   = useState(parseInt(searchParams?.get('chapter') || '1'))
  const [versionId,  setVersionId] = useState(DEFAULT_VERSION_ID)
  const [versionAbbr,setAbbr]      = useState('KJV')
  const [data,       setData]      = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)
  const [isOffline,  setIsOffline] = useState(false)
  const [fromCache,  setFromCache] = useState(false)
  const [showNav,    setShowNav]   = useState(false)
  const [showVer,    setShowVer]   = useState(false)
  const [fontSize,   setFontSize]  = useState(17)

  useEffect(() => {
    const id = getPreferredVersionId()
    setVersionId(id)
    seedDefaultVersionIfNeeded()
  }, [])

  const load = useCallback(async (b, ch, vid) => {
    setLoading(true); setError(null); setIsOffline(false)
    const result = await getChapter(vid, b, ch)
    if (result.error) {
      setError(result.error)
      setIsOffline(!!result.offline)
    } else {
      setData(result)
      setFromCache(!!result.fromCache)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(book, chapter, versionId) }, [book, chapter, versionId, load])

  function selectVersion(id) {
    setPreferredVersionId(id)
    setVersionId(id)
    // Update abbreviation display
    getAvailableVersions().then(list => {
      const found = list.find(v => v.id === id)
      if (found) setAbbr(found.abbreviation)
    })
  }

  function navigate(b, ch) { setBook(b); setChapter(ch) }

  function goNext() {
    const bookData = BIBLE_BOOK_LIST.find(b => b.name === book)
    if (bookData && chapter < bookData.chapters) setChapter(c => c + 1)
  }
  function goPrev() {
    if (chapter > 1) setChapter(c => c - 1)
  }

  const verses      = data?.verses   || []
  const content     = data?.content  || ''
  const reference   = data?.reference || `${book} ${chapter}`
  const bookData    = BIBLE_BOOK_LIST.find(b => b.name === book)
  const totalChapters = bookData?.chapters || 1

  return (
    <div className="flex flex-col h-screen" style={{ background:'#FAF8F5' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
          style={{ color:'#1A1A2E' }}>
          <ArrowLeft size={18} />
        </button>

        <button onClick={() => setShowNav(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-sm active:bg-gray-100">
          <BookOpen size={14} style={{ color:'#5B4FCF' }} />
          <span className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{book}</span>
          <span className="text-[15px]" style={{ color:'#9CA3AF' }}>{chapter}</span>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowVer(true)}
            className="px-3 py-1.5 rounded-full bg-white shadow-sm text-[13px] font-bold active:bg-gray-100"
            style={{ color:'#5B4FCF' }}>
            {versionAbbr}
          </button>
          <button onClick={() => setFontSize(f => f===17?20:f===20?14:17)}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] font-bold"
            style={{ color:'#6B7280' }}>
            Aa
          </button>
        </div>
      </div>

      {/* Offline cached indicator */}
      {fromCache && (
        <div className="mx-4 mb-1 self-start flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background:'#E8F4ED' }}>
          <Check size={11} style={{ color:'#4A7C5F' }} />
          <span className="text-[11px] font-semibold" style={{ color:'#4A7C5F' }}>Saved offline</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 scroll-hide">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <motion.div animate={{ rotate:360 }} transition={{ duration:1.2, repeat:Infinity, ease:'linear' }}>
              <BookOpen size={24} style={{ color:'#C4C1BC' }} />
            </motion.div>
            <p className="text-[13px]" style={{ color:'#9CA3AF' }}>Loading {book} {chapter}...</p>
          </div>
        )}

        {!loading && error && isOffline && (
          <div className="flex flex-col items-center gap-4 py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#FFF4DC' }}>
              <WifiOff size={24} style={{ color:'#E8A838' }} />
            </div>
            <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>You're offline</p>
            <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>
              This chapter hasn't been cached yet. Connect once and it will be saved forever.
            </p>
          </div>
        )}

        {!loading && error && !isOffline && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-[15px] font-semibold" style={{ color:'#1A1A2E' }}>Couldn't load passage</p>
            <p className="text-[13px] px-4" style={{ color:'#9CA3AF' }}>{error}</p>
            {error.includes('APP_KEY') && (
              <p className="text-[12px] px-6 py-3 rounded-[14px]" style={{ background:'#FFF4DC', color:'#B07000' }}>
                Add NEXT_PUBLIC_YOUVERSION_APP_KEY to .env.local and restart.
                Get your key at platform.youversion.com
              </p>
            )}
            <button onClick={() => load(book, chapter, versionId)}
              className="text-[14px] font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ background:'#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div key={`${book}-${chapter}-${versionId}`}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }} className="pt-5 pb-6">

              <p className="text-[12px] font-bold uppercase tracking-widest mb-5"
                style={{ color:'#9CA3AF' }}>
                {reference} · {versionAbbr}
              </p>

              {/* Verse-by-verse if we have numbered verses */}
              {verses.length > 0 && verses[0].number > 0 ? (
                <div style={{ fontSize }}>
                  {verses.map((v, i) => (
                    <span key={i}>
                      <sup className="text-[10px] font-bold mr-1 select-none"
                        style={{ color:'#5B4FCF', verticalAlign:'super' }}>
                        {v.number}
                      </sup>
                      <span style={{ color:'#1A1A2E', lineHeight:2 }}>{v.text} </span>
                    </span>
                  ))}
                </div>
              ) : (
                /* Full content block when verse splitting isn't clean */
                <p className="leading-[2]" style={{ fontSize, color:'#1A1A2E' }}>
                  {content}
                </p>
              )}

              {/* Copyright attribution — required by YouVersion license */}
              <p className="mt-8 text-[11px] text-center" style={{ color:'#C4C1BC' }}>
                Scripture taken from the {versionAbbr} Bible
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Chapter navigation */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0 border-t border-gray-100 bg-white">
        <button onClick={goPrev} disabled={chapter <= 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 disabled:opacity-30 transition-all active:scale-95"
          style={{ borderColor:'#E5E7EB', color:'#1A1A2E' }}>
          <ChevronLeft size={16} />
          <span className="text-[13px] font-semibold">Prev</span>
        </button>

        <span className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>
          {chapter} / {totalChapters}
        </span>

        <button onClick={goNext} disabled={chapter >= totalChapters}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white disabled:opacity-30 transition-all active:scale-95"
          style={{ background:'#5B4FCF' }}>
          <span className="text-[13px] font-semibold">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <AnimatePresence>
        {showNav && <NavigatorSheet currentBook={book} currentChapter={chapter} onSelect={navigate} onClose={() => setShowNav(false)} />}
        {showVer && <VersionSheet currentId={versionId} onSelect={selectVersion} onClose={() => setShowVer(false)} />}
      </AnimatePresence>
    </div>
  )
}