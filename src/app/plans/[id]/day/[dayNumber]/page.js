'use client'

// ── /plans/[id]/day/[dayNumber] — Daily reading view ──
// Shows the day's passage inline with verse numbers.
// Tapping verses opens Bible reader at that passage.
// "Read Full Chapter" button navigates to /read with correct book+chapter.
// Plan data cached in localStorage — works offline after first load.
// DARK MODE: full support via useDarkMode() + getDarkModeColors()

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, CheckCircle2, X, WifiOff } from 'lucide-react'
import { useLocalStorage } from '../../../../../hooks/useLocalStorage'
import { useCheckin } from '../../../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../../../components/Toast'
import { markDayComplete, readPlans, writePlans } from '../../../../../lib/plans'
import { todayStr } from '../../../../../lib/constants'
import { useDarkMode, getDarkModeColors } from '../../../../../contexts/DarkModeContext'

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
function NuggetModal({ source, onClose, c }) {
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
      <motion.div className="fixed inset-0 bg-black/50 z-40"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] rounded-t-[24px] z-50 px-5 pt-5 pb-10"
        style={{ background: c.bgCard }}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: c.border }}/>
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-[17px]" style={{ color: c.text }}>💡 New Nugget</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: c.bgMuted }}>
            <X size={15} style={{ color: c.textMuted }}/>
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: c.textFaint }}>From: {source}</p>
        <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
          placeholder="Write an insight, a verse, a thought…"
          rows={4}
          className="w-full rounded-[14px] px-4 py-3 text-[15px] resize-none focus:outline-none mb-4"
          style={{ background: c.bgMuted, color: c.text, border: `1.5px solid ${c.borderInput}` }}/>
        <button onClick={save} disabled={!text.trim()}
          className="w-full py-4 rounded-pill font-bold text-[15px] text-white disabled:opacity-40 active:scale-[0.97] transition-all"
          style={{ background:'#E8A838' }}>
          Save Nugget
        </button>
      </motion.div>
    </>
  )
}

// ── URL builder ──
function buildReaderUrl(ref) {
  if (!ref) return '/read'

  // Handle "BookName Chapter" with optional strong number suffix
  const bookMatch = ref.match(/^(.+?)\s+(\d+)(?::\d+)?/)
  if (bookMatch) {
    const bookId = bookMatch[1].trim()
    const ch     = bookMatch[2]
    return `/read?book=${encodeURIComponent(bookId)}&chapter=${ch || '1'}`
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
  const { dark }          = useDarkMode()
  const c                 = getDarkModeColors(dark)

  const [plans, setPlans]         = useLocalStorage('dw_plans', [])
  const [nuggetOpen, setNugget]   = useState(false)
  const [confetti,   setConfetti] = useState(false)
  const [verses,     setVerses]   = useState(null)
  const [loading,    setLoading]  = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isOffline,  setIsOffline]  = useState(false)
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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4"
      style={{ background: c.bg }}>
      <p style={{ color: c.textMuted }}>Day not found.</p>
      <button onClick={() => router.push('/plans')} className="font-semibold underline"
        style={{ color:'#5B4FCF' }}>
        Back to plans
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>
      {confetti && <Confetti />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${c.border}` }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: c.bgCard, boxShadow: c.shadow, color: c.text }}>
          <ArrowLeft size={18} />
        </button>
        <p className="font-semibold text-[14px]" style={{ color: c.textMuted }}>
          {plan.name} · Day {dayNum}
        </p>
        <div className="w-9" />
      </div>

      {/* Scrollable content — pb-32 clears sticky bottom bar */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: 128 }}>

        {/* Passage header */}
        <div className="pt-5 pb-3">
          <h1 className="font-display text-[24px] font-bold" style={{ color: c.text }}>
            {dayData.passage}
          </h1>
          {dayData.title && (
            <p className="text-[15px] mt-1" style={{ color: c.textMuted }}>{dayData.title}</p>
          )}
          {dayData.focus && (
            <p className="font-display italic text-[13px] mt-1.5 leading-relaxed" style={{ color: c.textFaint }}>
              {dayData.focus}
            </p>
          )}

          {/* Read Full Chapter button */}
          <button
            onClick={() => router.push(readerUrl)}
            className="mt-3 px-4 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-all"
            style={{ background: c.purpleLight, color: '#5B4FCF' }}>
            Read in Bible →
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 pt-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-5 rounded-full animate-pulse"
                style={{ background: c.bgMuted, width: `${70 + (i % 3)*12}%` }}/>
            ))}
          </div>
        )}

        {/* Offline notice */}
        {!loading && isOffline && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: c.bgMuted }}>
              <WifiOff size={22} style={{ color: c.textMuted }}/>
            </div>
            <p className="font-semibold text-[15px]" style={{ color: c.text }}>You're offline</p>
            <p className="text-[13px]" style={{ color: c.textMuted }}>
              Connect to load this passage, or open it in the Bible reader.
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
            <p className="text-[14px]" style={{ color: c.textMuted }}>
              Couldn't load passage
            </p>
            <p className="text-[12px]" style={{ color: c.textFaint }}>{fetchError}</p>
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
                className="w-full text-left mb-1 rounded-[12px] px-2 py-1 transition-all"
                style={{ WebkitTapHighlightColor:'transparent' }}>
                <p style={{ lineHeight: 1.9, color: c.text, fontSize: 17 }}>
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
          <p className="font-bold text-[13px] mb-2" style={{ color: c.textMuted }}>Your reflection</p>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="What stood out to you today?"
            rows={3}
            className="w-full rounded-[14px] resize-none px-4 py-3 text-[14px] focus:outline-none transition-all"
            style={{
              background:   c.bgInput,
              color:        c.text,
              border:       `1.5px solid ${c.borderInput}`,
            }}
          />
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-4"
        style={{
          background:  c.bg,
          borderTop:   `1px solid ${c.border}`,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}>

        {isDone ? (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-pill text-[15px] font-bold"
            style={{ background: c.sageLight, color:'#4A7C5F' }}>
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
        {nuggetOpen && (
          <NuggetModal source={dayData.passage} onClose={() => setNugget(false)} c={c} />
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}