'use client'

// ── src/app/plans/[id]/day/[dayNumber]/page.js ── v2
//
// KEY FIX: Verse plans now show ONLY the referenced verses, not the full chapter.
//   "John 3:16"   → shows only verse 16
//   "John 3:16-17" → shows only verses 16 and 17
//   "John 3"      → shows full chapter (chapter plans — unchanged)
//   "John 3:16 · Romans 8:28" → shows both verses (multi-verse topic day)
//
// "Read full chapter" link always visible at the bottom for users who want more context.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter }                      from 'next/navigation'
import { motion, AnimatePresence }                   from 'framer-motion'
import {
  ArrowLeft, BookOpen, Loader2, WifiOff,
  CheckCircle2, ChevronDown, Lightbulb,
} from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../../../../contexts/DarkModeContext'
import { useLocalStorage }               from '../../../../../hooks/useLocalStorage'
import { useCheckin }                    from '../../../../../hooks/useCheckin'
import { ToastContainer, showToast }     from '../../../../../components/Toast'
import {
  readPlans, writePlans, markDayComplete,
} from '../../../../../lib/plans'
import { getActiveTranslation }          from '../../../../../lib/bib-translations'
import { todayStr }                      from '../../../../../lib/constants'

// ─────────────────────────────────────────────
//  Parse verse range from a reference string.
//  Returns null for chapter-level refs (show all verses).
//  Returns { start, end } for verse refs.
//
//  "John 3:16"      → { start: 16, end: 16 }
//  "John 3:16-17"   → { start: 16, end: 17 }
//  "Psalm 23:1-6"   → { start: 1,  end: 6  }
//  "John 3"         → null  (full chapter)
//  "John 3:16 · Romans 8:28" → null (multi-ref, fetch each)
// ─────────────────────────────────────────────
function parseVerseRange(ref) {
  if (!ref) return null
  // Multi-reference (topic day: "Ref1 · Ref2")
  if (ref.includes('·') || ref.includes('–') || ref.includes('—')) return null
  const m = ref.match(/:(\d+)(?:[–\-](\d+))?/)
  if (!m) return null
  const start = parseInt(m[1])
  const end   = m[2] ? parseInt(m[2]) : start
  return { start, end }
}

// Parse a single ref into { book, chapter, verseStart, verseEnd }
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

// ─────────────────────────────────────────────
//  Confetti burst
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Single verse display
// ─────────────────────────────────────────────
function VerseDisplay({ verse, fontSize = 18, c }) {
  // Strip red-letter markers for display (they're in the plan reading context)
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

// ─────────────────────────────────────────────
//  Multi-ref loader — for topic days with "Ref1 · Ref2"
// ─────────────────────────────────────────────
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
    // Filter to specific verses if referenced
    if (parsed.verseStart) {
      const filtered = all.filter(v => v.number >= parsed.verseStart && v.number <= (parsed.verseEnd || parsed.verseStart))
      if (filtered.length) results.push({ ref: ref.trim(), verses: filtered })
    } else {
      results.push({ ref: ref.trim(), verses: all })
    }
  }
  return { groups: results }
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function DayReadingPage() {
  const { id, dayNumber } = useParams()
  const router            = useRouter()
  const dayNum            = parseInt(dayNumber)
  const { dark }          = useDarkMode()
  const c                 = getDarkModeColors(dark)

  const [plans, , hydrated] = useLocalStorage('dw_plans', [])
  const { performCheckin } = useCheckin()
  const scrollRef          = useRef(null)

  const [confetti,    setConfetti]    = useState(false)
  const [verseGroups, setVerseGroups] = useState(null)  // [{ ref, verses[] }]
  const [loading,     setLoading]     = useState(false)
  const [fetchError,  setFetchError]  = useState(null)
  const [isOffline,   setIsOffline]   = useState(false)
  const [reflection,  setReflection]  = useState('')
  const [translationId, setTid]       = useState('KJV')
  const [fontSize,    setFontSize]    = useState(18)
  const [showReflect, setShowReflect] = useState(false)

  const plan    = (plans || []).find(p => p.id === id)
  const dayData = plan?.days?.find(d => d.day === dayNum)
  const isDone  = dayData?.completedAt?.startsWith(todayStr())
  const passage = dayData?.passage || dayData?.passage_reference || ''
  const title   = dayData?.title && dayData.title !== passage ? dayData.title : null
  const focus   = dayData?.focus || null

  useEffect(() => { setTid(getActiveTranslation()) }, [])

  // ── Fetch verses ──
  const fetchVerses = useCallback(async () => {
    if (!passage) return
    setLoading(true); setFetchError(null); setIsOffline(false)

    try {
      const { getPassage } = await import('../../../../../lib/bible')

      // Multi-reference day (topic/character plans with multiple verses)
      const isMultiRef = passage.includes('·')
      if (isMultiRef) {
        const refs = passage.split('·').map(r => r.trim()).filter(Boolean)
        const result = await fetchMultiRef(refs, translationId)
        if (result.offline) { setIsOffline(true); return }
        setVerseGroups(result.groups || [])
        return
      }

      // Single reference
      const result = await getPassage(passage, translationId)
      if (result.offline) { setIsOffline(true); return }
      if (result.error)   { setFetchError(result.error); return }

      const allVerses = (result.verses || []).map(v => ({
        number: v.number ?? v.n ?? 0,
        text:   v.text   ?? v.t ?? '',
      }))

      // Filter to specific verses for verse-level plans
      const range = parseVerseRange(passage)
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

  // ── Mark done ──
  async function handleMarkDone() {
    if (isDone || !plan) return
    markDayComplete(plan.id, dayNum, reflection)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1800)
    await performCheckin({ passage, reflection }).catch(() => null)
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

  const allVerses = verseGroups?.flatMap(g => g.verses) || []
  const isVerseLevel = !!parseVerseRange(passage) && !passage.includes('·')
  const readerUrl = buildReaderUrl(passage)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: c.bg }}>
      <ToastContainer />
      {confetti && <Confetti />}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-20"
        style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: c.bgCard }}>
          <ArrowLeft size={18} style={{ color: c.text }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: c.text }}>Day {dayNum}</p>
          <p className="text-[12px] truncate" style={{ color: c.textMuted }}>{plan.name}</p>
        </div>
        {/* Font size controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => setFontSize(s => Math.max(14, s - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[14px]"
            style={{ background: c.bgCard, color: c.textMuted }}>A−</button>
          <button onClick={() => setFontSize(s => Math.min(24, s + 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[14px]"
            style={{ background: c.bgCard, color: c.textMuted }}>A+</button>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{ background: '#5B4FCF20', color: '#5B4FCF' }}>
          {translationId}
        </span>
      </div>

      {/* ── Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-40">

        {/* Passage title */}
        <div className="pt-5 pb-3">
          <p className="font-bold" style={{ fontSize: 20, color: c.text }}>{passage}</p>
          {title && <p className="text-[13px] mt-0.5 italic" style={{ color: c.textMuted }}>{title}</p>}
        </div>

        {/* Focus note (from topic/character plans) */}
        {focus && (
          <div className="mb-4 px-4 py-3 rounded-[14px] border-l-4"
            style={{ background: '#EDE9FF50', borderColor: '#5B4FCF' }}>
            <p className="text-[13px] leading-relaxed font-medium italic" style={{ color: '#5B4FCF' }}>
              {focus}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3 animate-pulse pt-2">
            {Array.from({ length: isVerseLevel ? 3 : 8 }).map((_, i) => (
              <div key={i} className="h-5 rounded-xl"
                style={{ background: c.bgCard, width: `${55 + (i % 4) * 11}%` }} />
            ))}
          </div>
        )}

        {/* Offline */}
        {isOffline && !loading && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <WifiOff size={32} style={{ color: c.textMuted }} />
            <p className="font-semibold text-[15px]" style={{ color: c.text }}>You're offline</p>
            <p className="text-[13px]" style={{ color: c.textMuted }}>
              Download this translation for offline reading.
            </p>
            <button onClick={() => router.push('/translations')}
              className="px-5 py-2.5 rounded-full font-bold text-white text-[13px]"
              style={{ background: '#5B4FCF' }}>
              Download translations
            </button>
          </div>
        )}

        {/* Error */}
        {fetchError && !loading && !isOffline && (
          <div className="py-10 text-center">
            <p className="text-[14px]" style={{ color: c.textMuted }}>Couldn't load passage</p>
            <button onClick={fetchVerses}
              className="mt-3 px-5 py-2.5 rounded-full font-bold text-white text-[13px]"
              style={{ background: '#5B4FCF' }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Verses ── */}
        {!loading && !isOffline && !fetchError && verseGroups && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {verseGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
                {/* Show reference header for multi-ref days */}
                {verseGroups.length > 1 && (
                  <p className="font-bold text-[12px] mb-2" style={{ color: '#5B4FCF' }}>
                    {group.ref}
                  </p>
                )}
                {group.verses.map((v, i) => (
                  <div key={i} className="mb-1">
                    <VerseDisplay verse={v} fontSize={fontSize} c={c} />
                  </div>
                ))}
              </div>
            ))}

            {/* Read full chapter link — always shown */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: c.border }}>
              <button onClick={() => router.push(readerUrl)}
                className="flex items-center gap-2 text-[13px] font-bold active:opacity-70"
                style={{ color: '#5B4FCF' }}>
                <BookOpen size={14} />
                Read full chapter →
              </button>
              {isVerseLevel && (
                <p className="text-[11px] mt-1" style={{ color: c.textFaint }}>
                  Opens the Bible reader for the full context
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Reflection ── */}
        <div className="mt-6">
          <button onClick={() => setShowReflect(v => !v)}
            className="flex items-center gap-2 w-full text-left py-3"
            style={{ color: c.textMuted }}>
            <ChevronDown size={15} style={{
              transform: showReflect ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
            <span className="text-[13px] font-semibold">
              {showReflect ? 'Hide' : 'Add a reflection'}
            </span>
          </button>
          <AnimatePresence>
            {showReflect && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <textarea
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  placeholder="What stood out to you today?"
                  rows={4}
                  className="w-full rounded-[14px] resize-none px-4 py-3 text-[14px] focus:outline-none"
                  style={{
                    background: c.bgInput, color: c.text,
                    border: `1.5px solid ${c.borderInput}`,
                  }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-3"
        style={{
          background:    c.bg,
          borderTop:     `1px solid ${c.border}`,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}>
        {isDone ? (
          <div className="flex items-center justify-center gap-2 py-4 rounded-full"
            style={{ background: '#E8F5EE' }}>
            <CheckCircle2 size={17} style={{ color: '#4A7C5F' }} />
            <span className="font-bold text-[15px]" style={{ color: '#4A7C5F' }}>
              Day complete ✓
            </span>
          </div>
        ) : (
          <button onClick={handleMarkDone}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-[15px] text-white active:scale-[0.97] transition-all"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            <CheckCircle2 size={16} />
            Mark as read
          </button>
        )}
      </div>
    </div>
  )
}