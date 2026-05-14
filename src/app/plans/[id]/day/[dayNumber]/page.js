'use client'

// ── /plans/[id]/day/[dayNumber] — Daily reading view (Part 4) ──
// Focused mode: no bottom nav, nugget FAB, confetti on completion

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, CheckCircle2, X } from 'lucide-react'
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
    setNuggets(prev => [{ id:`nug_${Date.now()}`, text:text.trim(), source, createdAt:new Date().toISOString() }, ...(prev||[])])
    showToast('Nugget saved!')
    onClose()
  }
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
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
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write a nugget from this passage..." rows={4} autoFocus
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

export default function DayReadingPage() {
  const { id, dayNumber } = useParams()
  const router            = useRouter()
  const dayNum            = parseInt(dayNumber)

  const [plans, setPlans]       = useLocalStorage('dw_plans', [])
  const [nuggetOpen, setNugget] = useState(false)
  const [confetti,   setConfetti] = useState(false)
  const [verses,     setVerses]  = useState(null)
  const [loading,    setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [reflection, setReflection] = useState('')
  const [, , hydrated]          = useLocalStorage('dw_plans', [])
  const scrollRef               = useRef(null)
  const { performCheckin, isCheckedInToday } = useCheckin()

  const plan    = (plans || []).find(p => p.id === id)
  const dayData = plan?.days?.find(d => d.day === dayNum)
  const today   = todayStr()
  const isDone  = dayData?.completedAt?.startsWith(today)

  // Fetch passage
  const fetchPassage = useCallback(async () => {
    if (!dayData?.passage) return
    setLoading(true); setFetchError(null)
    try {
      const { getPassage, getPreferredTranslation } = await import('../../../../../lib/bible')
      const trans  = getPreferredTranslation()
      const result = await getPassage(dayData.passage, trans)
      if (result.error) throw new Error(result.error)
      // Normalise verse shape from new API
      const normalised = (result.verses || []).map(v => ({
        verse: v.verse?.number ?? v.verseNumber ?? v.number ?? '',
        text:  v.verse?.text  ?? v.text ?? '',
      }))
      setVerses(normalised)
    } catch {
      setFetchError("Couldn't load passage. Check your connection or open the Bible reader.")
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

      {/* Passage info */}
      <div className="px-5 pb-4">
        <h1 className="font-display text-[22px] font-bold" style={{ color:'#1A1A2E' }}>{dayData.passage}</h1>
        {dayData.title && <p className="text-[15px] mt-0.5" style={{ color:'#6B7280' }}>{dayData.title}</p>}
        {dayData.focus && <p className="font-display italic text-[13px] mt-1 leading-relaxed" style={{ color:'#9CA3AF' }}>{dayData.focus}</p>}
      </div>

      <div className="mx-4 h-px mb-4" style={{ background:'#F0EDE8' }} />

      {/* Passage content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-hide pb-48">
        {loading && (
          <div className="px-5 flex flex-col gap-3 animate-pulse">
            {[80,95,70,88,60,92,75].map((w,i) => (
              <div key={i} className="h-4 rounded-full" style={{ width:`${w}%`, background:'#E8E5E0' }} />
            ))}
          </div>
        )}
        {fetchError && (
          <div className="px-5 py-6 text-center">
            <p className="text-[14px] leading-relaxed" style={{ color:'#9CA3AF' }}>{fetchError}</p>
          </div>
        )}
        {verses && !loading && (
          <motion.div key={dayData.passage} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="px-5 pb-4">
            {verses.map(v => (
              <p key={v.verse} className="font-display text-[17px] mb-2" style={{ lineHeight:1.9, color:'#1A1A2E' }}>
                <span className="text-[12px] mr-2 select-none" style={{ color:'#C4C1BC' }}>{v.verse}</span>
                {v.text}
              </p>
            ))}
          </motion.div>
        )}

        {/* Reflection */}
        <div className="px-5 pt-2 pb-4">
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

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-4 pb-8 bg-warm-bg border-t border-gray-100">
        {isDone ? (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-pill text-[15px] font-bold" style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
            <CheckCircle2 size={18} /> Completed today ✓
          </div>
        ) : (
          <button onClick={handleComplete}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.35)' }}>
            Done for today ✓
          </button>
        )}
      </div>

      {/* Nugget FAB */}
      <button onClick={() => setNugget(true)}
        className="fixed bottom-28 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-30"
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