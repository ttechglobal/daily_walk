'use client'

// ── SpiritualCharacter — Update 1 ──
// Living SVG character that reflects Bible reading consistency.
// All animations via CSS keyframes in globals.css + Framer Motion for state transitions.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'

// ─── State logic ───────────────────────────────────────────
function getCharacterState(streak, daysMissed) {
  if (daysMissed >= 14) return 'fading'
  if (daysMissed >= 7)  return 'sick'
  if (daysMissed >= 5)  return 'low'
  if (daysMissed >= 3)  return 'sad'
  if (daysMissed >= 2)  return 'quiet'
  if (daysMissed >= 1)  return 'neutral'
  if (streak >= 7)      return 'radiant'
  return 'happy'
}

const STATE_LABELS = {
  radiant: 'Radiant ✦',
  happy:   'Thriving',
  neutral: 'Doing okay',
  quiet:   'A little quiet',
  sad:     'Needs care',
  low:     'Struggling',
  sick:    'Very low',
  fading:  'Fading...',
}

const CHARACTER_MESSAGES = {
  radiant: "You're shining! Keep walking with God",
  happy:   "Well done! I'm happy when you show up",
  neutral: "Miss me? Come read your Bible today",
  quiet:   "I'm getting a little lonely...",
  sad:     "Please come back. I need you",
  low:     "It's been a while. One tap is all it takes.",
  sick:    "I'm not well... please read today.",
  fading:  "I'm fading. Come back to God today.",
}

const STATE_BACKDROPS = {
  radiant: '#FFF3D4',
  happy:   '#EDE9FF',
  neutral: '#FAF8F5',
  quiet:   '#F0EDE8',
  sad:     '#E8EDF2',
  low:     '#E0DDD8',
  sick:    '#D8D5D0',
  fading:  '#ECEAE8',
}

const STATE_FILTERS = {
  radiant: 'none',
  happy:   'none',
  neutral: 'none',
  quiet:   'none',
  sad:     'saturate(0.7)',
  low:     'saturate(0.4) brightness(0.9)',
  sick:    'saturate(0.2) brightness(0.85)',
  fading:  'saturate(0) brightness(0.8) opacity(0.6)',
}

// Animation class per state
const STATE_ANIM = {
  radiant: 'char-bounce',
  happy:   'char-sway',
  neutral: 'char-breathe',
  quiet:   'char-breathe-slow',
  sad:     'char-droop',
  low:     'char-nod',
  sick:    'char-pulse-faint',
  fading:  'char-pulse-faint',
}

function getHealth(daysMissed) {
  return Math.max(0, Math.min(100, 100 - daysMissed * 14))
}

// ─── SVG Character ──────────────────────────────────────────
function CharacterSVG({ state }) {
  const isLying   = state === 'sick' || state === 'fading'
  const isLow     = state === 'low'
  const isSad     = state === 'sad'
  const isRadiant = state === 'radiant'
  const isHappy   = state === 'happy'
  const isNeutral = state === 'neutral' || state === 'quiet'

  const eyeOpenAmt = isLying ? 0 : isLow ? 0.45 : 1
  const pupilShift = state === 'quiet' ? 3 : 0

  const bodyTransform = isLying
    ? 'rotate(85 50 65) translate(4 -10)'
    : ''

  return (
    <svg viewBox="0 0 100 120" width="100" height="120" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: STATE_FILTERS[state], overflow: 'visible' }}>
      <defs>
        <filter id="char-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2.5" floodColor="#C8845A" floodOpacity="0.2"/>
        </filter>
        <filter id="char-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="skin-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F4C28A"/>
          <stop offset="60%" stopColor="#E8A870"/>
          <stop offset="100%" stopColor="#C8845A"/>
        </radialGradient>
        <radialGradient id="body-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#9080D8"/>
          <stop offset="100%" stopColor="#5B4FCF"/>
        </radialGradient>
      </defs>

      <g transform={bodyTransform}>
        {/* ── Body ── */}
        <ellipse cx="50" cy="80" rx="18" ry={isLow ? 13 : 20}
          fill="url(#body-grad)" filter="url(#char-shadow)" />
        {/* Body highlight */}
        <ellipse cx="44" cy="74" rx="7" ry={isLow ? 6 : 9} fill="#9080D8" opacity="0.5"/>

        {/* ── Arms ── */}
        {isRadiant ? (
          <>
            <line x1="33" y1="72" x2="22" y2="62" stroke="#E8A870" strokeWidth="5.5" strokeLinecap="round"/>
            <line x1="67" y1="72" x2="78" y2="62" stroke="#E8A870" strokeWidth="5.5" strokeLinecap="round"/>
            {/* Hands */}
            <circle cx="22" cy="62" r="3.5" fill="#E8A870"/>
            <circle cx="78" cy="62" r="3.5" fill="#E8A870"/>
          </>
        ) : isLow ? (
          <>
            <line x1="34" y1="80" x2="26" y2="90" stroke="#E8A870" strokeWidth="5" strokeLinecap="round"/>
            <line x1="66" y1="80" x2="74" y2="90" stroke="#E8A870" strokeWidth="5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <line x1="33" y1="74" x2="24" y2="81" stroke="#E8A870" strokeWidth="5" strokeLinecap="round"/>
            <line x1="67" y1="74" x2="76" y2="81" stroke="#E8A870" strokeWidth="5" strokeLinecap="round"/>
          </>
        )}

        {/* ── Low: implied knees ── */}
        {isLow && (
          <>
            <ellipse cx="37" cy="94" rx="9" ry="6" fill="#7C6FCD" opacity="0.7"/>
            <ellipse cx="63" cy="94" rx="9" ry="6" fill="#7C6FCD" opacity="0.7"/>
          </>
        )}

        {/* ── Head ── */}
        <ellipse cx="50" cy="45" rx="22" ry="24"
          fill="url(#skin-grad)" filter="url(#char-shadow)"/>
        {/* Head highlight blob */}
        <ellipse cx="43" cy="38" rx="10" ry="8" fill="#F4C28A" opacity="0.5"/>
        {/* Shadow side */}
        <ellipse cx="60" cy="52" rx="7" ry="9" fill="#C8845A" opacity="0.2"/>

        {/* ── Eyes ── */}
        {isLying ? (
          // Closed — curved lines
          <>
            <path d="M37 45 Q41 43 45 45" stroke="#2D1B0E" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            <path d="M55 45 Q59 43 63 45" stroke="#2D1B0E" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          </>
        ) : (
          <>
            {/* Eye whites */}
            <ellipse cx="41" cy={44 + pupilShift} rx="6.5" ry={6.5 * eyeOpenAmt + 0.4} fill="white"/>
            <ellipse cx="59" cy={44 + pupilShift} rx="6.5" ry={6.5 * eyeOpenAmt + 0.4} fill="white"/>
            {/* Irises */}
            <ellipse cx="41" cy={44 + pupilShift} rx="4" ry={Math.min(4, 4 * eyeOpenAmt + 0.3)} fill="#2D1B0E"/>
            <ellipse cx="59" cy={44 + pupilShift} rx="4" ry={Math.min(4, 4 * eyeOpenAmt + 0.3)} fill="#2D1B0E"/>
            {/* Highlights */}
            <circle cx="43" cy={42 + pupilShift} r="1.4" fill="white"/>
            <circle cx="61" cy={42 + pupilShift} r="1.4" fill="white"/>
            {/* Happy eye arcs */}
            {(isHappy || isRadiant) && (
              <>
                <path d="M35 40 Q41 36 47 40" stroke="#C8845A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
                <path d="M53 40 Q59 36 65 40" stroke="#C8845A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
              </>
            )}
            {/* Half-lid top for 'low' */}
            {isLow && (
              <>
                <ellipse cx="41" cy={44 + pupilShift - 3} rx="6.5" ry="3" fill="#E8A870" opacity="0.9"/>
                <ellipse cx="59" cy={44 + pupilShift - 3} rx="6.5" ry="3" fill="#E8A870" opacity="0.9"/>
              </>
            )}
          </>
        )}

        {/* ── Sad eyebrows ── */}
        {isSad && (
          <>
            <line x1="36" y1="36" x2="44" y2="33" stroke="#8B6040" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="56" y1="33" x2="64" y2="36" stroke="#8B6040" strokeWidth="2.2" strokeLinecap="round"/>
          </>
        )}

        {/* ── Mouth ── */}
        {!isLying && (
          isRadiant || isHappy ? (
            <path d="M40 56 Q50 63 60 56" stroke="#8B5E3C" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
          ) : isNeutral ? (
            <line x1="43" y1="57" x2="57" y2="57" stroke="#8B5E3C" strokeWidth="2.2" strokeLinecap="round"/>
          ) : (
            // Sad/low/fading — downturned
            <path d="M40 58 Q50 54 60 58" stroke="#8B5E3C" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          )
        )}

        {/* ── Sad teardrop ── */}
        {isSad && (
          <ellipse cx="38" cy="61" rx="1.8" ry="2.5" fill="#A8C4E0" opacity="0.7"/>
        )}
      </g>

      {/* ── Fading cross ── */}
      {state === 'fading' && (
        <g style={{ animation: 'cross-pulse 2s ease-in-out infinite' }} opacity="0.4">
          <line x1="48" y1="6" x2="52" y2="18" stroke="#9B9B9B" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="44" y1="10" x2="56" y2="10" stroke="#9B9B9B" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      )}

      {/* ── ZZZ for sick ── */}
      {state === 'sick' && (
        <>
          {[0, 1, 2].map(i => (
            <text key={i} x={68 + i * 4} y={30 - i * 8} fill="#9B9B9B" fontSize="8" fontWeight="bold"
              style={{ animation: `zzz-float 2.4s ${i * 0.7}s ease-out infinite`, opacity: 0 }}>
              z
            </text>
          ))}
        </>
      )}
    </svg>
  )
}

// ─── Sparkle orbits for radiant ────────────────────────────
function SparkleOrbits() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {[0, 90, 180, 270].map((deg, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: '50%', left: '50%',
            marginTop: -3, marginLeft: -3,
            animation: `char-orbit ${3 + i * 0.4}s linear infinite`,
            animationDelay: `${i * -0.7}s`,
          }}
        >
          <div style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: '#E8A838',
            opacity: 0.8,
            boxShadow: '0 0 4px #E8A838',
          }}/>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────
export default function SpiritualCharacter({ streak = 0, daysMissed = 0 }) {
  const [tooltip, setTooltip] = useState(false)
  const state   = getCharacterState(streak, daysMissed)
  const health  = getHealth(daysMissed)
  const backdrop = STATE_BACKDROPS[state]

  const healthColor = health > 60 ? '#5B4FCF' : health > 30 ? '#E8A838' : '#9B8B8B'

  function handleTap() {
    setTooltip(true)
    setTimeout(() => setTooltip(false), 2500)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Character card ── */}
      <div
        className="relative flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          background: backdrop,
          borderRadius: 20,
          padding: '20px 0 16px',
          minHeight: 160,
          transition: 'background 0.8s ease',
          overflow: 'hidden',
        }}
        onClick={handleTap}
      >
        {/* Sparkle orbits for radiant */}
        {state === 'radiant' && <SparkleOrbits />}

        {/* Animated character */}
        <motion.div
          key={state}
          className={`relative z-10 ${STATE_ANIM[state]}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.34, 1.26, 0.64, 1] }}
        >
          <CharacterSVG state={state} />
        </motion.div>

        {/* Fading caption */}
        {state === 'fading' && (
          <p className="font-display italic text-[12px] mt-2 z-10 relative"
            style={{ color: '#9B9B9B' }}>
            Come back... I'm waiting for you.
          </p>
        )}

        {/* Tap tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.92 }}
              transition={{ duration: 0.22 }}
              className="absolute z-20 px-3 py-2 rounded-2xl text-[12px] font-semibold text-white shadow-lg pointer-events-none"
              style={{
                top: 12,
                background: 'rgba(26,26,46,0.85)',
                backdropFilter: 'blur(6px)',
                maxWidth: 200,
                textAlign: 'center',
              }}
            >
              {CHARACTER_MESSAGES[state]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Spiritual health bar ── */}
      <div className="flex items-center gap-2">
        <Heart size={13} style={{ color: healthColor, flexShrink: 0 }}
          fill={health > 60 ? healthColor : 'none'} />
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#E8E5E0' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, #5B4FCF, #E8A838)`,
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[11px] font-semibold flex-shrink-0"
          style={{ color: healthColor, minWidth: 72, textAlign: 'right' }}>
          {STATE_LABELS[state]}
        </span>
      </div>
    </div>
  )
}