'use client'

// ── src/components/Onboarding.js ──
// Full standalone onboarding. Fixed layout:
// - uses fixed inset-0 so it sits above everything
// - footer uses env(safe-area-inset-bottom) + explicit bottom nav clearance
// - BottomNav is hidden on this screen via CSS (onboarding is fullscreen)
// - Skip is always visible — never scrollable out of view

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CHARACTERS } from '../lib/characters'
import { getImagePath } from '../lib/character-state'
import { useDarkMode, getDarkModeColors } from '../contexts/DarkModeContext'

// ─────────────────────────────────────────────
//  Slide data
// ─────────────────────────────────────────────
const SLIDES = [
  {
    id: 'welcome',
    Illustration: WelcomeIllustration,
    title: 'Welcome to Daily Walk',
    subtitle: 'Your daily devotion, together. Build a habit that lasts — one verse, one chapter, one day at a time.',
    bg: 'linear-gradient(160deg,#5B4FCF 0%,#3D3190 60%,#2A2260 100%)',
    btnColor: '#5B4FCF',
  },
  {
    id: 'bible',
    Illustration: BibleIllustration,
    title: 'Read Your Bible Daily',
    subtitle: 'Access the full Bible in multiple translations, bookmark your favourite verses, and track what you\'ve read.',
    bg: 'linear-gradient(160deg,#4A7C5F 0%,#2D5A40 60%,#1E3D2A 100%)',
    btnColor: '#4A7C5F',
  },
  {
    id: 'plans',
    Illustration: PlansIllustration,
    title: 'Follow a Reading Plan',
    subtitle: 'From Bible-in-a-Year to topical studies — choose a plan that fits your season and we\'ll keep you on track.',
    bg: 'linear-gradient(160deg,#E8A838 0%,#B07000 60%,#7A4D00 100%)',
    btnColor: '#B07000',
  },
  {
    id: 'streak',
    Illustration: StreakIllustration,
    title: 'Build Your Streak',
    subtitle: 'Check in each day when you read. Your companion celebrates with you and keeps you accountable.',
    bg: 'linear-gradient(160deg,#E84060 0%,#B02040 60%,#7A1030 100%)',
    btnColor: '#B02040',
  },
]

// ─────────────────────────────────────────────
//  Illustrations
// ─────────────────────────────────────────────
function WelcomeIllustration() {
  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <radialGradient id="w-glow" cx="50%" cy="40%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,200,0.6)"/>
          <stop offset="100%" stopColor="rgba(255,255,200,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="104" rx="80" ry="80" fill="url(#w-glow)"/>
      <circle cx="160" cy="100" r="38" fill="rgba(255,240,140,0.9)"/>
      <circle cx="160" cy="100" r="28" fill="rgba(255,220,80,0.95)"/>
      {Array.from({length:12},(_,i)=>{
        const a=(i*30)*Math.PI/180,r1=42,r2=56
        return <line key={i} x1={160+r1*Math.cos(a)} y1={100+r1*Math.sin(a)} x2={160+r2*Math.cos(a)} y2={100+r2*Math.sin(a)} stroke="rgba(255,220,80,0.7)" strokeWidth={i%3===0?3:1.5} strokeLinecap="round"/>
      })}
      <path d="M0 190 Q80 145 160 170 Q240 200 320 162 L320 260 L0 260 Z" fill="rgba(255,255,255,0.15)"/>
      <path d="M0 215 Q80 185 160 198 Q240 212 320 190 L320 260 L0 260 Z" fill="rgba(255,255,255,0.2)"/>
      <path d="M150 260 Q155 228 160 208 Q165 190 160 170" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" strokeDasharray="8,6" strokeLinecap="round"/>
      <rect x="155" y="110" width="10" height="38" rx="2" fill="rgba(255,255,255,0.88)"/>
      <rect x="144" y="122" width="32" height="8" rx="2" fill="rgba(255,255,255,0.88)"/>
      {[[40,36],[280,56],[60,82],[300,82],[200,36]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%2===0?2:1.5} fill="rgba(255,255,255,0.7)"/>
      ))}
    </svg>
  )
}

function BibleIllustration() {
  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <radialGradient id="b-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="130" rx="100" ry="100" fill="url(#b-glow)"/>
      <g transform="translate(160,130)">
        <path d="M-10,0 Q-70,-10 -90,-50 L-90,60 Q-70,70 -10,60 Z" fill="rgba(255,255,255,0.92)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        <path d="M10,0 Q70,-10 90,-50 L90,60 Q70,70 10,60 Z" fill="rgba(255,255,255,0.92)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        <rect x="-10" y="-55" width="20" height="120" rx="4" fill="rgba(255,255,255,0.3)"/>
        {[-35,-20,-5,10,25,40].map((y,i)=>(
          <rect key={i} x={-82} y={y} width={i%3===0?60:45} height="4" rx="2" fill="rgba(74,124,95,0.4)"/>
        ))}
        {[-35,-20,-5,10,25,40].map((y,i)=>(
          <rect key={i} x={18} y={y} width={i%2===0?55:40} height="4" rx="2" fill="rgba(74,124,95,0.4)"/>
        ))}
        <rect x="-3" y="-20" width="6" height="24" rx="1.5" fill="rgba(232,168,56,0.9)"/>
        <rect x="-9" y="-12" width="18" height="6" rx="1.5" fill="rgba(232,168,56,0.9)"/>
        <path d="M55,-55 L55,10 L50,4 L45,10 L45,-55" fill="rgba(232,84,96,0.8)"/>
      </g>
      {[[60,55],[260,45],[50,200],[270,190],[160,35]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x},${y})`}>
          <line x1="0" y1="-8" x2="0" y2="8" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="-8" y1="0" x2="8" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      ))}
    </svg>
  )
}

function PlansIllustration() {
  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <rect x="70" y="50" width="180" height="160" rx="18" fill="rgba(255,255,255,0.92)"/>
      <rect x="70" y="50" width="180" height="48" rx="18" fill="rgba(232,168,56,0.9)"/>
      <rect x="70" y="78" width="180" height="20" fill="rgba(232,168,56,0.9)"/>
      <text x="160" y="81" textAnchor="middle" style={{fontFamily:'sans-serif',fontSize:15,fontWeight:'bold',fill:'white'}}>Reading Plan</text>
      {[0,1,2,3,4,5,6].map(col=>(
        <text key={col} x={87+col*26} y={112} textAnchor="middle"
          style={{fontFamily:'sans-serif',fontSize:9,fill:'rgba(176,112,0,0.7)',fontWeight:600}}>
          {['M','T','W','T','F','S','S'][col]}
        </text>
      ))}
      {Array.from({length:28},(_,i)=>{
        const col=i%7,row=Math.floor(i/7),x=87+col*26,y=128+row*26
        const done=i<12,today=i===12
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={10}
              fill={today?'rgba(232,168,56,0.9)':done?'rgba(74,124,95,0.8)':'rgba(240,237,232,0.8)'}/>
            {done&&<path d={`M${x-4},${y} L${x-1},${y+3} L${x+4},${y-4}`}
              stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
            {(today||!done)&&<text x={x} y={y+4} textAnchor="middle"
              style={{fontFamily:'sans-serif',fontSize:today?10:9,fontWeight:today?'bold':'normal',fill:today?'white':'rgba(130,110,80,0.7)'}}>{i+1}</text>}
          </g>
        )
      })}
      <rect x="88" y="232" width="144" height="6" rx="3" fill="rgba(240,237,232,0.8)"/>
      <rect x="88" y="232" width="62" height="6" rx="3" fill="rgba(74,124,95,0.9)"/>
    </svg>
  )
}

function StreakIllustration() {
  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <radialGradient id="f-glow" cx="50%" cy="55%" r="45%">
          <stop offset="0%" stopColor="rgba(255,200,100,0.5)"/>
          <stop offset="100%" stopColor="rgba(255,200,100,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="140" rx="100" ry="100" fill="url(#f-glow)"/>
      <path d="M160 230 Q120 192 125 148 Q130 114 145 94 Q148 132 155 128 Q150 105 160 74 Q175 108 168 128 Q176 133 178 94 Q192 124 195 154 Q200 192 160 230 Z" fill="rgba(255,180,50,0.9)"/>
      <path d="M160 220 Q130 194 133 160 Q137 136 148 120 Q150 144 156 140 Q153 124 160 100 Q170 126 165 142 Q172 145 174 116 Q184 140 185 163 Q188 192 160 220 Z" fill="rgba(255,220,100,0.95)"/>
      <path d="M160 208 Q140 190 143 168 Q147 150 156 140 Q157 156 161 152 Q159 141 164 124 Q172 144 168 158 Q173 161 172 141 Q180 157 180 170 Q180 192 160 208 Z" fill="rgba(255,240,160,0.9)"/>
      <text x="160" y="175" textAnchor="middle" style={{fontFamily:'sans-serif',fontSize:36,fontWeight:'bold',fill:'rgba(120,50,0,0.85)'}}>7</text>
      <text x="160" y="195" textAnchor="middle" style={{fontFamily:'sans-serif',fontSize:11,fontWeight:'bold',fill:'rgba(120,50,0,0.7)'}}>day streak</text>
      {[[60,72],[250,62],[50,152],[275,142],[80,232],[250,232],[160,34]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={4-i%2}
          fill={['rgba(255,220,80,0.8)','rgba(255,255,255,0.7)','rgba(232,84,96,0.7)'][i%3]}/>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────
//  Companion card
// ─────────────────────────────────────────────
const COMPANION_ILLUSTRATIONS = {
  david: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill={color} opacity="0.08"/>
      <path d="M36 44 L42 33 L50 40 L60 29 L70 40 L78 33 L84 44 Z" fill={color} opacity="0.9"/>
      <circle cx="60" cy="28" r="4" fill={color}/>
      <path d="M32 100 Q30 130 60 132 Q90 130 88 100 L80 88 Q70 95 60 95 Q50 95 40 88 Z" fill={color} opacity="0.8"/>
      <rect x="54" y="74" width="12" height="12" rx="6" fill="#F4C28A"/>
      <ellipse cx="60" cy="64" rx="20" ry="22" fill="#F4C28A"/>
      <path d="M40 60 Q40 40 60 40 Q80 40 80 60 Q78 48 60 47 Q42 48 40 60 Z" fill="#6B3A1F"/>
      <ellipse cx="53" cy="62" rx="3.5" ry="4" fill="white"/><ellipse cx="67" cy="62" rx="3.5" ry="4" fill="white"/>
      <circle cx="54" cy="63" r="2.5" fill="#3D2008"/><circle cx="68" cy="63" r="2.5" fill="#3D2008"/>
      <circle cx="55" cy="62" r="1" fill="white"/><circle cx="69" cy="62" r="1" fill="white"/>
      <path d="M53 71 Q60 77 67 71" stroke="#C47020" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  daniel: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill={color} opacity="0.08"/>
      <path d="M32 95 Q28 132 60 134 Q92 132 88 95 L82 85 Q70 94 60 94 Q50 94 38 85 Z" fill={color} opacity="0.85"/>
      <rect x="40" y="90" width="40" height="6" rx="3" fill="white" opacity="0.3"/>
      <rect x="54" y="74" width="12" height="12" rx="6" fill="#C8855A"/>
      <ellipse cx="60" cy="92" rx="22" ry="11" fill={color}/>
      <ellipse cx="60" cy="63" rx="21" ry="23" fill="#C8855A"/>
      <path d="M39 58 Q39 38 60 38 Q81 38 81 58 Q79 46 60 46 Q41 46 39 58 Z" fill="#2C1A08"/>
      <path d="M46 73 Q60 82 74 73 Q70 86 60 87 Q50 86 46 73 Z" fill="#2C1A08" opacity="0.8"/>
      <ellipse cx="53" cy="61" rx="3.5" ry="3.5" fill="white"/><ellipse cx="67" cy="61" rx="3.5" ry="3.5" fill="white"/>
      <circle cx="54" cy="62" r="2.5" fill="#1A0A00"/><circle cx="68" cy="62" r="2.5" fill="#1A0A00"/>
      <circle cx="55" cy="61" r="1" fill="white"/><circle cx="69" cy="61" r="1" fill="white"/>
      <path d="M54 70 Q60 74 66 70" stroke="#7A3A10" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  esther: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill={color} opacity="0.08"/>
      <path d="M28 96 Q24 134 60 136 Q96 134 92 96 L85 84 Q72 96 60 96 Q48 96 35 84 Z" fill={color} opacity="0.85"/>
      <path d="M44 40 L48 32 L56 38 L60 28 L64 38 L72 32 L76 40" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="60" cy="27" r="3.5" fill={color}/>
      <path d="M36 57 Q34 40 60 38 Q86 40 84 57 Q82 44 60 44 Q38 44 36 57 Z" fill="#5C2D09"/>
      <path d="M38 60 Q30 80 34 100" stroke="#5C2D09" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M82 60 Q90 80 86 100" stroke="#5C2D09" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <rect x="54" y="75" width="12" height="10" rx="5" fill="#F0C89A"/>
      <ellipse cx="60" cy="62" rx="20" ry="22" fill="#F0C89A"/>
      <ellipse cx="53" cy="61" rx="3.5" ry="3.8" fill="white"/><ellipse cx="67" cy="61" rx="3.5" ry="3.8" fill="white"/>
      <circle cx="54" cy="62" r="2.6" fill="#3D1800"/><circle cx="68" cy="62" r="2.6" fill="#3D1800"/>
      <circle cx="55" cy="61" r="1" fill="white"/><circle cx="69" cy="61" r="1" fill="white"/>
      <path d="M53 70 Q60 77 67 70" stroke="#C47040" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M50 82 Q60 87 70 82" stroke={color} strokeWidth="2" fill="none" opacity="0.7"/>
      <circle cx="60" cy="86" r="2.5" fill={color} opacity="0.8"/>
    </svg>
  ),
  paul: (color) => (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <ellipse cx="60" cy="70" rx="48" ry="54" fill={color} opacity="0.08"/>
      <path d="M30 92 Q26 132 60 134 Q94 132 90 92 L83 82 Q70 92 60 92 Q50 92 37 82 Z" fill={color} opacity="0.8"/>
      <rect x="16" y="88" width="16" height="22" rx="3" fill="white" opacity="0.9"/>
      <rect x="14" y="86" width="6" height="26" rx="3" fill={color} opacity="0.8"/>
      <rect x="26" y="86" width="6" height="26" rx="3" fill={color} opacity="0.8"/>
      <line x1="19" y1="94" x2="29" y2="94" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="19" y1="98" x2="29" y2="98" stroke={color} strokeWidth="1" opacity="0.5"/>
      <rect x="54" y="74" width="12" height="11" rx="5.5" fill="#E8AA70"/>
      <ellipse cx="60" cy="90" rx="23" ry="11" fill={color} opacity="0.9"/>
      <ellipse cx="60" cy="62" rx="22" ry="23" fill="#E8AA70"/>
      <path d="M38 55 Q38 40 60 40 Q82 40 82 55 Q80 45 60 44 Q40 45 38 55 Z" fill="#3A2010"/>
      <path d="M44 72 Q60 86 76 72 Q72 92 60 94 Q48 92 44 72 Z" fill="#3A2010" opacity="0.85"/>
      <ellipse cx="53" cy="59" rx="3.5" ry="3.8" fill="white"/><ellipse cx="67" cy="59" rx="3.5" ry="3.8" fill="white"/>
      <circle cx="54" cy="60" r="2.8" fill="#1A0800"/><circle cx="68" cy="60" r="2.8" fill="#1A0800"/>
      <circle cx="55" cy="59" r="1" fill="white"/><circle cx="69" cy="59" r="1" fill="white"/>
    </svg>
  ),
}

function CompanionCard({ character, selected, onSelect, dark }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const color = character.accentColor
  const IllSvg = COMPANION_ILLUSTRATIONS[character.id]

  return (
    <button onClick={() => onSelect(character.id)}
      className="flex flex-col rounded-[18px] overflow-hidden transition-all text-left relative"
      style={{
        background: selected ? `${color}18` : dark ? '#1A1A2E' : 'white',
        border: `2px solid ${selected ? color : dark ? '#252840' : '#F0EDE8'}`,
        boxShadow: selected
          ? `0 0 0 2px ${color}30, 0 4px 14px rgba(0,0,0,0.12)`
          : dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
      }}>
      <div className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ height: 110, background: `${color}10` }}>
        {!imgFailed && (
          <img src={getImagePath(character.id, 'happy')} alt={character.name}
            onLoad={e => { e.currentTarget.style.opacity = '1'; setImgLoaded(true) }}
            onError={() => setImgFailed(true)}
            style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity:0,transition:'opacity 0.35s ease',padding:'6px' }}/>
        )}
        {(!imgLoaded || imgFailed) && IllSvg && (
          <div className="absolute inset-0">{IllSvg(color)}</div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center z-10"
            style={{ background: color }}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div className="px-3 pt-2 pb-3">
        <p className="font-bold text-[13px]" style={{ color: dark ? '#E8E4DC' : '#1A1A2E' }}>{character.name}</p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>{character.title}</p>
        <p className="text-[10px] mt-1 line-clamp-2 italic leading-snug" style={{ color: dark ? '#555A72' : '#9CA3AF' }}>
          "{character.signatureVerse}"
        </p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────
//  Progress dots
// ─────────────────────────────────────────────
function Dots({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.35 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="h-2 rounded-full bg-white" />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main Onboarding
// ─────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [step, setStep]               = useState(0)  // 0–3 slides, 4 companion, 5 account
  const [name, setName]               = useState('')
  const [stage, setStage]             = useState('')
  const [companionId, setCompanionId] = useState('david')

  const isSlide = step < 4
  const slide   = isSlide ? SLIDES[step] : null

  function next()  { setStep(s => s + 1) }
  function finish() {
    onComplete({
      name:        name.trim() || 'Friend',
      walkStage:   stage,
      companionId,
      joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }

  function goToAuth() {
    try {
      localStorage.setItem('dw_user', JSON.stringify({ name: name.trim() || 'Friend', walkStage: stage, companionId }))
      localStorage.setItem('dw_onboarding_complete', 'true')
    } catch {}
    router.push('/auth?mode=signup&next=/profile')
  }

  const STAGES = ['Just starting', 'Growing', 'Recommitting', 'Consistent']
  const selectedChar = CHARACTERS.find(ch => ch.id === companionId) || CHARACTERS[0]

  // ── FOOTER HEIGHT — clears bottom nav (64px) + safe area + padding ──
  // Onboarding is fullscreen (fixed inset-0) and sits above the bottom nav,
  // so the footer just needs enough padding to not be clipped.
  // We use a fixed 88px bottom padding = bottom nav height (64px) + 24px breathing room.
  const FOOTER_PB = 88

  return (
    // fixed inset-0 ensures it covers the full viewport including behind bottom nav
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: isSlide ? slide.bg : c.bg }}>

      <AnimatePresence mode="wait">

        {/* ── SLIDE STEPS 0–3 ── */}
        {isSlide && (
          <motion.div key={`slide-${step}`} className="flex flex-col h-full"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}>

            {/* Skip — always visible top right */}
            <div className="flex justify-end px-5 pt-safe pt-6 flex-shrink-0">
              <button onClick={finish}
                className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
                style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.18)' }}>
                Skip
              </button>
            </div>

            {/* Illustration — flex-1 so it fills the space between skip and footer */}
            <div className="flex-1 flex items-center justify-center px-8 min-h-0">
              <div style={{ width: '100%', maxWidth: 320, aspectRatio: '320/260' }}>
                {slide.Illustration && <slide.Illustration />}
              </div>
            </div>

            {/* Text */}
            <div className="flex-shrink-0 px-7 pb-4 text-center">
              <h1 className="font-display font-bold text-white"
                style={{ fontSize: 'clamp(21px,5.5vw,28px)', lineHeight: 1.2 }}>
                {slide.title}
              </h1>
              <p className="text-white/80 mt-3 leading-relaxed"
                style={{ fontSize: 'clamp(13px,3.5vw,15px)' }}>
                {slide.subtitle}
              </p>
            </div>

            {/* Fixed-to-screen footer — never hidden behind nav bar */}
            <div className="flex-shrink-0 px-5 pt-3"
              style={{ paddingBottom: FOOTER_PB }}>
              <div className="flex items-center justify-between mb-4">
                <Dots current={step} total={4} />
                <div />
              </div>
              <button onClick={next}
                className="w-full py-4 rounded-full font-bold text-[15px] transition-all active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.96)', color: slide.btnColor }}>
                {step < 3 ? 'Next →' : 'Choose your companion →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── COMPANION STEP 4 ── */}
        {step === 4 && (
          <motion.div key="companion" className="flex flex-col h-full"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ background: c.bg }}>

            <div className="flex items-center justify-between px-5 pt-safe pt-6 flex-shrink-0">
              <div>
                <h2 className="font-display font-bold text-[22px]" style={{ color: c.text }}>Choose your companion</h2>
                <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>They'll walk with you through every season</p>
              </div>
              <button onClick={finish} className="text-[12px] font-semibold ml-3" style={{ color: c.textFaint }}>Skip</button>
            </div>

            {/* Scrollable companion grid */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
              style={{ paddingBottom: 16 }}>
              <div className="grid grid-cols-2 gap-3">
                {CHARACTERS.map(ch => (
                  <CompanionCard key={ch.id} character={ch} selected={companionId === ch.id}
                    onSelect={setCompanionId} dark={dark} />
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 px-5 pt-3 border-t"
              style={{ paddingBottom: FOOTER_PB, borderColor: c.border, background: c.bg }}>
              <button onClick={next}
                className="w-full py-4 rounded-full font-bold text-[15px] text-white transition-all active:scale-[0.97]"
                style={{ background: '#5B4FCF' }}>
                Walk with {selectedChar.name} →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ACCOUNT STEP 5 ── */}
        {step === 5 && (
          <motion.div key="account" className="flex flex-col h-full"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ background: c.bg }}>

            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 min-h-0">
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-28 h-28 rounded-[28px] flex items-center justify-center text-[56px]"
                style={{ background: dark ? '#2A244A' : '#EDE9FF' }}>
                ☁️
              </motion.div>
              <div>
                <h2 className="font-display font-bold text-[26px]" style={{ color: c.text }}>Save your progress</h2>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: c.textMuted }}>
                  Create a free account to back up your streak, plans, and reading history across devices.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
                {[
                  ['🔥', 'Streak & check-ins backed up'],
                  ['📖', 'Plans synced across devices'],
                  ['🙏', 'Community access when it launches'],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
                    style={{ background: c.bgCard, boxShadow: c.shadow }}>
                    <span className="text-[18px]">{icon}</span>
                    <p className="text-[13px] font-semibold" style={{ color: c.text }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 px-5 pt-3 border-t flex flex-col gap-3"
              style={{ paddingBottom: FOOTER_PB, borderColor: c.border, background: c.bg }}>
              <button onClick={goToAuth}
                className="w-full py-4 rounded-full font-bold text-[15px] text-white active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
                Create free account →
              </button>
              <button onClick={finish}
                className="text-[13px] font-semibold text-center py-1"
                style={{ color: c.textFaint }}>
                Skip — continue as guest
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}