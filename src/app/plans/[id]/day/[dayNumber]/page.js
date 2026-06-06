'use client'

// ── src/app/plans/[id]/day/[dayNumber]/page.js ──
// Daily reading view — v4 (bib-first).

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, CheckCircle2, X, WifiOff, BookOpen } from 'lucide-react'
import { useLocalStorage } from '../../../../../hooks/useLocalStorage'
import { useCheckin } from '../../../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../../../components/Toast'
import { markDayComplete, readPlans, writePlans } from '../../../../../lib/plans'
import { todayStr } from '../../../../../lib/constants'
import { useDarkMode, getDarkModeColors } from '../../../../../contexts/DarkModeContext'
import { getActiveTranslation } from '../../../../../lib/bib-translations'

const COLORS = ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#F9C74F','#FF6B6B']

function Confetti() {
  const pieces = Array.from({length:40},(_,i) => ({
    id:i, x:(Math.random()-.5)*300, y:Math.random()*-250+20,
    color:COLORS[i%COLORS.length], size:6+Math.random()*6,
    delay:Math.random()*.3, r:(Math.random()-.5)*680,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-sm"
          style={{left:'50%',top:'30%',width:p.size,height:p.size,background:p.color}}
          initial={{x:0,y:0,opacity:1,rotate:0}}
          animate={{x:p.x,y:p.y,opacity:0,rotate:p.r}}
          transition={{duration:1.4+Math.random()*.5,delay:p.delay,ease:'easeOut'}}/>
      ))}
    </div>
  )
}

function NuggetModal({ source, onClose, c }) {
  const [text,setText]       = useState('')
  const [,setNuggets]        = useLocalStorage('dw_nuggets',[])
  function save() {
    if (!text.trim()) return
    setNuggets(prev => [{
      id:`nug_${Date.now()}`, text:text.trim(),
      source, createdAt:new Date().toISOString(),
    },...(prev||[])])
    showToast('Nugget saved!')
    onClose()
  }
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <motion.div className="relative w-full max-w-[420px] rounded-[24px] p-5 z-10"
        style={{background:c.bgCard}}
        initial={{y:60,opacity:0}} animate={{y:0,opacity:1}}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-[16px]" style={{color:c.text}}>Save a Nugget</p>
          <button onClick={onClose}><X size={18} style={{color:c.textMuted}}/></button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="What spoke to you?" rows={3} autoFocus
          className="w-full rounded-[14px] resize-none px-4 py-3 text-[14px] focus:outline-none"
          style={{background:c.bgInput,color:c.text,border:`1.5px solid ${c.borderInput}`}}/>
        <p className="text-[11px] mt-1 mb-3" style={{color:c.textFaint}}>From: {source}</p>
        <button onClick={save}
          className="w-full py-3 rounded-[14px] font-bold text-[14px] text-white"
          style={{background:'#5B4FCF'}}>
          Save Nugget
        </button>
      </motion.div>
    </motion.div>
  )
}

function buildReaderUrl(passage) {
  if (!passage) return '/read'
  const m = passage.match(/^(.+?)\s+(\d+)/)
  if (m) return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
  const u = passage.match(/^([A-Z0-9]{2,3})\.(\d+)/)
  if (u) return `/read?book=${u[1]}&chapter=${u[2]}`
  return '/read'
}

export default function DayReadingPage() {
  const { id, dayNumber } = useParams()
  const router            = useRouter()
  const dayNum            = parseInt(dayNumber)
  const { dark }          = useDarkMode()
  const c                 = getDarkModeColors(dark)

  const [plans,setPlans]       = useLocalStorage('dw_plans',[])
  const [nuggetOpen,setNugget] = useState(false)
  const [confetti,setConfetti] = useState(false)
  const [verses,setVerses]     = useState(null)
  const [loading,setLoading]   = useState(false)
  const [fetchError,setFetchError] = useState(null)
  const [isOffline,setIsOffline]   = useState(false)
  const [reflection,setReflection] = useState('')
  const [,,hydrated]          = useLocalStorage('dw_plans',[])
  const scrollRef             = useRef(null)
  const { performCheckin }    = useCheckin()
  const [translationId,setTid]= useState('KJV')

  const plan    = (plans||[]).find(p => p.id===id)
  const dayData = plan?.days?.find(d => d.day===dayNum)
  const today   = todayStr()
  const isDone  = dayData?.completedAt?.startsWith(today)
  const readerUrl = buildReaderUrl(dayData?.passage)

  useEffect(() => { setTid(getActiveTranslation()) }, [])

  const fetchPassage = useCallback(async () => {
    if (!dayData?.passage) return
    setLoading(true); setFetchError(null); setIsOffline(false)
    try {
      const { getPassage } = await import('../../../../../lib/bible')
      const result = await getPassage(dayData.passage, translationId)
      if (result.offline) { setIsOffline(true); return }
      if (result.error)   { setFetchError(result.error); return }
      setVerses((result.verses||[]).map(v => ({
        number: v.number ?? v.n ?? 0,
        text:   v.text   ?? v.t ?? '',
      })))
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setLoading(false)
    }
  }, [dayData?.passage, translationId])

  useEffect(() => { if (hydrated) fetchPassage() }, [fetchPassage, hydrated])

  async function handleMarkDone() {
    if (isDone || !plan) return
    const updated = markDayComplete(plans, id, dayNum)
    setPlans(updated)
    writePlans(updated)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1800)
    await performCheckin({ passage:dayData?.passage||'', reflection })
    showToast('Day marked as complete! 🎉')
    setTimeout(() => router.back(), 1200)
  }

  if (!hydrated) return null
  if (!plan || !dayData) return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{background:c.bg}}>
      <p style={{color:c.textMuted}}>Day not found</p>
    </div>
  )

  return (
    <div className="min-h-[100dvh] flex flex-col relative" style={{background:c.bg}}>
      <ToastContainer/>
      {confetti && <Confetti/>}
      <AnimatePresence>
        {nuggetOpen && (
          <NuggetModal
            source={dayData.passage||`Day ${dayNum}`}
            onClose={() => setNugget(false)} c={c}/>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-20"
        style={{background:c.bg, borderBottom:`1px solid ${c.border}`}}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{background:c.bgCard}}>
          <ArrowLeft size={18} style={{color:c.text}}/>
        </button>
        <div className="flex-1">
          <p className="font-bold text-[15px]" style={{color:c.text}}>Day {dayNum}</p>
          <p className="text-[12px]" style={{color:c.textMuted}}>{plan.name}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{background:'#5B4FCF20', color:'#5B4FCF'}}>
          {translationId}
        </span>
        <button onClick={() => setNugget(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{background:c.bgCard}}>
          <Lightbulb size={17} style={{color:'#E8A838'}}/>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-40">

        {dayData.passage && (
          <div className="pt-4 pb-2">
            <p className="font-bold text-[18px]" style={{color:c.text}}>{dayData.passage}</p>
            {dayData.title && dayData.title!==dayData.passage && (
              <p className="text-[13px] mt-0.5" style={{color:c.textMuted}}>{dayData.title}</p>
            )}
          </div>
        )}

        {/* Offline */}
        {isOffline && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <WifiOff size={32} style={{color:c.textMuted}}/>
            <p className="font-semibold text-[15px]" style={{color:c.text}}>You're offline</p>
            <p className="text-[13px]" style={{color:c.textMuted}}>
              This passage isn't downloaded yet.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3 animate-pulse pt-4">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="h-4 rounded-xl"
                style={{background:c.bgCard, width:`${65+Math.random()*35}%`}}/>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && !isOffline && (
          <div className="py-8 flex flex-col items-center gap-3 text-center px-4">
            <p className="text-[14px]" style={{color:c.textMuted}}>Couldn't load passage</p>
            <button onClick={fetchPassage}
              className="px-5 py-2.5 rounded-full font-bold text-[14px] text-white"
              style={{background:'#5B4FCF'}}>
              Retry
            </button>
          </div>
        )}

        {/* Verses */}
        {!loading && !isOffline && verses?.length > 0 && (
          <motion.div key={dayData.passage}
            initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
            className="pt-2 pb-4">
            {verses.map((v,i) => (
              <button key={i} onClick={() => router.push(readerUrl)}
                className="w-full text-left mb-1 rounded-[12px] px-2 py-1 transition-all"
                style={{WebkitTapHighlightColor:'transparent'}}>
                <p style={{lineHeight:1.9, color:c.text, fontSize:17}}>
                  {v.number > 0 && (
                    <sup style={{fontSize:10,color:'#5B4FCF',fontWeight:700,
                                 marginRight:4,verticalAlign:'super',lineHeight:0}}>
                      {v.number}
                    </sup>
                  )}
                  {v.text}
                </p>
              </button>
            ))}
            <button onClick={() => router.push(readerUrl)}
              className="mt-3 flex items-center gap-2 text-[13px] font-bold"
              style={{color:'#5B4FCF'}}>
              <BookOpen size={14}/>
              Read full chapter
            </button>
          </motion.div>
        )}

        {/* Reflection */}
        <div className="pt-4 pb-4">
          <p className="font-bold text-[13px] mb-2" style={{color:c.textMuted}}>
            Your reflection
          </p>
          <textarea value={reflection} onChange={e=>setReflection(e.target.value)}
            placeholder="What stood out to you today?" rows={3}
            className="w-full rounded-[14px] resize-none px-4 py-3 text-[14px] focus:outline-none transition-all"
            style={{background:c.bgInput,color:c.text,border:`1.5px solid ${c.borderInput}`}}/>
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 py-4"
        style={{
          background:    c.bg,
          borderTop:     `1px solid ${c.border}`,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom,0px))',
        }}>
        {isDone ? (
          <div className="flex items-center justify-center gap-2 py-3" style={{color:'#4A7C5F'}}>
            <CheckCircle2 size={18}/>
            <span className="font-bold text-[15px]">Completed today!</span>
          </div>
        ) : (
          <button onClick={handleMarkDone}
            className="w-full py-4 rounded-[16px] font-bold text-[16px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{background:'linear-gradient(135deg,#5B4FCF,#7C6FE8)'}}>
            <CheckCircle2 size={18}/>
            Mark as Read
          </button>
        )}
      </div>
    </div>
  )
}