'use client'

// ── CharacterCompanion — Update 3 ──
// Shows the selected Bible character companion with state-based animation.
// Placeholder SVG renders when images.[state] === null.
// To swap to real images: set images.[state] = '/path/to/image.png' in lib/characters.js
// The <Image> block below is ready — just uncomment and set the src.

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import { calculateHealth, getCharacterState, getHealthLabel, getHealthColor } from '../lib/health'
import { getCharacterById } from '../lib/characters'

// ── Placeholder SVG shown until real images are provided ──
function CharacterPlaceholder({ character, state }) {
  // Animation class based on state
  const animClass = {
    radiant:    'char-bounce',
    happy:      'char-sway',
    neutral:    'char-breathe',
    quiet:      'char-breathe-slow',
    sad:        'char-droop',
    struggling: 'char-nod',
    fading:     'char-pulse-faint',
  }[state] || 'char-breathe'

  const color  = character.accentColor
  const bgRgba = `${color}26`  // 15% opacity
  const bdRgba = `${color}4D`  // 30% opacity

  return (
    // {/* TODO: Replace with <Image> when character images are ready */}
    <div
      className={`flex flex-col items-center justify-center rounded-[20px] ${animClass}`}
      style={{
        width: 200, height: 220,
        background: bgRgba,
        border: `1.5px solid ${bdRgba}`,
      }}
    >
      {/* Emoji placeholder — remove when real image is added */}
      <span style={{ fontSize: 52, lineHeight: 1 }}>{character.placeholderEmoji}</span>
      <p className="font-display font-bold mt-3 text-[15px]" style={{ color }}>
        {character.name}
      </p>
      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>{state}</p>
    </div>
  )
}

export default function CharacterCompanion({ characterId = 'david', streak = 0, daysMissed = 0, onTap }) {
  const [tooltip, setTooltip] = useState(false)

  const character = getCharacterById(characterId)
  const health    = calculateHealth(streak, daysMissed)
  const state     = getCharacterState(health)
  const label     = getHealthLabel(health)
  const barColor  = getHealthColor(health)
  const line      = character.lines[state]
  const imgSrc    = character.images[state]

  function handleTap() {
    setTooltip(true)
    setTimeout(() => setTooltip(false), 2500)
    onTap?.()
  }

  return (
    <div className="flex flex-col items-center w-full">

      {/* Character image / placeholder — tappable */}
      <div className="relative" onClick={handleTap} style={{ cursor: 'pointer' }}>
        {imgSrc ? (
          // ── REAL IMAGE (swap placeholder by setting images.[state] in characters.js) ──
          <motion.div whileTap={{ scale: 0.97 }}>
            <Image
              src={imgSrc}
              alt={`${character.name} — ${state}`}
              width={200}
              height={220}
              className="object-contain"
              priority
            />
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 0.97 }}>
            <CharacterPlaceholder character={character} state={state} />
          </motion.div>
        )}

        {/* Tap tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-2 rounded-[12px] text-white text-[12px] font-semibold shadow-lg z-10"
              style={{ background: character.accentColor, maxWidth: 220, whiteSpace: 'normal', textAlign: 'center' }}
            >
              {line}
              {/* Tooltip arrow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0"
                style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${character.accentColor}` }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current line */}
      <p className="font-display italic text-[13px] text-center mt-3 leading-snug px-2"
        style={{ color: '#1A1A2E', maxWidth: 220 }}>
        "{line}"
      </p>
      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
        — {character.name}
      </p>

      {/* Health bar */}
      <div className="w-full mt-4">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#E8E5E0' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(to right, #5B4FCF, ${barColor})` }}
            initial={{ width: 0 }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <Heart size={12} style={{ color: health > 50 ? '#5B4FCF' : '#9CA3AF' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>{character.name}</span>
          </div>
          <span className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>{label}</span>
        </div>
      </div>
    </div>
  )
}