'use client'

// ── CharacterCompanion — Update 1: unified character + check-in card ──
// The character IS the emotional centrepiece. Card merges with check-in.
// Message is large, readable, never truncated. Mood tints the background.
// Celebrating state shows confetti burst + joy animation.

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, CheckCircle2, Flame } from 'lucide-react'
import { calculateHealth } from '../lib/health'
import { getCharacterById } from '../lib/characters'
import {
  getCharacterMood,
  MOOD_TO_STATE,
  HEALTH_LABELS,
  checkAndMarkFirstOpenToday,
} from '../lib/character-state'

// Mood → background tint
const MOOD_BACKGROUNDS = {
  celebrating:  '#FFF8E7',
  welcoming:    '#F0EEFF',
  gentle_nudge: '#F5F5F5',
  missing_you:  '#EFF6FF',
  concerned:    '#F0F7FF',
  waiting:      '#F7F7F7',
}

// ── Confetti burst (celebrating state) ──
const CONFETTI_COLORS = ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#F9C74F','#FF6B6B']
function ConfettiBurst() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x:  (Math.random() - 0.5) * 240,
    y:  Math.random() * -180 + 20,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 5,
    delay: Math.random() * 0.3,
    r: (Math.random() - 0.5) * 540,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-sm"
          style={{ left:'50%', top:'40%', width:p.size, height:p.size, background:p.color }}
          initial={{ x:0, y:0, opacity:1, rotate:0 }}
          animate={{ x:p.x, y:p.y, opacity:0, rotate:p.r }}
          transition={{ duration:1.2+Math.random()*0.5, delay:p.delay, ease:'easeOut' }}
        />
      ))}
    </div>
  )
}

// ── Character placeholder ──
function CharacterPlaceholder({ character, state }) {
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
  return (
    // TODO: Replace with <Image> when character images are ready:
    // <Image src={character.images[state]} alt={`${character.name}`} width={200} height={200} className="object-contain" priority />
    <div className={`flex flex-col items-center justify-center rounded-[24px] ${animClass}`}
      style={{ width:200, height:200, background:`${color}20`, border:`1.5px solid ${color}40` }}>
      <span style={{ fontSize:56, lineHeight:1, marginBottom:8 }}>{character.placeholderEmoji}</span>
      <p className="font-display font-bold text-[15px]" style={{ color }}>{character.name}</p>
      <p className="text-[10px] mt-0.5 font-semibold" style={{ color:`${color}80` }}>{state}</p>
    </div>
  )
}

// ── Health bar ──
function HealthBar({ health, mood, characterName }) {
  const barColor  = health >= 65
    ? 'linear-gradient(90deg, #5B4FCF, #E8A838)'
    : health >= 35
    ? 'linear-gradient(90deg, #5B4FCF, #7CB9E8)'
    : 'linear-gradient(90deg, #9CA3AF, #7CB9E8)'
  const heartColor = health >= 65 ? '#5B4FCF' : health >= 35 ? '#7CB9E8' : '#9CA3AF'
  const label = HEALTH_LABELS[mood]

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
        <motion.div className="h-full rounded-full" style={{ background: barColor }}
          initial={{ width:0 }} animate={{ width:`${health}%` }}
          transition={{ duration:1.2, ease:'easeOut' }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Heart size={12} style={{ color:heartColor, fill:heartColor }} />
          <span className="text-[11px] font-semibold" style={{ color:heartColor }}>{characterName}</span>
        </div>
        <span className="text-[11px] font-semibold" style={{ color:'#9CA3AF' }}>{label}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component — unified card: character + check-in
// ─────────────────────────────────────────────
export default function CharacterCompanion({
  characterId     = 'david',
  streak          = 0,
  daysMissed      = 0,
  checkedInToday  = false,
  onCheckin,
}) {
  const router                              = useRouter()
  const [tooltip,      setTooltip]          = useState(false)
  const [isFirstOpen,  setIsFirstOpen]      = useState(false)
  const [showConfetti, setShowConfetti]     = useState(false)
  const [prevChecked,  setPrevChecked]      = useState(checkedInToday)

  useEffect(() => { setIsFirstOpen(checkAndMarkFirstOpenToday()) }, [])

  // Show confetti burst when user just checked in
  useEffect(() => {
    if (checkedInToday && !prevChecked) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1800)
    }
    setPrevChecked(checkedInToday)
  }, [checkedInToday])

  const character   = getCharacterById(characterId)
  const health      = calculateHealth(streak, daysMissed)
  const mood        = getCharacterMood(checkedInToday, daysMissed, isFirstOpen)
  const state       = MOOD_TO_STATE[mood]
  const message     = character.messages[mood]
  const currentImg  = character.images?.[state]
  const moodBg      = MOOD_BACKGROUNDS[mood] || '#FAF8F5'
  const accentColor = character.accentColor

  function handleTap() {
    setTooltip(true)
    setTimeout(() => setTooltip(false), 2500)
  }

  return (
    <div className="flex flex-col w-full relative" style={{ borderRadius: 20 }}>
      {showConfetti && <ConfettiBurst />}

      {/* ── Character section ── */}
      <div className="flex flex-col items-center pt-6 pb-4 px-5 rounded-t-[20px] transition-colors duration-700"
        style={{ background: moodBg }}>

        {/* Character image — tappable, tooltip on tap */}
        <div className="relative">
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity:0, y:10, scale:0.9 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, scale:0.95 }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full z-10 px-4 py-2.5 rounded-2xl shadow-lg text-center"
                style={{ background:accentColor, maxWidth:220, minWidth:160 }}>
                <p className="text-white text-[12px] font-semibold leading-snug">{message}</p>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                  <div className="w-4 h-4 rotate-45 -translate-y-2" style={{ background:accentColor }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleTap}
            whileTap={{ scale:0.95 }}
            animate={mood === 'celebrating' ? { y:[0,-6,0] } : {}}
            transition={mood === 'celebrating' ? { repeat:Infinity, duration:1.2, ease:'easeInOut' } : {}}
            className="focus:outline-none"
            aria-label={`Tap ${character.name} for encouragement`}>
            {currentImg
              ? <Image src={currentImg} alt={character.name} width={200} height={200} className="object-contain" priority />
              : <CharacterPlaceholder character={character} state={state} />
            }
          </motion.button>
        </div>

        {/* Message — large, readable, never truncated */}
        <motion.div
          key={mood}
          initial={{ opacity:0, y:6 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.15 }}
          className="mt-4 w-full px-1"
          style={{ background:`${accentColor}12`, borderRadius:12, padding:'12px 14px' }}>
          <p className="font-display italic text-center leading-[1.8]"
            style={{ fontSize:17, color:'#1A1A2E' }}>
            <span style={{ color:accentColor }}>"</span>
            {message}
            <span style={{ color:accentColor }}>"</span>
          </p>
          <p className="text-center mt-2 text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>
            {character.name} · {character.title}
          </p>
        </motion.div>

        {/* Health bar */}
        <div className="mt-4 w-full">
          <HealthBar health={health} mood={mood} characterName={character.name} />
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height:1, background:'#F0EDE8' }} />

      {/* ── Check-in section — visually connected to character ── */}
      <div className="px-5 py-4 rounded-b-[20px]" style={{ background:'white' }}>
        {checkedInToday ? (
          <motion.div
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color:'#4A7C5F' }} />
              <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>
                You've checked in today!
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background:'#FFF4DC' }}>
                <Flame size={14} className="flame-flicker" style={{ color:'#E8A838' }} />
                <span className="text-[13px] font-bold" style={{ color:'#B07000' }}>
                  Day {streak} streak
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <motion.button
              onClick={() => router.push('/checkin')}
              className="cta-pulse w-full text-white rounded-pill py-4 text-[15px] font-bold tracking-wide active:scale-[0.97] transition-all"
              style={{ background:'#5B4FCF' }}
              animate={isFirstOpen && !checkedInToday ? {
                boxShadow: ['0 0 0 0 rgba(91,79,207,0)', '0 0 0 8px rgba(91,79,207,0.2)', '0 0 0 0 rgba(91,79,207,0)']
              } : {}}
              transition={{ repeat:3, duration:1.4, delay:0.8 }}>
              ✓  I read my Bible today
            </motion.button>
            <button
              onClick={() => {}}
              className="text-center text-[13px] font-semibold py-1"
              style={{ color:'#9CA3AF' }}>
              Remind me later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}