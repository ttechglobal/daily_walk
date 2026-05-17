'use client'

// ── src/components/CharacterCompanion.js ──
// Uses exact same visual language as Home/Profile:
//   Card bottom section: bg-white (same as settings rows)
//   Message bubble: bg-purple-light (same as scripture badges)
//   Health bar track: bg-warm-outer (same as progress bars elsewhere)
//   Buttons: rounded-pill bg-purple text-white (same as all CTAs)
//   Dark mode: Tailwind classes — globals.css handles automatically
//
// z-index fix: position:relative, zIndex:1 on outer wrapper
// ensures companion is never hidden behind the hero image.

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
    happy:       { y:[0,-5,0],            transition:{repeat:Infinity,duration:2.8,ease:'easeInOut'} },
    celebrating: { y:[0,-8,0],            transition:{repeat:Infinity,duration:1.2,ease:'easeInOut'} },
    radiant:     { scale:[1,1.03,1],      transition:{repeat:Infinity,duration:3.2,ease:'easeInOut'} },
    quiet:       { scale:[1,1.008,1],     transition:{repeat:Infinity,duration:4.5,ease:'easeInOut'} },
    sad:         { y:[0,4,0],             transition:{repeat:Infinity,duration:5.0,ease:'easeInOut'} },
    struggling:  { x:[0,1.5,0,-1.5,0],   transition:{repeat:Infinity,duration:6.5,ease:'easeInOut'} },
  }

  return (
    <motion.div animate={anim[state]||{}} style={{width:200,height:220,position:'relative',flexShrink:0}}>
      {/* Styled frame — same border-radius language as cards (20px) but rounded more for image */}
      <div className="absolute inset-0 rounded-[24px] overflow-hidden"
        style={{
          background: `${color}14`,
          border:     `1.5px solid ${color}38`,
          boxShadow:  `0 4px 24px ${color}22, inset 0 0 0 1px ${color}12`,
        }}>
        <div className="absolute inset-0"
          style={{background:`radial-gradient(circle at 50% 30%, ${color}20, transparent 70%)`}}/>

        {!failed && (
          <img key={src} src={src} alt={`${character.name} — ${state}`}
            onLoad={e=>{e.currentTarget.style.opacity='1';setImageLoaded(true)}}
            onError={()=>setFailed(true)}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity:0,transition:'opacity 0.4s ease'}}/>
        )}

        {(!imageLoaded||failed) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{fontSize:60,lineHeight:1,marginBottom:8,filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.10))',position:'relative',zIndex:1}}>
              {character.placeholderEmoji}
            </span>
            <p className="font-display font-bold text-[14px]" style={{color,position:'relative',zIndex:1}}>
              {character.name}
            </p>
            <p className="text-[10px] mt-0.5 font-semibold" style={{color:`${color}70`,position:'relative',zIndex:1}}>
              {character.title}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Health bar — same style as ProgressBar in plans
//  bg-warm-outer track, same h-2, same purple fill
// ─────────────────────────────────────────────
function HealthBar({ health, mood, accentColor }) {
  const barColor = getHealthColor(health)
  const label    = HEALTH_LABELS[mood] || 'Growing'
  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full h-2 rounded-full overflow-hidden bg-warm-outer">
        <motion.div className="h-full rounded-full"
          style={{background:`linear-gradient(90deg, ${barColor}, ${accentColor})`}}
          initial={{width:0}} animate={{width:`${health}%`}}
          transition={{duration:1.2,ease:'easeOut'}}/>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Heart size={12} style={{color:barColor,fill:barColor}}/>
          <span className="text-[11px] font-semibold" style={{color:barColor}}>Spiritual health</span>
        </div>
        <span className="text-[11px] font-semibold text-text-muted">{label}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function CharacterCompanion({
  characterId    = 'david',
  streak         = 0,
  daysMissed     = 0,
  checkedInToday = false,
}) {
  const router = useRouter()
  const [isFirstOpen,  setIsFirstOpen]  = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [prevChecked,  setPrevChecked]  = useState(checkedInToday)
  const [tooltip,      setTooltip]      = useState(false)

  useEffect(()=>{setIsFirstOpen(checkAndMarkFirstOpenToday())},[])
  useEffect(()=>{
    if (checkedInToday&&!prevChecked){setShowConfetti(true);setTimeout(()=>setShowConfetti(false),1600)}
    setPrevChecked(checkedInToday)
  },[checkedInToday])

  const character  = getCharacterById(characterId)
  const health     = calculateHealth(streak, daysMissed)
  const mood       = getCharacterMood(checkedInToday, daysMissed, isFirstOpen)
  const imageState = getCharacterImageState(checkedInToday, daysMissed, streak)
  const message    = character.messages[imageState] || character.messages[mood] || ''
  const accent     = character.accentColor

  // Mood backgrounds — light mode values from original
  // Dark mode: globals.css bg-warm-* overrides handle it
  const MOOD_BG = {
    celebrating: '#FFF8E7', welcoming:    '#F0EEFF',
    gentle_nudge:'#F7F7F5', missing_you:  '#EFF6FF',
    concerned:   '#F0F7FF', waiting:      '#F7F7F7',
  }
  const moodBg = MOOD_BG[mood] || '#FAF8F5'

  return (
    // ── z-index:1 ensures this is ABOVE hero image in stacking context ──
    <div className="flex flex-col w-full relative overflow-hidden rounded-[20px]"
      style={{position:'relative', zIndex:1}}>
      {showConfetti && <ConfettiBurst/>}

      {/* Character section — mood bg transitions smoothly */}
      <motion.div
        className="flex flex-col items-center pt-6 pb-5 px-5"
        animate={{backgroundColor:moodBg}} transition={{duration:0.6}}>

        {/* Character + tooltip */}
        <div className="relative mb-4">
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{opacity:0,y:8,scale:0.92}} animate={{opacity:1,y:0,scale:1}}
                exit={{opacity:0,scale:0.95}}
                className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 px-4 py-3 rounded-2xl shadow-xl text-center"
                style={{background:accent,minWidth:180,maxWidth:240}}>
                <p className="text-white text-[13px] font-semibold leading-snug">{message}</p>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                  <div className="w-4 h-4 rotate-45 -translate-y-2" style={{background:accent}}/>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={()=>{setTooltip(true);setTimeout(()=>setTooltip(false),2500)}}
            className="focus:outline-none" aria-label={`${character.name} — tap for encouragement`}>
            <CharacterImage character={character} state={imageState}/>
          </button>
        </div>

        {/* Message bubble — same as scripture badge: bg-purple-light, left border */}
        <AnimatePresence mode="wait">
          <motion.div key={`msg-${imageState}`}
            initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}}
            transition={{duration:0.4,delay:0.12}}
            className="w-full py-3 px-3 rounded-[14px]"
            style={{background:`${accent}10`}}>
            <p className="font-display italic text-center leading-[1.8] text-text-primary"
              style={{fontSize:15}}>
              <span style={{color:accent}}>"</span>
              {message}
              <span style={{color:accent}}>"</span>
            </p>
            <p className="text-center mt-1.5 text-[11px] font-semibold text-text-muted">
              — {character.name}, {character.title}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Health bar */}
        <div className="mt-4 w-full">
          <HealthBar health={health} mood={mood} accentColor={accent}/>
        </div>
      </motion.div>

      {/* Divider — same as Profile dividers */}
      <div className="border-t border-gray-100"/>

      {/* Check-in section — bg-white same as all card bottoms */}
      <div className="px-5 py-4 bg-white rounded-b-[20px]">
        {checkedInToday ? (
          <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}}
            className="flex flex-col items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-sage"/>
              <p className="font-bold text-[15px] text-text-primary">Checked in today!</p>
            </div>
            {streak>0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-light">
                <Flame size={14} className="text-amber"/>
                <span className="text-[13px] font-bold text-amber">{streak} day streak</span>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            <motion.button
              onClick={()=>router.push('/checkin')}
              className="w-full text-white rounded-pill py-4 text-[15px] font-bold active:scale-[0.97] transition-all shadow-purple min-h-[44px] bg-purple"
              animate={isFirstOpen?{boxShadow:['0 4px 16px rgba(91,79,207,0.28)','0 4px 24px rgba(91,79,207,0.5)','0 4px 16px rgba(91,79,207,0.28)']}:{}}
              transition={{repeat:3,duration:1.4,delay:0.8}}>
              ✓ I read my Bible today
            </motion.button>
            <button className="text-center text-[13px] font-semibold py-1 text-text-muted">
              Remind me later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}