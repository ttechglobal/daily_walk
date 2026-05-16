'use client'

// ── src/components/CharacterPicker.js ──
// Polished companion picker — used in onboarding + profile settings.
// Shows the character's real SVG image (happy state).
// If the SVG isn't available yet, renders a full illustrated SVG avatar — never a plain emoji.
// Each character has a unique illustrated fallback that matches their personality.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { CHARACTERS } from '../lib/characters'
import { getImagePath } from '../lib/character-state'

// ─────────────────────────────────────────────
//  Illustrated SVG fallbacks — one per character
//  These render when the real character SVG is missing.
//  Each is visually distinct, warm, and on-brand.
// ─────────────────────────────────────────────

const CHARACTER_ILLUSTRATIONS = {
  david: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="bg-david" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skin-d" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F4C28A" />
          <stop offset="100%" stopColor="#D4944A" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <ellipse cx="60" cy="70" rx="48" ry="54" fill="url(#bg-david)" />
      {/* Crown */}
      <path d="M36 44 L42 33 L50 40 L60 29 L70 40 L78 33 L84 44 Z" fill={color} opacity="0.9" />
      <circle cx="60" cy="28" r="4" fill={color} />
      <circle cx="42" cy="33" r="3" fill={color} opacity="0.8" />
      <circle cx="78" cy="33" r="3" fill={color} opacity="0.8" />
      {/* Crown gems */}
      <circle cx="60" cy="38" r="2.5" fill="white" opacity="0.7" />
      {/* Robe */}
      <path d="M32 100 Q30 130 60 132 Q90 130 88 100 L80 88 Q70 95 60 95 Q50 95 40 88 Z" fill={color} opacity="0.8" />
      <path d="M36 100 Q34 126 60 128 Q86 126 84 100 L80 92 Q70 98 60 98 Q50 98 40 92 Z" fill={color} opacity="0.5" />
      {/* Body */}
      <ellipse cx="60" cy="94" rx="20" ry="12" fill={color} opacity="0.9" />
      {/* Neck */}
      <rect x="54" y="74" width="12" height="12" rx="6" fill="url(#skin-d)" />
      {/* Head */}
      <ellipse cx="60" cy="64" rx="20" ry="22" fill="url(#skin-d)" />
      {/* Hair */}
      <path d="M40 60 Q40 40 60 40 Q80 40 80 60 Q78 48 60 47 Q42 48 40 60 Z" fill="#6B3A1F" />
      {/* Eyes */}
      <ellipse cx="53" cy="62" rx="3.5" ry="4" fill="white" />
      <ellipse cx="67" cy="62" rx="3.5" ry="4" fill="white" />
      <circle cx="54" cy="63" r="2.5" fill="#3D2008" />
      <circle cx="68" cy="63" r="2.5" fill="#3D2008" />
      <circle cx="55" cy="62" r="1" fill="white" />
      <circle cx="69" cy="62" r="1" fill="white" />
      {/* Smile */}
      <path d="M53 71 Q60 77 67 71" stroke="#C47020" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Harp strings hint */}
      <path d="M22 85 Q18 100 22 115" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M22 88 L35 92" stroke={color} strokeWidth="1" opacity="0.4" />
      <path d="M22 94 L35 97" stroke={color} strokeWidth="1" opacity="0.4" />
      <path d="M22 100 L35 102" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* Sparkles */}
      <circle cx="95" cy="45" r="2" fill={color} opacity="0.6" />
      <circle cx="98" cy="52" r="1.2" fill={color} opacity="0.4" />
      <circle cx="22" cy="50" r="1.5" fill={color} opacity="0.5" />
    </svg>
  ),

  daniel: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="bg-dan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skin-dan" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#C8855A" />
          <stop offset="100%" stopColor="#A05A30" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill="url(#bg-dan)" />
      {/* Robe */}
      <path d="M32 95 Q28 132 60 134 Q92 132 88 95 L82 85 Q70 94 60 94 Q50 94 38 85 Z" fill={color} opacity="0.85" />
      {/* Belt / detail */}
      <rect x="40" y="90" width="40" height="6" rx="3" fill="white" opacity="0.3" />
      {/* Neck */}
      <rect x="54" y="74" width="12" height="12" rx="6" fill="url(#skin-dan)" />
      {/* Body */}
      <ellipse cx="60" cy="92" rx="22" ry="11" fill={color} />
      {/* Head */}
      <ellipse cx="60" cy="63" rx="21" ry="23" fill="url(#skin-dan)" />
      {/* Hair */}
      <path d="M39 58 Q39 38 60 38 Q81 38 81 58 Q79 46 60 46 Q41 46 39 58 Z" fill="#2C1A08" />
      {/* Beard */}
      <path d="M46 73 Q60 82 74 73 Q70 86 60 87 Q50 86 46 73 Z" fill="#2C1A08" opacity="0.8" />
      {/* Eyes — determined expression */}
      <ellipse cx="53" cy="61" rx="3.5" ry="3.5" fill="white" />
      <ellipse cx="67" cy="61" rx="3.5" ry="3.5" fill="white" />
      <circle cx="54" cy="62" r="2.5" fill="#1A0A00" />
      <circle cx="68" cy="62" r="2.5" fill="#1A0A00" />
      <circle cx="55" cy="61" r="1" fill="white" />
      <circle cx="69" cy="61" r="1" fill="white" />
      {/* Steady smile */}
      <path d="M54 70 Q60 74 66 70" stroke="#7A3A10" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Lion silhouette hint at feet */}
      <ellipse cx="30" cy="128" rx="12" ry="7" fill={color} opacity="0.25" />
      <ellipse cx="90" cy="128" rx="12" ry="7" fill={color} opacity="0.25" />
      {/* Stars / dots — resolve + faith */}
      <circle cx="92" cy="44" r="2" fill={color} opacity="0.6" />
      <circle cx="96" cy="51" r="1.5" fill={color} opacity="0.4" />
      <circle cx="20" cy="52" r="1.5" fill={color} opacity="0.5" />
    </svg>
  ),

  esther: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="bg-est" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skin-est" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F0C89A" />
          <stop offset="100%" stopColor="#D4934A" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill="url(#bg-est)" />
      {/* Royal dress */}
      <path d="M28 96 Q24 134 60 136 Q96 134 92 96 L85 84 Q72 96 60 96 Q48 96 35 84 Z" fill={color} opacity="0.85" />
      {/* Dress shine */}
      <path d="M34 100 Q32 128 60 130 Q88 128 86 100 L82 92 Q70 101 60 101 Q50 101 38 92 Z" fill="white" opacity="0.12" />
      {/* Tiara */}
      <path d="M44 40 L48 32 L56 38 L60 28 L64 38 L72 32 L76 40" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="27" r="3.5" fill={color} />
      <circle cx="48" cy="32" r="2.5" fill={color} opacity="0.8" />
      <circle cx="72" cy="32" r="2.5" fill={color} opacity="0.8" />
      {/* Veil / hair */}
      <path d="M36 57 Q34 40 60 38 Q86 40 84 57 Q82 44 60 44 Q38 44 36 57 Z" fill="#5C2D09" />
      {/* Long hair sides */}
      <path d="M38 60 Q30 80 34 100" stroke="#5C2D09" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M82 60 Q90 80 86 100" stroke="#5C2D09" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Neck */}
      <rect x="54" y="75" width="12" height="10" rx="5" fill="url(#skin-est)" />
      {/* Head */}
      <ellipse cx="60" cy="62" rx="20" ry="22" fill="url(#skin-est)" />
      {/* Eyes — gentle, confident */}
      <ellipse cx="53" cy="61" rx="3.5" ry="3.8" fill="white" />
      <ellipse cx="67" cy="61" rx="3.5" ry="3.8" fill="white" />
      <circle cx="54" cy="62" r="2.6" fill="#3D1800" />
      <circle cx="68" cy="62" r="2.6" fill="#3D1800" />
      <circle cx="55" cy="61" r="1" fill="white" />
      <circle cx="69" cy="61" r="1" fill="white" />
      {/* Lashes */}
      <line x1="50" y1="57.5" x2="51" y2="55" stroke="#3D1800" strokeWidth="1" />
      <line x1="53" y1="57" x2="53" y2="54.5" stroke="#3D1800" strokeWidth="1" />
      <line x1="64" y1="57" x2="64" y2="54.5" stroke="#3D1800" strokeWidth="1" />
      <line x1="67" y1="57.5" x2="68" y2="55" stroke="#3D1800" strokeWidth="1" />
      {/* Warm smile */}
      <path d="M53 70 Q60 77 67 70" stroke="#C47040" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Necklace */}
      <path d="M50 82 Q60 87 70 82" stroke={color} strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="60" cy="86" r="2.5" fill={color} opacity="0.8" />
      {/* Petals / flowers */}
      <circle cx="20" cy="65" r="3" fill={color} opacity="0.3" />
      <circle cx="18" cy="58" r="2" fill={color} opacity="0.2" />
      <circle cx="100" cy="62" r="3" fill={color} opacity="0.3" />
    </svg>
  ),

  paul: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="bg-paul" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skin-paul" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#E8AA70" />
          <stop offset="100%" stopColor="#B87040" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill="url(#bg-paul)" />
      {/* Robe — traveller's cloak */}
      <path d="M30 92 Q26 132 60 134 Q94 132 90 92 L83 82 Q70 92 60 92 Q50 92 37 82 Z" fill={color} opacity="0.8" />
      {/* Cloak inner */}
      <path d="M36 96 Q34 128 60 130 Q86 128 84 96" fill="white" opacity="0.1" />
      {/* Travel bag hint */}
      <rect x="82" y="100" width="14" height="18" rx="4" fill={color} opacity="0.5" />
      {/* Neck */}
      <rect x="54" y="74" width="12" height="11" rx="5.5" fill="url(#skin-paul)" />
      {/* Body */}
      <ellipse cx="60" cy="90" rx="23" ry="11" fill={color} opacity="0.9" />
      {/* Head — slightly older, broader */}
      <ellipse cx="60" cy="62" rx="22" ry="23" fill="url(#skin-paul)" />
      {/* Thinning hair / bald top */}
      <path d="M38 55 Q38 40 60 40 Q82 40 82 55 Q80 45 60 44 Q40 45 38 55 Z" fill="#3A2010" />
      {/* Beard — full, apostolic */}
      <path d="M44 72 Q60 86 76 72 Q72 92 60 94 Q48 92 44 72 Z" fill="#3A2010" opacity="0.85" />
      {/* Moustache */}
      <path d="M50 68 Q60 72 70 68" stroke="#3A2010" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Eyes — intense, focused */}
      <ellipse cx="53" cy="59" rx="3.5" ry="3.8" fill="white" />
      <ellipse cx="67" cy="59" rx="3.5" ry="3.8" fill="white" />
      <circle cx="54" cy="60" r="2.8" fill="#1A0800" />
      <circle cx="68" cy="60" r="2.8" fill="#1A0800" />
      <circle cx="55" cy="59" r="1" fill="white" />
      <circle cx="69" cy="59" r="1" fill="white" />
      {/* Brow lines — earnest expression */}
      <path d="M49 55 Q53 53 57 55" stroke="#3A2010" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M63 55 Q67 53 71 55" stroke="#3A2010" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Scroll in hand */}
      <rect x="16" y="88" width="16" height="22" rx="3" fill="white" opacity="0.9" />
      <rect x="14" y="86" width="6" height="26" rx="3" fill={color} opacity="0.8" />
      <rect x="26" y="86" width="6" height="26" rx="3" fill={color} opacity="0.8" />
      <line x1="19" y1="94" x2="29" y2="94" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="19" y1="98" x2="29" y2="98" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="19" y1="102" x2="29" y2="102" stroke={color} strokeWidth="1" opacity="0.5" />
      {/* Light rays — road to Damascus echo */}
      <line x1="95" y1="35" x2="105" y2="25" stroke={color} strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="98" y1="42" x2="110" y2="38" stroke={color} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <line x1="94" y1="50" x2="106" y2="50" stroke={color} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    </svg>
  ),
}

// Fallback for any character id not in the map
const DEFAULT_ILLUSTRATION = (color, emoji = '✦') => (
  <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <defs>
      <radialGradient id="bg-def" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="70" rx="48" ry="54" fill="url(#bg-def)" />
    <text x="60" y="80" textAnchor="middle" style={{ fontSize: 52 }}>{emoji}</text>
  </svg>
)

// ─────────────────────────────────────────────
//  Character card — within the picker grid
// ─────────────────────────────────────────────
function CharacterCard({ character, selected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const color    = character.accentColor
  const imageSrc = getImagePath(character.id, 'happy')

  // Get the illustrated SVG fallback for this character
  const IllustrationFn = CHARACTER_ILLUSTRATIONS[character.id] || (() => DEFAULT_ILLUSTRATION(color, character.placeholderEmoji))

  return (
    <motion.button
      onClick={() => onSelect(character.id)}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-0 rounded-[22px] overflow-hidden relative transition-all text-left"
      style={{
        background:  selected ? `${color}12` : 'white',
        border:      `2px solid ${selected ? color : '#F0EDE8'}`,
        boxShadow:   selected
          ? `0 0 0 3px ${color}28, 0 6px 20px rgba(0,0,0,0.09)`
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Selected badge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center z-20"
            style={{ background: color }}
          >
            <Check size={12} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character image area */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ height: 130, background: `${color}10` }}
      >
        {/* Real SVG image — displayed if it loads */}
        {!imgFailed && (
          <img
            src={imageSrc}
            alt={character.name}
            onLoad={e => { e.currentTarget.style.opacity = '1'; setImgLoaded(true) }}
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              opacity: 0,
              transition: 'opacity 0.35s ease',
              padding: '8px',
            }}
          />
        )}

        {/* Illustrated fallback — shown until real image loads, or if it fails */}
        {(!imgLoaded || imgFailed) && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: imgLoaded ? 0 : 1, transition: 'opacity 0.3s ease' }}
          >
            <IllustrationFn {...{ 0: color }}>{color}</IllustrationFn>
            {/* Passing color is done via closure in the map above */}
          </div>
        )}

        {/* Soft gradient at the bottom of image area */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 z-10"
          style={{ background: `linear-gradient(to bottom, transparent, ${selected ? color + '18' : 'white'}20)` }}
        />
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3 w-full">
        <p
          className="font-display font-bold text-[14px] text-center"
          style={{ color: '#1A1A2E' }}
        >
          {character.name}
        </p>
        <p
          className="text-[11px] font-bold text-center mt-0.5"
          style={{ color }}
        >
          {character.title}
        </p>
        <p
          className="text-[10px] mt-1.5 text-center leading-snug line-clamp-2 italic"
          style={{ color: '#9CA3AF' }}
        >
          "{character.signatureVerse}"
        </p>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────
//  Exported CharacterPicker sheet
// ─────────────────────────────────────────────
export default function CharacterPicker({ currentId = 'david', onConfirm, onClose }) {
  const [selected, setSelected] = useState(currentId)
  const selectedChar = CHARACTERS.find(c => c.id === selected) || CHARACTERS[0]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/45 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '90dvh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 flex-shrink-0">
          <div>
            <p className="font-display font-bold text-[22px]" style={{ color: '#1A1A2E' }}>
              Choose your companion
            </p>
            <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: '#6B7280' }}>
              They'll walk with you and reflect your spiritual health
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ml-4"
          >
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Character grid */}
        <div className="overflow-y-auto flex-1 px-4 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.map(c => (
              <CharacterCard
                key={c.id}
                character={c}
                selected={selected === c.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-10 pt-3 border-t flex-shrink-0" style={{ borderColor: '#F0EDE8' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onConfirm?.(selected)}
            className="w-full text-white rounded-full py-4 text-[15px] font-bold transition-all"
            style={{ background: selectedChar.accentColor }}
          >
            Walk with {selectedChar.name} →
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}