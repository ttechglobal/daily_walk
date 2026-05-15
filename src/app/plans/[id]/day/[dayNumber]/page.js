'use client'

// ── /plans/[id]/day/[dayNumber] — Daily reading view ──
// Shows the day's passage inline with verse numbers.
// Tapping verses opens Bible reader at that passage.
// "Read Full Chapter" button navigates to /read with correct book+chapter.
// Plan data cached in localStorage — works offline after first load.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, CheckCircle2, X, WifiOff } from 'lucide-react'
import { useLocalStorage } from '../../../../../hooks/useLocalStorage'
import { useCheckin } from '../../../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../../../components/Toast'
import { markDayComplete, readPlans, writePlans } from '../../../../../lib/plans'
import { todayStr } from '../../../../../lib/constants'

// ── Confetti ──
const COLORS = ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#F9C74F','#FF6B6B']
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: (Math.random()-0.5)*300, y: Math.random()*-250+20,
    color: COLORS[i%COLORS.length], size: 6+Math.random()*6,
    delay: Math.random()*0.3, r: (Math.random()-0.5)*680,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-sm"
          style={{ left:'50%', top:'30%', width:p.size, height:p.size, background:p.color }}
          initial={{ x:0, y:0, opacity:1, rotate:0 }}
          animate={{ x:p.x, y:p.y, opacity:0, rotate:p.r }}
          transition={{ duration:1.4+Math.random()*0.5, delay:p.delay, ease:'easeOut' }} />
      ))}
    </div>
  )
}

// ── Nugget modal ──
function NuggetModal({ source, onClose }) {
  const [text, setText]       = useState('')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])
  function save() {
    if (!text.trim()) return
    setNuggets(prev => [{
      id: `nug_${Date.now()}`, text: text.trim(),
      source, createdAt: new Date().toISOString(),
    }, ...(prev||[])])
    showToast('Nugget saved!')
    onClose()
  }
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-5 pb-10"
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} style={{ color:'#E8A838' }} />
            <span className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Add a nugget</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15}/></button>
        </div>
        {source && <p className="text-[12px] mb-3" style={{ color:'#9CA3AF' }}>From {source}</p>}
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Write a nugget from this passage..." rows={4} autoFocus
          className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all mb-3"
          style={{ color:'#1A1A2E' }} />
        <button onClick={save} disabled={!text.trim()}
          className="w-full text-white rounded-pill py-3.5 font-bold text-[14px] disabled:opacity-40 active:scale-[0.97]"
          style={{ background:'#E8A838' }}>
          Save nugget
        </button>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Build deep-link URL for Bible reader
// ─────────────────────────────────────────────
function buildReaderUrl(passage) {
  if (!passage) return '/read'
  // Parse "John 3:16" or "JHN.3.16" or "Romans 8"
  const ref = passage.trim()

  // USFM format
  if (/^[A-Z0-9]{2,3}\.\d/.test(ref)) {
    const [bookId, ch] = ref.split('.')
    return `/read?book=${encodeURIComponent(bookId)}&chapter=${ch || '1'}`
  }

  // "Book Chapter:Verse" format
  const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?/)
  if (m) {
    return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
  }

  return '/read'
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function DayReadingPage() {
  const { id, dayNumber } = useParams()
  const router            = useRouter()
  const dayNum            = parseInt(dayNumber)

  const [plans, setPlans]       = useLocalStorage('dw_plans', [])
  const [nuggetOpen, setNugget] = useState(false)
  const [confetti,   setConfetti] = useState(false)
  const [verses,     setVerses]   = useState(null)
  const [loading,    setLoading]  = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isOffline,  setIsOffline] = useState(false)
  const [reflection, setReflection] = useState('')
  const [, , hydrated]            = useLocalStorage('dw_plans', [])
  const scrollRef                 = useRef(null)
  const { performCheckin, isCheckedInToday } = useCheckin()

  const plan    = (plans || []).find(p => p.id === id)
  const dayData = plan?.days?.find(d => d.day === dayNum)
  const today   = todayStr()
  const isDone  = dayData?.completedAt?.startsWith(today)
  const readerUrl = buildReaderUrl(dayData?.passage)

  // ── Fetch passage — cache-first, demand-only ──
  const fetchPassage = useCallback(async () => {
    if (!dayData?.passage) return
    setLoading(true); setFetchError(null); setIsOffline(false)
    try {
      const { getPassage, getPreferredVersionId } = await import('../../../../../lib/bible')
      const versionId = getPreferredVersionId()
      const result    = await getPassage(dayData.passage, versionId)

      if (result.offline) {
        setIsOffline(true)
        setFetchError(null)
        return
      }

      if (result.error) throw new Error(result.error)

      // Normalise verse shape from either API source
      const normalised = (result.verses || []).map(v => ({
        number: v.number ?? v.verse?.number ?? v.verseNumber ?? 0,
        text:   v.text  ?? v.verse?.text   ?? '',
      })).filter(v => v.text)

      setVerses(normalised)
    } catch (err) {
      setFetchError(err.message || "Couldn't load passage")
    } finally {
      setLoading(false)
    }
  }, [dayData?.passage])

  useEffect(() => { if (hydrated) fetchPassage() }, [hydrated, fetchPassage])

  function handleComplete() {
    markDayComplete(id, dayNum, reflection)
    setPlans(readPlans())
    if (!isCheckedInToday) performCheckin({ passage: dayData?.passage, reflection })
    setConfetti(true)
    setTimeout(() => { setConfetti(false); router.push('/plans') }, 2200)
  }

  if (!hydrated) return null
  if (!plan || !dayData) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p style={{ color:'#6B7280' }}>Day not found.</p>
      <button onClick={() => router.push('/plans')} className="font-semibold underline" style={{ color:'#5B4FCF' }}>Back to plans</button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
      {confetti && <Confetti />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
          style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.07)', color:'#1A1A2E' }}>
          <ArrowLeft size={18} />
        </button>
        <p className="font-semibold text-[14px]" style={{ color:'#6B7280' }}>
          {plan.name} · Day {dayNum}
        </p>
        <div className="w-9" />
      </div>

      {/* Passage header */}
      <div className="px-5 pb-3">
        <h1 className="font-display text-[24px] font-bold" style={{ color:'#1A1A2E' }}>
          {dayData.passage}
        </h1>
        {dayData.title && (
          <p className="text-[15px] mt-1" style={{ color:'#6B7280' }}>{dayData.title}</p>
        )}
        {dayData.focus && (
          <p className="font-display italic text-[13px] mt-1.5 leading-relaxed" style={{ color:'#9CA3AF' }}>
            {dayData.focus}
          </p>
        )}

        {/* Read Full Chapter button — always visible, prominent */}
        <button
          onClick={() => router.push(readerUrl)}
          className="mt-3 px-4 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-all"
          style={{ background:'#EDE9FF', color:'#5B4FCF' }}>
          Read Full Chapter
        </button>
      </div>

      <div className="mx-4 h-px mb-1" style={{ background:'#F0EDE8' }} />

      {/* Passage content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-hide pb-52 px-5">

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 pt-4 animate-pulse">
            {[85,95,70,88,60,92,75,80].map((w,i) => (
              <div key={i} className="h-4 rounded-full" style={{ width:`${w}%`, background:'#E8E5E0' }} />
            ))}
          </div>
        )}

        {/* Offline — chapter not cached */}
        {!loading && isOffline && (
          <div className="flex flex-col items-center gap-4 py-12 text-center px-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#FFF4DC' }}>
              <WifiOff size={24} style={{ color:'#E8A838' }} />
            </div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Not cached yet</p>
            <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>
              Connect once to save this passage for offline reading.
            </p>
            <button onClick={fetchPassage}
              className="px-5 py-2.5 rounded-full font-bold text-[14px] text-white"
              style={{ background:'#5B4FCF' }}>
              Retry
            </button>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && !isOffline && (
          <div className="py-8 flex flex-col items-center gap-3 text-center px-4">
            <p className="text-[14px]" style={{ color:'#6B7280' }}>
              Couldn't load passage
            </p>
            <p className="text-[12px]" style={{ color:'#9CA3AF' }}>{fetchError}</p>
            <button onClick={fetchPassage}
              className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
              style={{ background:'#5B4FCF' }}>
              Try again
            </button>
          </div>
        )}

        {/* Verses — tappable to open Bible reader */}
        {!loading && !isOffline && verses && verses.length > 0 && (
          <motion.div key={dayData.passage}
            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
            className="pt-4 pb-4">

            {verses.map((v, i) => (
              <button key={i}
                onClick={() => router.push(readerUrl)}
                className="w-full text-left mb-1 rounded-[12px] px-2 py-1 transition-all active:bg-purple/5 hover:bg-purple/5"
                style={{ WebkitTapHighlightColor:'transparent' }}>
                <p style={{ lineHeight: 1.9, color:'#1A1A2E', fontSize: 17 }}>
                  {v.number > 0 && (
                    <sup style={{ fontSize:10, color:'#5B4FCF', fontWeight:700,
                                  marginRight:4, verticalAlign:'super', lineHeight:0 }}>
                      {v.number}
                    </sup>
                  )}
                  {v.text}
                </p>
              </button>
            ))}
          </motion.div>
        )}

        {/* Reflection input */}
        <div className="pt-4 pb-4">
          <p className="font-bold text-[13px] mb-2" style={{ color:'#6B7280' }}>Your reflection</p>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="What stood out to you today?"
            rows={3}
            className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
            style={{ color:'#1A1A2E' }}
          />
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-4 pb-8"
        style={{ background:'#FAF8F5', borderTop:'1px solid #F0EDE8' }}>

        {isDone ? (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-pill text-[15px] font-bold"
            style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
            <CheckCircle2 size={18} /> Completed today ✓
          </div>
        ) : (
          <button onClick={handleComplete}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.35)' }}>
            Mark as complete ✓
          </button>
        )}
      </div>

      {/* Nugget FAB */}
      <button onClick={() => setNugget(true)}
        className="fixed bottom-36 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-30"
        style={{ background:'#E8A838' }} aria-label="Add nugget">
        <Lightbulb size={20} className="text-white" />
      </button>

      <AnimatePresence>
        {nuggetOpen && <NuggetModal source={dayData.passage} onClose={() => setNugget(false)} />}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}