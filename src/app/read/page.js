'use client'

// ── src/app/read/page.js ── v5
// KJV loads immediately — no download required.
// Translation sheet shows: Active / Downloaded / Available online / Get offline.
// User never sees a "download a Bible first" wall.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, WifiOff, Sun, Moon,
  Plus, Minus, ChevronLeft, ChevronRight,
  Download, Check, Languages,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import {
  getChapter, BIBLE_BOOK_LIST, normaliseBookId, getBookByName,
  getPreferredVersionId, setPreferredVersionId, seedDefaultVersionIfNeeded,
} from '../../lib/bible'
import {
  TRANSLATIONS, getActiveTranslation, setActiveTranslation,
  isTranslationDownloaded, getDownloadedSet,
} from '../../lib/bib-translations'
import { downloadTranslation, getDownloadState, subscribeToDownload } from '../../lib/translation-download'

const FONT_OPTIONS = [
  { id:'lora',    label:'Lora',    style:"'Lora', Georgia, serif" },
  { id:'jakarta', label:'Jakarta', style:"'Plus Jakarta Sans',system-ui,sans-serif" },
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
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:t.bgCard, height:'78dvh' }}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{background:t.border}}/></div>
        <div className="px-4 pt-3 pb-2">
          <p className="font-display font-bold text-[17px] mb-3" style={{color:t.text}}>Go to chapter</p>
          <input type="search" placeholder="Search books…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-[12px] text-[14px] focus:outline-none"
            style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${t.border}`}}/>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 overflow-y-auto border-r" style={{borderColor:t.border}}>
            {filtered.map(b => (
              <button key={b.bookId} onClick={() => setSelBook(b.name)}
                className="w-full text-left px-4 py-2.5 text-[14px] transition-all"
                style={{color:selBook===b.name?'#5B4FCF':t.text,fontWeight:selBook===b.name?700:400,background:selBook===b.name?'#5B4FCF12':'transparent'}}>
                {b.name}
              </button>
            ))}
          </div>
          <div className="w-1/2 overflow-y-auto p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({length:chapterCount},(_,i)=>i+1).map(ch => (
                <button key={ch} onClick={() => { onSelect(selBook, ch); onClose() }}
                  className="aspect-square rounded-[10px] flex items-center justify-center text-[13px] font-bold transition-all active:scale-90"
                  style={{background:ch===currentChapter&&selBook===currentBook?'#5B4FCF':t.bgMuted,color:ch===currentChapter&&selBook===currentBook?'white':t.text}}>
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
//  Translation sheet
//  Groups: Active | Downloaded | Available online | Get for offline
// ─────────────────────────────────────────────
function TranslationSheet({ currentId, onSelect, onClose, t, router }) {
  const [dlStates, setDlStates] = useState({})
  const downloaded = getDownloadedSet()
  const enabled    = TRANSLATIONS.filter(tr => tr.enabled)

  // Subscribe to all download states
  useEffect(() => {
    const unsubs = enabled.map(tr =>
      subscribeToDownload(tr.id, state =>
        setDlStates(prev => ({ ...prev, [tr.id]: state }))
      )
    )
    return () => unsubs.forEach(u => u())
  }, [])

  function handleSelect(id) {
    setActiveTranslation(id)
    onSelect(id)
    onClose()
  }

  function handleGet(id) {
    downloadTranslation(id)
  }

  // Split into groups
  const activeItem      = enabled.find(tr => tr.id === currentId)
  const downloadedOthers = enabled.filter(tr => tr.id !== currentId && downloaded.has(tr.id))
  const onlineOnly       = enabled.filter(tr => tr.id !== currentId && !downloaded.has(tr.id))

  function TransRow({ tr, showSwitch, showGet }) {
    const dl = dlStates[tr.id]
    const isDownloading = dl?.status === 'downloading'
    const pct = dl?.pct ?? 0

    return (
      <button
        onClick={() => showSwitch ? handleSelect(tr.id) : undefined}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-all"
        style={{
          background:  tr.id === currentId ? '#5B4FCF08' : 'transparent',
          cursor:      showSwitch ? 'pointer' : 'default',
          borderBottom: `1px solid ${t.border}`,
        }}>
        <div style={{ width:48, flexShrink:0 }}>
          <p style={{ fontSize:16, fontWeight:600,
            color: tr.id===currentId?'#5B4FCF' : downloaded.has(tr.id)?'#4A7C5F' : t.textMuted }}>
            {tr.abbreviation}
          </p>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p style={{ fontSize:14, fontWeight:500, color:t.text }}>{tr.name}</p>
          {tr.id===currentId && <p style={{fontSize:11,color:'#5B4FCF',marginTop:1}}>Active · Online</p>}
          {downloaded.has(tr.id)&&tr.id!==currentId && <p style={{fontSize:11,color:'#4A7C5F',marginTop:1}}>Offline ready</p>}
          {isDownloading && (
            <>
              <p style={{fontSize:11,color:'#5B4FCF',marginTop:1}}>Downloading {pct}%</p>
              <div style={{height:2,background:t.border,borderRadius:1,marginTop:4,overflow:'hidden'}}>
                <div style={{height:2,background:'#5B4FCF',borderRadius:1,width:`${pct}%`,transition:'width .3s'}}/>
              </div>
            </>
          )}
          {showGet&&!isDownloading && <p style={{fontSize:11,color:t.textFaint,marginTop:1}}>Available online · tap Get to save offline</p>}
        </div>
        {tr.id===currentId && (
          <div style={{width:22,height:22,borderRadius:11,background:'#5B4FCF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Check size={12} color="#fff"/>
          </div>
        )}
        {showSwitch && tr.id!==currentId && (
          <p style={{fontSize:13,fontWeight:500,color:'#5B4FCF',flexShrink:0}}>Switch</p>
        )}
        {showGet && !isDownloading && (
          <button onClick={e=>{e.stopPropagation();handleGet(tr.id)}}
            style={{height:28,padding:'0 12px',borderRadius:14,background:'#5B4FCF',color:'#fff',fontSize:12,fontWeight:600,border:'none',cursor:'pointer',flexShrink:0}}>
            Get
          </button>
        )}
        {isDownloading && (
          <button onClick={e=>{e.stopPropagation()}}
            style={{height:28,padding:'0 10px',borderRadius:14,background:t.bgMuted,color:t.textMuted,fontSize:12,border:'none',cursor:'pointer',flexShrink:0}}>
            {pct}%
          </button>
        )}
      </button>
    )
  }

  function SectionLabel({ label }) {
    return (
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:t.textFaint,padding:'10px 16px 4px',background:t.bgMuted,borderBottom:`1px solid ${t.border}`}}>
        {label}
      </p>
    )
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{ background:t.bgCard, maxHeight:'80dvh' }}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{background:t.border}}/></div>
        <div className="flex items-center justify-between px-4 pt-3 pb-3" style={{borderBottom:`1px solid ${t.border}`}}>
          <p style={{fontSize:17,fontWeight:600,color:t.text}}>Translation</p>
          <button onClick={() => { onClose(); router.push('/translations') }}
            style={{fontSize:13,fontWeight:500,color:'#5B4FCF',background:'transparent',border:'none',cursor:'pointer'}}>
            Manage
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active */}
          {activeItem && <TransRow tr={activeItem} showSwitch={false} showGet={false}/>}

          {/* Downloaded */}
          {downloadedOthers.length > 0 && (
            <>
              <SectionLabel label="Downloaded · offline ready"/>
              {downloadedOthers.map(tr => <TransRow key={tr.id} tr={tr} showSwitch={true} showGet={false}/>)}
            </>
          )}

          {/* Online available */}
          {onlineOnly.length > 0 && (
            <>
              <SectionLabel label="Available online · get for offline"/>
              {onlineOnly.map(tr => <TransRow key={tr.id} tr={tr} showSwitch={true} showGet={true}/>)}
            </>
          )}
        </div>

        <div style={{padding:'12px 16px',borderTop:`1px solid ${t.border}`}}>
          <p style={{fontSize:12,color:t.textFaint,textAlign:'center'}}>
            All translations work online. Download for offline reading.
          </p>
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
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70]"
        style={{background:t.bgCard}} initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{background:t.border}}/></div>
        <div className="px-5 pt-4 pb-8">
          <p className="font-display font-bold text-[17px] mb-4" style={{color:t.text}}>Reading options</p>
          <p style={{fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:t.textMuted,marginBottom:8}}>Text size</p>
          <div className="flex items-center gap-4 mb-5">
            <button onClick={() => onFontSize(Math.max(13,fontSize-1))} className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:t.bgMuted}}><Minus size={16} style={{color:t.text}}/></button>
            <div className="flex-1 h-2 rounded-full relative" style={{background:t.bgMuted}}>
              <div className="absolute top-0 left-0 h-2 rounded-full" style={{background:'#5B4FCF',width:`${((fontSize-13)/(26-13))*100}%`}}/>
            </div>
            <button onClick={() => onFontSize(Math.min(26,fontSize+1))} className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:t.bgMuted}}><Plus size={16} style={{color:t.text}}/></button>
          </div>
          <p style={{fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:t.textMuted,marginBottom:8}}>Font</p>
          <div className="flex flex-col gap-2">
            {FONT_OPTIONS.map(f => (
              <button key={f.id} onClick={() => onFontId(f.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all text-left"
                style={{background:fontId===f.id?t.purpleBg||'#EDE9FF':t.bgMuted,border:`2px solid ${fontId===f.id?'#5B4FCF':'transparent'}`}}>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{borderColor:fontId===f.id?'#5B4FCF':t.borderInput}}>
                  {fontId===f.id&&<div className="w-2.5 h-2.5 rounded-full" style={{background:'#5B4FCF'}}/>}
                </div>
                <span style={{fontFamily:f.style,fontSize:15,color:fontId===f.id?'#5B4FCF':t.text}}>{f.label} — The quick brown fox</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

function getPrevBook(name){const i=BIBLE_BOOK_LIST.findIndex(b=>b.name===name);return i>0?BIBLE_BOOK_LIST[i-1]:null}
function getNextBook(name){const i=BIBLE_BOOK_LIST.findIndex(b=>b.name===name);return i>=0&&i<BIBLE_BOOK_LIST.length-1?BIBLE_BOOK_LIST[i+1]:null}

// ─────────────────────────────────────────────
//  Main reader
// ─────────────────────────────────────────────
function BibleReaderInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t, dark, toggle:toggleDark } = useTheme()

  const [book,          setBook]          = useState(searchParams?.get('book')    || 'John')
  const [chapter,       setChapter]       = useState(parseInt(searchParams?.get('chapter')||'1'))
  const [translationId, setTranslationId] = useState(() => getActiveTranslation() || 'KJV')
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [isOffline,     setIsOffline]     = useState(false)
  const [fromCache,     setFromCache]     = useState(false)
  const [showNav,       setShowNav]       = useState(false)
  const [showTrans,     setShowTrans]     = useState(false)
  const [showFont,      setShowFont]      = useState(false)
  const [fontSize,      setFontSize]      = useState(17)
  const [fontId,        setFontId]        = useState('lora')

  const bookInfo      = getBookByName(book)
  const totalChapters = bookInfo?.chapters || 1
  const fontStyle     = FONT_OPTIONS.find(f=>f.id===fontId)?.style || FONT_OPTIONS[0].style

  useEffect(() => {
    try { const s=localStorage.getItem('dw_reader_prefs'); if(s){const p=JSON.parse(s);setFontSize(p.fs||17);setFontId(p.fi||'lora')} } catch {}
    setTranslationId(getActiveTranslation() || 'KJV')
  }, [])

  function savePrefs(fs, fi) { try { localStorage.setItem('dw_reader_prefs', JSON.stringify({fs,fi})) } catch {} }

  const load = useCallback(async (b, ch, tid) => {
    setLoading(true); setError(null); setIsOffline(false); setData(null)
    try {
      const result = await getChapter(b, ch, tid)
      if (result.offline) { setIsOffline(true); return }
      if (result.error)   { setError(result.error); return }
      setData(result)
      setFromCache(!!result.fromCache)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(book, chapter, translationId) }, [book, chapter, translationId, load])
  useEffect(() => { window.history.replaceState(null,'',`/read?book=${encodeURIComponent(book)}&chapter=${chapter}`) }, [book, chapter])

  function navigate(b, ch) { setBook(b); setChapter(ch) }
  function goPrev() { if(chapter>1){setChapter(c=>c-1)}else{const p=getPrevBook(book);if(p){setBook(p.name);setChapter(p.chapters)}} }
  function goNext() { if(chapter<totalChapters){setChapter(c=>c+1)}else{const n=getNextBook(book);if(n){setBook(n.name);setChapter(1)}} }

  const verses = data?.verses || []

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{background:t.bg}}>
      {/* TOP BAR */}
      <div className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 z-30"
        style={{background:t.bg,borderColor:t.border}}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 active:scale-90 transition-all" style={{background:t.bgMuted}}>
          <ArrowLeft size={17} style={{color:t.text}}/>
        </button>
        <button onClick={() => setShowNav(true)} className="flex-1 text-left px-1 min-w-0">
          <p className="font-display font-bold text-[16px] truncate" style={{color:t.text}}>{book} {chapter}</p>
          <p className="text-[11px]" style={{color:t.textFaint}}>{chapter} of {totalChapters}</p>
        </button>
        <button onClick={() => setShowTrans(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border active:scale-95 transition-all"
          style={{borderColor:t.border,background:t.bgMuted}}>
          <Languages size={12} style={{color:'#5B4FCF'}}/>
          <span className="font-bold text-[12px]" style={{color:'#5B4FCF'}}>{translationId}</span>
        </button>
        <button onClick={() => setShowFont(true)} className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 active:scale-90 transition-all" style={{background:t.bgMuted}}>
          <span className="font-bold text-[13px]" style={{color:t.text}}>Aa</span>
        </button>
        <button onClick={toggleDark} className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 active:scale-90 transition-all" style={{background:t.bgMuted}}>
          {dark?<Sun size={16} style={{color:'#E8A838'}}/>:<Moon size={16} style={{color:t.text}}/>}
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-5" style={{paddingBottom:100}}>
        {isOffline && (
          <div className="pt-20 flex flex-col items-center gap-3 text-center px-4">
            <WifiOff size={36} style={{color:t.textMuted}}/>
            <p className="font-semibold text-[16px]" style={{color:t.text}}>You're offline</p>
            <p className="text-[13px]" style={{color:t.textMuted}}>Connect to the internet to read — or download this translation for offline access.</p>
            <button onClick={() => router.push('/translations')} className="mt-2 px-5 py-2.5 rounded-full font-bold text-[14px] text-white" style={{background:'#5B4FCF'}}>Download Translations</button>
          </div>
        )}
        {loading && (
          <div className="pt-8 flex flex-col gap-4 animate-pulse">
            <div className="h-8 rounded-xl w-2/5 mx-auto" style={{background:t.bgMuted}}/>
            <div className="h-6 rounded-xl w-1/3 mx-auto mb-4" style={{background:t.bgMuted}}/>
            {Array.from({length:8}).map((_,i)=><div key={i} className="h-4 rounded-xl" style={{background:t.bgMuted,width:`${70+Math.random()*30}%`}}/>)}
          </div>
        )}
        {!loading && error && !isOffline && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="text-[15px] font-semibold" style={{color:t.text}}>Couldn't load passage</p>
            <p className="text-[13px] px-4" style={{color:t.textMuted}}>{error}</p>
            <button onClick={() => load(book,chapter,translationId)} className="text-[14px] font-semibold px-5 py-2.5 rounded-full text-white" style={{background:'#5B4FCF'}}>Try again</button>
          </div>
        )}
        {!loading && !error && !isOffline && verses.length > 0 && (
          <div className="pt-6 pb-4">
            <div className="text-center mb-8">
              <h1 className="font-display font-bold" style={{fontSize:34,lineHeight:1.2,color:t.text,letterSpacing:'-.02em'}}>{book}</h1>
              <p className="font-display font-bold mt-1" style={{fontSize:28,lineHeight:1,color:'#5B4FCF'}}>Chapter {chapter}</p>
            </div>
            <p style={{fontSize,color:t.text,fontFamily:fontStyle,lineHeight:2.1}}>
              {verses.map((v,i)=>(
                <span key={i}>
                  <sup style={{fontSize:Math.max(9,fontSize-6),color:'#5B4FCF',fontWeight:700,marginRight:3,verticalAlign:'super',lineHeight:0,userSelect:'none'}}>{v.number}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </p>
            <p className="mt-10 text-[11px] text-center" style={{color:t.textFaint}}>
              {translationId} · {fromCache ? '● Offline' : '○ Online'}
            </p>
          </div>
        )}
      </div>

      {/* PREV / NEXT */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t"
        style={{background:t.bgCard,borderColor:t.border,position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,zIndex:40,paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))'}}>
        <button onClick={goPrev} className="flex items-center gap-2 px-5 py-3 rounded-full border-2 active:scale-95 transition-all min-h-[44px]" style={{borderColor:t.border,color:t.text}}>
          <ChevronLeft size={18}/><span className="font-semibold text-[14px]">Prev</span>
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-bold text-[14px]" style={{color:t.text}}>{book} {chapter}</span>
          <span className="text-[11px]" style={{color:t.textFaint}}>{chapter} / {totalChapters}</span>
        </div>
        <button onClick={goNext} className="flex items-center gap-2 px-5 py-3 rounded-full border-2 active:scale-95 transition-all min-h-[44px]" style={{borderColor:t.border,color:t.text}}>
          <span className="font-semibold text-[14px]">Next</span><ChevronRight size={18}/>
        </button>
      </div>

      {/* SHEETS */}
      <AnimatePresence>
        {showNav && <NavigatorSheet currentBook={book} currentChapter={chapter} onSelect={navigate} onClose={()=>setShowNav(false)} t={t}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showTrans && <TranslationSheet currentId={translationId} onSelect={id=>setTranslationId(id)} onClose={()=>setShowTrans(false)} t={t} router={router}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showFont && <FontModal fontSize={fontSize} fontId={fontId} onFontSize={fs=>{setFontSize(fs);savePrefs(fs,fontId)}} onFontId={fi=>{setFontId(fi);savePrefs(fontSize,fi)}} onClose={()=>setShowFont(false)} t={t}/>}
      </AnimatePresence>
    </div>
  )
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[100dvh]" style={{background:'var(--bg,#FAF8F5)'}}><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#5B4FCF'}}/></div>}>
      <BibleReaderInner/>
    </Suspense>
  )
}