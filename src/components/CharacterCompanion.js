'use client'

// ── CharacterCompanion — unified character + check-in card ──
// Always encouraging. Smooth animated state transitions.
// Message never truncated. Real images auto-used when placed in /public/characters/

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, CheckCircle2, Flame } from 'lucide-react'
import { calculateHealth, getHealthColor } from '../lib/health'
import { getCharacterById } from '../lib/characters'
import {
  getCharacterMood, MOOD_TO_STATE, HEALTH_LABELS, checkAndMarkFirstOpenToday,
} from '../lib/character-state'

const MOOD_BACKGROUNDS = {
  celebrating:  '#FFF8E7',
  welcoming:    '#F0EEFF',
  gentle_nudge: '#F7F7F5',
  missing_you:  '#EFF6FF',
  concerned:    '#F0F7FF',
  waiting:      '#F7F7F7',
}

// Confetti
const CONFETTI_COLORS = ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#F9C74F','#FF6B6B']
function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id:i, x:(Math.random()-0.5)*220, y:Math.random()*-160+10,
    color:CONFETTI_COLORS[i%CONFETTI_COLORS.length],
    size:4+Math.random()*5, delay:Math.random()*0.25, r:(Math.random()-0.5)*480,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute rounded-sm"
          style={{ left:'50%', top:'35%', width:p.size, height:p.size, background:p.color }}
          initial={{ x:0, y:0, opacity:1, rotate:0 }}
          animate={{ x:p.x, y:p.y, opacity:0, rotate:p.r }}
          transition={{ duration:1.1+Math.random()*0.4, delay:p.delay, ease:'easeOut' }}
        />
      ))}
    </div>
  )
}

// Character image or placeholder
function CharacterImage({ character, state }) {
  const [imgError, setImgError] = useState(false)
  const src = character.images?.[state]

  const animVariants = {
    radiant:    { y:[0,-8,0], transition:{ repeat:Infinity, duration:1.4, ease:'easeInOut' } },
    happy:      { rotate:[-1.5,1.5,-1.5], transition:{ repeat:Infinity, duration:2.2, ease:'easeInOut' } },
    neutral:    { scale:[1,1.015,1], transition:{ repeat:Infinity, duration:3, ease:'easeInOut' } },
    quiet:      { scale:[1,1.008,1], transition:{ repeat:Infinity, duration:4, ease:'easeInOut' } },
    sad:        { y:[0,3,0], transition:{ repeat:Infinity, duration:5, ease:'easeInOut' } },
    struggling: { x:[0,1.5,0,-1.5,0], transition:{ repeat:Infinity, duration:6, ease:'easeInOut' } },
    fading:     { opacity:[0.6,0.4,0.6], transition:{ repeat:Infinity, duration:4, ease:'easeInOut' } },
  }

  const color = character.accentColor

  // Use real image if available and didn't error
  if (src && !imgError) {
    return (
      <motion.div animate={animVariants[state] || {}} style={{ width:200, height:220 }}
        className="flex items-center justify-center">
        {/* TODO: Replace Image when real images are ready — works automatically */}
        <Image src={src} alt={character.name} width={200} height={220}
          className="object-contain drop-shadow-lg" priority
          onError={() => setImgError(true)} />
      </motion.div>
    )
  }

  // Placeholder SVG card — intentional, premium look
  return (
    <motion.div animate={animVariants[state] || {}}
      className="flex flex-col items-center justify-center rounded-[24px] relative overflow-hidden"
      style={{ width:200, height:220, background:`${color}15`, border:`1.5px solid ${color}30` }}>
      {/* Soft glow */}
      <div className="absolute inset-0 rounded-[24px]"
        style={{ background:`radial-gradient(circle at 50% 40%, ${color}20, transparent 70%)` }} />
      <span style={{ fontSize:64, lineHeight:1, marginBottom:10, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}>
        {character.placeholderEmoji}
      </span>
      <p className="font-display font-bold text-[16px] relative z-10" style={{ color }}>
        {character.name}
      </p>
      <p className="text-[11px] mt-1 font-semibold relative z-10" style={{ color:`${color}70` }}>
        {character.title}
      </p>
    </motion.div>
  )
}

// Animated health bar
function HealthBar({ health, mood, accentColor }) {
  const barColor = getHealthColor(health)
  const label    = HEALTH_LABELS[mood] || 'Growing'

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:'#E8E5E0' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}, ${accentColor})` }}
          initial={{ width:0 }}
          animate={{ width:`${health}%` }}
          transition={{ duration:1.2, ease:'easeOut' }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Heart size={12} style={{ color:barColor, fill:barColor }} />
          <span className="text-[11px] font-semibold" style={{ color:barColor }}>
            {health}%
          </span>
        </div>
        <span className="text-[11px] font-semibold" style={{ color:'#9CA3AF' }}>{label}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
export default function CharacterCompanion({
  characterId    = 'david',
  streak         = 0,
  daysMissed     = 0,
  checkedInToday = false,
}) {
  const router                          = useRouter()
  const [tooltip,     setTooltip]       = useState(false)
  const [isFirstOpen, setIsFirstOpen]   = useState(false)
  const [showConfetti,setShowConfetti]  = useState(false)
  const [prevChecked, setPrevChecked]   = useState(checkedInToday)

  useEffect(() => { setIsFirstOpen(checkAndMarkFirstOpenToday()) }, [])

  useEffect(() => {
    if (checkedInToday && !prevChecked) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1600)
    }
    setPrevChecked(checkedInToday)
  }, [checkedInToday])

  const character  = getCharacterById(characterId)
  const health     = calculateHealth(streak, daysMissed)
  const mood       = getCharacterMood(checkedInToday, daysMissed, isFirstOpen)
  const state      = MOOD_TO_STATE[mood]
  const message    = character.messages[mood]
  const moodBg     = MOOD_BACKGROUNDS[mood] || '#FAF8F5'
  const accent     = character.accentColor

  return (
    <div className="flex flex-col w-full relative overflow-hidden rounded-[20px]">
      {showConfetti && <ConfettiBurst />}

      {/* Character section — animated background transition */}
      <motion.div
        key={mood}
        className="flex flex-col items-center pt-7 pb-5 px-5"
        animate={{ backgroundColor: moodBg }}
        transition={{ duration:0.6 }}>

        {/* Character image — tappable for tooltip */}
        <div className="relative mb-4">
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity:0, y:8, scale:0.92 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, scale:0.95 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 px-4 py-3 rounded-2xl shadow-xl text-center"
                style={{ background:accent, minWidth:180, maxWidth:230 }}>
                <p className="text-white text-[13px] font-semibold leading-snug">{message}</p>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                  <div className="w-4 h-4 rotate-45 -translate-y-2" style={{ background:accent }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => { setTooltip(true); setTimeout(() => setTooltip(false), 2500) }}
            className="focus:outline-none active:scale-[0.97] transition-transform"
            aria-label={`${character.name} — tap for encouragement`}>
            <CharacterImage character={character} state={state} />
          </button>
        </div>

        {/* Message — Lora italic, always fully visible, never truncated */}
        <motion.div key={message}
          initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.1 }}
          className="w-full px-1 py-3 px-3 rounded-[14px]"
          style={{ background:`${accent}10` }}>
          <p className="font-display italic text-center leading-[1.8] text-[16px]"
            style={{ color:'#1A1A2E' }}>
            <span style={{ color:accent }}>"</span>
            {message}
            <span style={{ color:accent }}>"</span>
          </p>
          <p className="text-center mt-2 text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>
            {character.name} · {character.title}
          </p>
        </motion.div>

        {/* Health bar */}
        <div className="mt-4 w-full">
          <HealthBar health={health} mood={mood} accentColor={accent} />
        </div>
      </motion.div>

      {/* Divider */}
      <div style={{ height:1, background:'#F0EDE8' }} />

      {/* Check-in section */}
      <div className="px-5 py-4 rounded-b-[20px]" style={{ background:'white' }}>
        {checkedInToday ? (
          <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
            className="flex flex-col items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color:'#4A7C5F' }} />
              <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>Checked in today!</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background:'#FFF4DC' }}>
                <Flame size={14} style={{ color:'#E8A838' }} />
                <span className="text-[13px] font-bold" style={{ color:'#B07000' }}>
                  {streak} day streak
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            <motion.button
              onClick={() => router.push('/checkin')}
              className="w-full text-white rounded-full py-4 text-[15px] font-bold active:scale-[0.97] transition-all"
              style={{ background:'#5B4FCF', boxShadow:'0 4px 16px rgba(91,79,207,0.3)' }}
              animate={isFirstOpen ? {
                boxShadow: [
                  '0 4px 16px rgba(91,79,207,0.3)',
                  '0 4px 24px rgba(91,79,207,0.5)',
                  '0 4px 16px rgba(91,79,207,0.3)',
                ]
              } : {}}
              transition={{ repeat:3, duration:1.4, delay:0.8 }}>
              ✓ I read my Bible today
            </motion.button>
            <button onClick={() => {}}
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