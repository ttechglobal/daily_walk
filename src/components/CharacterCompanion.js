'use client'

// ── src/components/CharacterCompanion.js ──
// Dark mode: fully fixed via useDarkMode() + getDarkModeColors()
// Light mode: identical to before — only dark variants added.
// z-index on outer wrapper ensures companion always sits above hero image.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Flame, CheckCircle2 } from 'lucide-react'
import { getCharacterById } from '../lib/characters'
import {
  getImagePath, getCharacterImageState, getCharacterMood,
  HEALTH_LABELS, checkAndMarkFirstOpenToday,
} from '../lib/character-state'
import { calculateHealth, getHealthColor } from '../lib/health'
import { useDarkMode, getDarkModeColors } from '../contexts/DarkModeContext'

// ─────────────────────────────────────────────
//  Confetti
// ─────────────────────────────────────────────
function ConfettiBurst() {
  const dots = Array.from({length:18},(_,i)=>({
    x: Math.cos((i/18)*2*Math.PI)*(30+Math.random()*50),
    y: Math.sin((i/18)*2*Math.PI)*(30+Math.random()*50),
    color: ['#5B4FCF','#E8A838','#4A7C5F','#E84060','#7CB9E8','#C77DFF'][i%6],
    size: 4+Math.random()*5,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {dots.map((d,i)=>(
        <motion.div key={i} className="absolute rounded-full"
          style={{width:d.size,height:d.size,background:d.color,left:'50%',top:'40%'}}
          initial={{x:0,y:0,opacity:1}} animate={{x:d.x,y:d.y,opacity:0}}
          transition={{duration:0.9,ease:'easeOut',delay:i*0.02}}/>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Character image
// ─────────────────────────────────────────────
function CharacterImage({ character, state }) {
  const [failed,      setFailed]      = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const src   = getImagePath(character.id, state)
  const color = character.accentColor

  const anim = {
    happy:       { y:[0,-5,0],         transition:{repeat:Infinity,duration:2.8,ease:'easeInOut'} },
    celebrating: { y:[0,-8,0],         transition:{repeat:Infinity,duration:1.2,ease:'easeInOut'} },
    radiant:     { scale:[1,1.03,1],   transition:{repeat:Infinity,duration:2.4,ease:'easeInOut'} },
    quiet:       { opacity:[1,0.7,1],  transition:{repeat:Infinity,duration:3.0,ease:'easeInOut'} },
    sad:         { y:[0,3,0],          transition:{repeat:Infinity,duration:4.0,ease:'easeInOut'} },
    struggling:  { x:[0,-2,2,0],      transition:{repeat:Infinity,duration:5.0,ease:'easeInOut'} },
    neutral:     {},
  }

  return (
    <motion.div animate={anim[state] || {}} className="relative"
      style={{width:150,height:150}}>
      {!failed ? (
        <img src={src} alt={character.name}
          onLoad={()=>setImageLoaded(true)}
          onError={()=>setFailed(true)}
          style={{width:150,height:150,objectFit:'contain',
            opacity:imageLoaded?1:0,transition:'opacity 0.3s'}}/>
      ) : null}
      {(failed || !imageLoaded) && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center text-[40px]"
          style={{background:`${color}15`}}>
          {character.placeholderEmoji}
        </div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Health bar
// ─────────────────────────────────────────────
function HealthBar({ health, mood, accentColor, c }) {
  const color = getHealthColor(health)
  const label = HEALTH_LABELS[mood] || 'Growing'
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Heart size={11} style={{color, flexShrink:0}}/>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{color: c.textFaint}}>
            Companion Health
          </span>
        </div>
        <span className="text-[11px] font-semibold" style={{color: c.textMuted}}>{label}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{background: c.bgMuted}}>
        <motion.div className="h-full rounded-full"
          style={{background: color}}
          initial={{width:0}}
          animate={{width:`${health}%`}}
          transition={{duration:0.8,ease:'easeOut'}}/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function CharacterCompanion({ characterId, streak, daysMissed, checkedInToday }) {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [tooltip,       setTooltip]     = useState(false)
  const [showConfetti,  setShowConfetti] = useState(false)
  const [prevChecked,   setPrevChecked]  = useState(checkedInToday)
  const [isFirstOpen]                   = useState(checkAndMarkFirstOpenToday)

  useEffect(() => {
    if (checkedInToday && !prevChecked) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1600)
    }
    setPrevChecked(checkedInToday)
  }, [checkedInToday]) // eslint-disable-line

  const character  = getCharacterById(characterId)
  const health     = calculateHealth(streak, daysMissed)
  const mood       = getCharacterMood(checkedInToday, daysMissed, isFirstOpen)
  const imageState = getCharacterImageState(checkedInToday, daysMissed, streak)
  const message    = character.messages[imageState] || character.messages[mood] || ''
  const accent     = character.accentColor

  // Mood backgrounds — dark mode variants alongside light
  const MOOD_BG = dark ? {
    celebrating: '#2E2210', welcoming:   '#1E1A32',
    gentle_nudge:'#181A1E', missing_you: '#161E2A',
    concerned:   '#161E2A', waiting:     '#16181E',
  } : {
    celebrating: '#FFF8E7', welcoming:   '#F0EEFF',
    gentle_nudge:'#F7F7F5', missing_you: '#EFF6FF',
    concerned:   '#F0F7FF', waiting:     '#F7F7F7',
  }
  const moodBg = MOOD_BG[mood] || c.bgCard

  return (
    // z-index:10 ensures companion is always above hero image and other home content
    <div className="flex flex-col w-full relative overflow-hidden rounded-[20px]"
      style={{ position:'relative', zIndex:10 }}>
      {showConfetti && <ConfettiBurst/>}

      {/* Character section — mood bg */}
      <motion.div
        className="flex flex-col items-center pt-6 pb-5 px-5"
        animate={{ backgroundColor: moodBg }}
        transition={{ duration: 0.6 }}>

        {/* Character + tooltip */}
        <div className="relative mb-4">
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{opacity:0,y:8,scale:0.92}} animate={{opacity:1,y:0,scale:1}}
                exit={{opacity:0,scale:0.95}}
                className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 px-4 py-3 rounded-2xl shadow-xl text-center"
                style={{background:accent, minWidth:180, maxWidth:240}}>
                <p className="text-white text-[13px] font-semibold leading-snug">{message}</p>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                  <div className="w-4 h-4 rotate-45 -translate-y-2" style={{background:accent}}/>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={()=>{setTooltip(true); setTimeout(()=>setTooltip(false),2500)}}
            className="focus:outline-none" aria-label={`${character.name} — tap for encouragement`}>
            <CharacterImage character={character} state={imageState}/>
          </button>
        </div>

        {/* Message bubble */}
        <AnimatePresence mode="wait">
          <motion.div key={`msg-${imageState}`}
            initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}}
            transition={{duration:0.4,delay:0.12}}
            className="w-full py-3 px-3 rounded-[14px]"
            style={{background:`${accent}18`}}>
            <p className="font-display italic text-center leading-[1.8]"
              style={{fontSize:15, color: c.text}}>
              <span style={{color:accent}}>"</span>
              {message}
              <span style={{color:accent}}>"</span>
            </p>
            <p className="text-center mt-1.5 text-[11px] font-semibold" style={{color: c.textMuted}}>
              — {character.name}, {character.title}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Health bar */}
        <div className="mt-4 w-full">
          <HealthBar health={health} mood={mood} accentColor={accent} c={c}/>
        </div>
      </motion.div>

      {/* Divider */}
      <div style={{borderTop:`1px solid ${c.border}`}}/>

      {/* Check-in section */}
      <div className="px-5 py-4 rounded-b-[20px]" style={{background: c.bgCard}}>
        {checkedInToday ? (
          <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}}
            className="flex flex-col items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} style={{color:'#4A7C5F'}}/>
              <p className="font-bold text-[15px]" style={{color: c.text}}>Checked in today!</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{background: c.amberLight}}>
                <Flame size={14} style={{color:'#E8A838'}}/>
                <span className="text-[13px] font-bold" style={{color:'#E8A838'}}>{streak} day streak</span>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            <motion.button
              onClick={()=>router.push('/checkin')}
              className="w-full text-white rounded-pill py-4 text-[15px] font-bold active:scale-[0.97] transition-all min-h-[44px]"
              style={{background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.35)'}}
              animate={isFirstOpen
                ? {scale:[1,1.03,1], transition:{repeat:3,duration:0.8}}
                : {}}>
              Check in today →
            </motion.button>
            <button onClick={()=>router.push('/read')}
              className="w-full py-3 rounded-pill text-[13px] font-bold min-h-[44px]"
              style={{background: c.bgMuted, color: c.textMuted}}>
              Open Bible reader
            </button>
          </div>
        )}
      </div>
    </div>
  )
}