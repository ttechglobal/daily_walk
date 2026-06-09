'use client'

// ── src/components/ReflectionOverlay.js ──
// Full-screen meditation timer shown after a user marks a reading day complete.
//
// BEHAVIOUR:
//   • Timer duration escalates with completed sessions:
//       Sessions 0-1  →  30s
//       Sessions 2-5  →  60s
//       Sessions 6+   →  90s
//   • Timer pauses when tab/app loses visibility (Page Visibility API).
//   • Timer resumes when tab/app regains visibility.
//   • "Complete" button is locked until the countdown reaches 0.
//   • Optional reflection note (saved to localStorage under key dw_reflection_{planId}_{day}).
//   • On complete: calls onComplete(noteText) so parent can finalise the mark-done.
//   • On skip: calls onSkip() — available immediately, no timer gate.
//
// STORAGE KEY:  dw_reflection_sessions  →  integer count of completed sessions

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Pen, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../lib/theme'

// ─────────────────────────────────────────────
//  Session counter helpers
// ─────────────────────────────────────────────
const SESSION_KEY = 'dw_reflection_sessions'

function getSessionCount() {
  try { return parseInt(localStorage.getItem(SESSION_KEY) || '0', 10) } catch { return 0 }
}

function incrementSessionCount() {
  try { localStorage.setItem(SESSION_KEY, String(getSessionCount() + 1)) } catch {}
}

function getDurationForSessions(count) {
  if (count < 2) return 30
  if (count < 6) return 60
  return 90
}

// ─────────────────────────────────────────────
//  Reflection note persistence
// ─────────────────────────────────────────────
function reflectionKey(planId, day) {
  return `dw_reflection_${planId}_${day}`
}

function loadReflectionNote(planId, day) {
  try { return localStorage.getItem(reflectionKey(planId, day)) || '' } catch { return '' }
}

function saveReflectionNote(planId, day, text) {
  try { localStorage.setItem(reflectionKey(planId, day), text) } catch {}
}

// ─────────────────────────────────────────────
//  Circular SVG countdown ring
// ─────────────────────────────────────────────
function CountdownRing({ timeLeft, totalTime, dark }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = timeLeft / totalTime
  const strokeDashoffset = circumference * (1 - progress)

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const label = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : String(seconds)

  const ringColor = timeLeft === 0 ? '#4A7C5F' : '#5B4FCF'
  const trackColor = dark ? '#252840' : '#EDE9FF'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth="6"
        />
        {/* Progress arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      {/* Time label in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums"
          style={{
            fontSize: timeLeft === 0 ? 26 : 32,
            color: timeLeft === 0 ? '#4A7C5F' : (dark ? '#EAE6DE' : '#1A1A2E'),
            lineHeight: 1,
            transition: 'font-size 0.3s ease, color 0.4s ease',
          }}
        >
          {timeLeft === 0 ? '✓' : label}
        </span>
        {timeLeft > 0 && (
          <span style={{ fontSize: 11, color: dark ? '#8A8FA8' : '#9CA3AF', marginTop: 2 }}>
            {minutes > 0 ? 'min' : 'sec'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Prompt cycling — gentle reflection prompts
// ─────────────────────────────────────────────
const PROMPTS = [
  'What one word from this passage stays with you?',
  'How does what you read connect to your life right now?',
  'Is there a promise here to hold onto?',
  'What is God saying to you through this passage?',
  'Is there something here you need to act on?',
  'What surprised you in what you just read?',
  'What would it look like to live out what you read today?',
]

function getPromptForDay(planId, day) {
  const hash = (planId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) + (day || 0)
  return PROMPTS[hash % PROMPTS.length]
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function ReflectionOverlay({
  isOpen,
  planId,
  day,
  passageRef,   // e.g. "John 3:16-21"
  onComplete,   // (noteText: string) => void  — called when user taps Complete
  onSkip,       // () => void                  — called when user taps Skip
}) {
  const { t, dark } = useTheme()

  // Timer state
  const [totalTime,  setTotalTime]  = useState(30)
  const [timeLeft,   setTimeLeft]   = useState(30)
  const [running,    setRunning]    = useState(false)
  const [done,       setDone]       = useState(false)

  // Note state
  const [showNote,   setShowNote]   = useState(false)
  const [noteText,   setNoteText]   = useState('')

  // Pause tracking
  const intervalRef  = useRef(null)
  const pausedRef    = useRef(false)

  // ── Initialise timer when overlay opens ──
  useEffect(() => {
    if (!isOpen) return
    const sessions = getSessionCount()
    const duration = getDurationForSessions(sessions)
    setTotalTime(duration)
    setTimeLeft(duration)
    setRunning(true)
    setDone(false)
    setShowNote(false)
    setNoteText(loadReflectionNote(planId, day))
  }, [isOpen, planId, day])

  // ── Tick interval ──
  useEffect(() => {
    if (!running || done) return
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, done])

  // ── Page Visibility API — pause/resume on tab switch or phone lock ──
  useEffect(() => {
    if (!isOpen) return
    function handleVisibility() {
      pausedRef.current = document.visibilityState === 'hidden'
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isOpen])

  // ── Auto-save note while typing ──
  const handleNoteChange = useCallback((e) => {
    const val = e.target.value
    setNoteText(val)
    saveReflectionNote(planId, day, val)
  }, [planId, day])

  // ── Complete handler ──
  function handleComplete() {
    if (!done) return
    incrementSessionCount()
    onComplete?.(noteText)
  }

  // ── Skip handler ──
  function handleSkip() {
    clearInterval(intervalRef.current)
    onSkip?.()
  }

  if (!isOpen) return null

  const prompt = getPromptForDay(planId, day)
  const nextDuration = getDurationForSessions(getSessionCount() + 1)
  const showNextHint = done && nextDuration > totalTime

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="reflection-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[150]"
            style={{ background: dark ? 'rgba(0,0,0,0.88)' : 'rgba(15,11,40,0.82)' }}
          />

          {/* Panel */}
          <motion.div
            key="reflection-panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed inset-0 z-[160] flex flex-col"
            style={{
              background: dark ? '#0F0F1A' : '#FFFFFF',
              overflowY: 'auto',
            }}
          >
            {/* Skip button — top right, always accessible */}
            <div className="flex justify-end px-5 pt-5 pb-0 flex-shrink-0">
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  background: dark ? '#252840' : '#F0EDE8',
                  color: dark ? '#8A8FA8' : '#9CA3AF',
                }}
              >
                <X size={12} />
                Skip
              </button>
            </div>

            {/* Content — vertically centred in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-6">

              {/* Passage pill */}
              {passageRef && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: dark ? '#1E1A3C' : '#EDE9FF',
                    border: `1px solid ${dark ? '#3D3580' : '#C4B8F8'}`,
                  }}
                >
                  <BookOpen size={13} style={{ color: '#5B4FCF' }} />
                  <span className="text-[13px] font-semibold" style={{ color: '#5B4FCF' }}>
                    {passageRef}
                  </span>
                </motion.div>
              )}

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h1
                  className="font-bold leading-tight mb-2"
                  style={{
                    fontSize: 26,
                    color: dark ? '#EAE6DE' : '#1A1A2E',
                    fontFamily: 'Lora, serif',
                  }}
                >
                  Reflect on what you read
                </h1>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: dark ? '#8A8FA8' : '#6B7280', maxWidth: 280 }}
                >
                  Sit with the Word for a moment before moving on.
                </p>
              </motion.div>

              {/* Countdown ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 280, damping: 22 }}
              >
                <CountdownRing timeLeft={timeLeft} totalTime={totalTime} dark={dark} />
              </motion.div>

              {/* Reflection prompt */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center px-4 py-3 rounded-[16px] w-full max-w-[320px]"
                style={{
                  background: dark ? '#1A1A2E' : '#F8F7FF',
                  border: `1px solid ${dark ? '#252840' : '#E8E4FF'}`,
                }}
              >
                <p
                  className="text-[14px] leading-relaxed italic"
                  style={{ color: dark ? '#A0A5C0' : '#5B4FCF' }}
                >
                  "{prompt}"
                </p>
              </motion.div>

              {/* Note toggle + textarea */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="w-full max-w-[360px]"
              >
                <button
                  onClick={() => setShowNote(v => !v)}
                  className="flex items-center gap-2 text-[13px] font-semibold mb-2"
                  style={{ color: dark ? '#8A8FA8' : '#9CA3AF' }}
                >
                  <Pen size={13} />
                  {showNote ? 'Hide note' : 'Add a reflection note (optional)'}
                </button>

                <AnimatePresence>
                  {showNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <textarea
                        value={noteText}
                        onChange={handleNoteChange}
                        placeholder="What stood out to you? What is God saying through this passage?"
                        rows={4}
                        className="w-full rounded-[14px] px-4 py-3 text-[14px] resize-none focus:outline-none"
                        style={{
                          background: dark ? '#1A1A2E' : '#FFFFFF',
                          border: `1px solid ${dark ? '#2E3258' : '#E5E7EB'}`,
                          color: dark ? '#EAE6DE' : '#1A1A2E',
                          lineHeight: 1.6,
                        }}
                        autoFocus
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Next duration hint */}
              <AnimatePresence>
                {showNextHint && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[12px] text-center"
                    style={{ color: dark ? '#555A72' : '#9CA3AF' }}
                  >
                    Next session: {nextDuration}s — building the habit 🌱
                  </motion.p>
                )}
              </AnimatePresence>

            </div>

            {/* Complete button — fixed to bottom */}
            <div
              className="flex-shrink-0 px-5 pb-8 pt-3"
              style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' }}
            >
              <motion.button
                onClick={handleComplete}
                disabled={!done}
                whileTap={done ? { scale: 0.97 } : {}}
                className="w-full py-4 rounded-full font-bold text-[16px] text-white flex items-center justify-center gap-2"
                style={{
                  background: done
                    ? 'linear-gradient(135deg, #4A7C5F, #3A6249)'
                    : (dark ? '#1E2035' : '#E8E4F0'),
                  color: done ? '#FFFFFF' : (dark ? '#50546A' : '#B8B4CC'),
                  transition: 'background 0.4s ease, color 0.4s ease',
                  cursor: done ? 'pointer' : 'default',
                }}
              >
                {done ? (
                  <>
                    <CheckCircle2 size={18} />
                    Complete day
                  </>
                ) : (
                  `Reflect for ${timeLeft}s more`
                )}
              </motion.button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}