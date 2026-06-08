'use client'

// ── src/app/plans/[id]/day/[dayNumber]/page.js — v4 ──
//
// BUG FIX: TypeError: performCheckin is not a function
//
// CAUSE: useCheckin() exports { checkIn } — not { performCheckin }.
// The destructure `const { performCheckin } = useCheckin()` silently
// returned undefined, which then threw when called at line 185.
//
// FIX: destructure `checkIn` and call that instead.
// Also aliased as `performCheckin` locally so nothing else needs changing.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter }                      from 'next/navigation'
import { motion, AnimatePresence }                   from 'framer-motion'
import {
  ArrowLeft, BookOpen, Loader2, WifiOff,
  CheckCircle2, ChevronDown,
} from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../../../../contexts/DarkModeContext'
import { useLocalStorage }               from '../../../../../hooks/useLocalStorage'
import { useCheckin }                    from '../../../../../hooks/useCheckin'
import { ToastContainer, showToast }     from '../../../../../components/Toast'
import {
  readPlans, markDayComplete,
} from '../../../../../lib/plans'
import { getActiveTranslation }          from '../../../../../lib/bib-translations'
import { todayStr }                      from '../../../../../lib/constants'

function parseVerseRange(ref) {
  if (!ref) return null
  if (ref.includes('·') || ref.includes('–') || ref.includes('—')) return null
  const m = ref.match(/:(\d+)(?:[–\-](\d+))?/)
  if (!m) return null
  return { start: parseInt(m[1]), end: m[2] ? parseInt(m[2]) : parseInt(m[1]) }
}

function parseRef(ref) {
  if (!ref) return null
  const m = ref.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:[–\-](\d+))?)?$/)
  if (!m) return null
  return {
    book:       m[1].trim(),
    chapter:    parseInt(m[2]),
    verseStart: m[3] ? parseInt(m[3]) : null,
    verseEnd:   m[4] ? parseInt(m[4]) : (m[3] ? parseInt(m[3]) : null),
  }
}

function buildReaderUrl(passage) {
  if (!passage) return '/read'
  const m = passage.match(/^(.+?)\s+(\d+)/)
  if (m) return `/read?book=${encodeURIComponent(m[1].trim())}&chapter=${m[2]}`
  return '/read'
}

function Confetti() {
  const dots = Array.from({ length: 14 }, (_, i) => ({
    x: Math.cos((i / 14) * 2 * Math.PI) * (30 + Math.random() * 60),
    y: Math.sin((i / 14) * 2 * Math.PI) * (30 + Math.random() * 60),
    color: ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#7CB9E8'][i % 5],
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {dots.map((d, i) => (
        <motion.div key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{ background: d.color }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: d.x, y: d.y, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.02 }} />
      ))}
    </div>
  )
}

function VerseDisplay({ verse, fontSize = 18, c }) {
  const text = (verse.text || '')
    .replace(/<J>(.*?)<\/J>/g, '$1')
    .replace(/\[WJ\](.*?)\[\/WJ\]/g, '$1')
    .replace(/<WJ>(.*?)<\/WJ>/g, '$1')
  return (
    <p style={{ lineHeight: 2, color: c.text, fontSize }}>
      {verse.number > 0 && (
        <sup style={{
          fontSize: 10, color: '#5B4FCF', fontWeight: 700,
          marginRight: 4, verticalAlign: 'super', lineHeight: 0,
        }}>
          {verse.number}
        </sup>
      )}
      {text}
    </p>
  )
}

async function fetchMultiRef(refs, translationId) {
  const { getPassage } = await import('../../../../../lib/bible')
  const results = []
  for (const ref of refs) {
    const parsed = parseRef(ref.trim())
    if (!parsed) continue
    const result = await getPassage(ref.trim(), translationId)
    if (result.offline) return { offline: true }
    if (result.error)   continue
    const all = (result.verses || []).map(v => ({
      number: v.number ?? v.n ?? 0,
      text:   v.text   ?? v.t ?? '',
    }))
    if (parsed.verseStart) {
      const filtered = all.filter(v =>
        v.number >= parsed.verseStart && v.number <= (parsed.verseEnd || parsed.verseStart)
      )
      if (filtered.length) results.push({ ref: ref.trim(), verses: filtered })
    } else {
      results.push({ ref: ref.trim(), verses: all })
    }
  }
  return { groups: results }
}

export default function DayReadingPage() {
  const { id, dayNumber } = useParams()
  const router            = useRouter()
  const dayNum            = parseInt(dayNumber)
  const { dark }          = useDarkMode()
  const c                 = getDarkModeColors(dark)

  const [plans, , hydrated] = useLocalStorage('dw_plans', [])

  // ── FIX: destructure `checkIn` (the actual export name), alias as performCheckin ──
  const { checkIn: performCheckin } = useCheckin()

  const scrollRef = useRef(null)

  const [confetti,      setConfetti]    = useState(false)
  const [verseGroups,   setVerseGroups] = useState(null)
  const [loading,       setLoading]     = useState(false)
  const [fetchError,    setFetchError]  = useState(null)
  const [isOffline,     setIsOffline]   = useState(false)
  const [reflection,    setReflection]  = useState('')
  const [translationId, setTid]         = useState('KJV')
  const [fontSize,      setFontSize]    = useState(18)
  const [showReflect,   setShowReflect] = useState(false)

  const plan    = (plans || []).find(p => p.id === id)
  const dayData = plan?.days?.find(d => d.day === dayNum)
  const isDone  = dayData?.completedAt?.startsWith(todayStr())
  const passage = dayData?.passage || dayData?.passage_reference || ''
  const title   = dayData?.title && dayData.title !== passage ? dayData.title : null
  const focus   = dayData?.focus || null

  useEffect(() => { setTid(getActiveTranslation()) }, [])

  const fetchVerses = useCallback(async () => {
    if (!passage) return
    setLoading(true); setFetchError(null); setIsOffline(false)
    try {
      const { getPassage } = await import('../../../../../lib/bible')
      const isMultiRef = passage.includes('·')
      if (isMultiRef) {
        const refs = passage.split('·').map(r => r.trim()).filter(Boolean)
        const result = await fetchMultiRef(refs, translationId)
        if (result.offline) { setIsOffline(true); return }
        setVerseGroups(result.groups || [])
        return
      }
      const result = await getPassage(passage, translationId)
      if (result.offline) { setIsOffline(true); return }
      if (result.error)   { setFetchError(result.error); return }
      const allVerses = (result.verses || []).map(v => ({
        number: v.number ?? v.n ?? 0,
        text:   v.text   ?? v.t ?? '',
      }))
      const range    = parseVerseRange(passage)
      const filtered = range
        ? allVerses.filter(v => v.number >= range.start && v.number <= range.end)
        : allVerses
      setVerseGroups([{ ref: passage, verses: filtered }])
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setLoading(false)
    }
  }, [passage, translationId])

  useEffect(() => { if (hydrated) fetchVerses() }, [fetchVerses, hydrated])

  async function handleMarkDone() {
    if (isDone || !plan) return

    // 1. Write to localStorage immediately
    markDayComplete(plan.id, dayNum, reflection)

    // 2. Confetti
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1800)

    // 3. Also log a check-in (non-fatal — performCheckin is now the correct `checkIn` fn)
    if (typeof performCheckin === 'function') {
      await performCheckin({ passage, reflection }).catch(() => null)
    }

    showToast('Day complete! 🎉')
    setTimeout(() => router.back(), 1200)
  }

  if (!hydrated) return null

  if (!plan || !dayData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
        <div className="text-center px-6">
          <p className="font-bold text-[16px] mb-2" style={{ color: c.text }}>Day not found</p>
          <button onClick={() => router.back()}
            className="px-5 py-2.5 rounded-full font-bold text-white text-[14px]"
            style={{ background: '#5B4FCF' }}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  const allVerses    = verseGroups?.flatMap(g => g.verses) || []
  const isVerseLevel = !parseVerseRange(passage) && !passage.includes('·')
  const readerUrl    = buildReaderUrl(passage)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: c.bg }}>
      <ToastContainer />
      {confetti && <Confetti />}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-20"
        style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: c.bgCard }}>
          <ArrowLeft size={18} style={{ color: c.text }} />
        </button>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-bold text-[15px] truncate" style={{ color: c.text }}>{title}</p>
          )}
          <p className="text-[12px] truncate" style={{ color: c.textMuted }}>
            Day {dayNum} · {passage}
          </p>
        </div>
        <button onClick={() => router.push(readerUrl)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold"
          style={{ background: c.bgCard, color: '#5B4FCF', border: `1px solid ${c.border}` }}>
          <BookOpen size={13} /> Full chapter
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-5"
        style={{ paddingBottom: 160 }}>

        {/* Focus note */}
        {focus && (
          <div className="mb-5 px-4 py-3 rounded-[14px]"
            style={{ background: c.bgCard, border: `1px solid ${c.border}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1"
              style={{ color: '#5B4FCF' }}>Today's focus</p>
            <p className="text-[13px] leading-relaxed" style={{ color: c.text }}>{focus}</p>
          </div>
        )}

        {/* Offline state */}
        {isOffline && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <WifiOff size={32} style={{ color: c.textFaint }} />
            <p className="font-bold text-[15px]" style={{ color: c.text }}>No internet connection</p>
            <p className="text-[13px]" style={{ color: c.textMuted }}>
              Download this translation in Settings to read offline.
            </p>
          </div>
        )}

        {/* Error state */}
        {fetchError && !isOffline && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-[14px]" style={{ color: c.textMuted }}>{fetchError}</p>
            <button onClick={fetchVerses}
              className="px-5 py-2.5 rounded-full font-bold text-[13px] text-white"
              style={{ background: '#5B4FCF' }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !verseGroups && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: '#5B4FCF' }} />
          </div>
        )}

        {/* Verses */}
        {verseGroups && verseGroups.map((group, gi) => (
          <div key={gi} className="mb-6">
            {verseGroups.length > 1 && (
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
                style={{ color: '#5B4FCF' }}>{group.ref}</p>
            )}
            {group.verses.map((v, vi) => (
              <VerseDisplay key={vi} verse={v} fontSize={fontSize} c={c} />
            ))}
          </div>
        ))}

        {/* Reflection */}
        {!loading && !fetchError && !isOffline && verseGroups && (
          <div className="mt-4">
            <button onClick={() => setShowReflect(v => !v)}
              className="flex items-center gap-2 text-[13px] font-bold mb-3"
              style={{ color: '#5B4FCF' }}>
              <ChevronDown size={16} style={{
                transform: showReflect ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
              {showReflect ? 'Hide reflection' : 'Add a reflection'}
            </button>
            <AnimatePresence>
              {showReflect && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="What stood out to you today?"
                    rows={4}
                    className="w-full px-4 py-3 rounded-[14px] text-[14px] leading-relaxed resize-none focus:outline-none"
                    style={{
                      background:  c.bgCard,
                      color:       c.text,
                      border:      `1px solid ${c.border}`,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA — sits above BottomNav */}
      <div className="fixed left-0 right-0 px-4 py-3 z-30"
        style={{
          bottom:     64,
          background: c.bg,
          borderTop:  `1px solid ${c.border}`,
          maxWidth:   430,
          margin:     '0 auto',
        }}>
        {isDone ? (
          <div className="flex items-center justify-center gap-2 py-4 rounded-full"
            style={{ background: '#E8F4ED' }}>
            <CheckCircle2 size={18} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[15px]" style={{ color: '#4A7C5F' }}>
              Read today ✓
            </span>
          </div>
        ) : (
          <button
            onClick={handleMarkDone}
            className="w-full py-4 rounded-full font-bold text-[15px] text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            <CheckCircle2 size={18} />
            Mark as read
          </button>
        )}
      </div>
    </div>
  )
}