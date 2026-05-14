'use client'

// ── CharacterPicker — companion selection sheet ──
// Shows real SVG images (happy state) with emoji+name fallback.
// Used in onboarding step 2 and Profile settings.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { CHARACTERS } from '../lib/characters'
import { getImagePath } from '../lib/character-state'

function CharacterCard({ character, selected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false)
  const color    = character.accentColor
  const imageSrc = getImagePath(character.id, 'happy')

  return (
    <motion.button
      onClick={() => onSelect(character.id)}
      whileTap={{ scale:0.96 }}
      className="flex flex-col items-center gap-2 p-3 rounded-[20px] text-left relative transition-all"
      style={{
        background:  selected ? `${color}12` : 'white',
        border:      `2px solid ${selected ? color : '#F0EDE8'}`,
        boxShadow:   selected
          ? `0 0 0 2px ${color}30, 0 4px 16px rgba(0,0,0,0.06)`
          : '0 2px 10px rgba(0,0,0,0.05)',
      }}>

      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale:0, opacity:0 }}
            animate={{ scale:1, opacity:1 }}
            exit={{ scale:0, opacity:0 }}
            className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
            style={{ background:color }}>
            <Check size={11} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character image */}
      <div className="relative w-full flex items-center justify-center rounded-[16px] overflow-hidden"
        style={{ height:110, background:`${color}10` }}>
        <img
          src={imageSrc}
          alt={`${character.name}`}
          onLoad={e  => { e.target.style.opacity = '1' }}
          onError={e => { e.target.style.display = 'none'; setImgFailed(true) }}
          style={{ width:'100%', height:'100%', objectFit:'contain', opacity:0,
                   transition:'opacity 0.3s ease' }}
        />
        {imgFailed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize:40 }}>{character.placeholderEmoji}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="w-full text-center">
        <p className="font-display font-semibold text-[14px]" style={{ color:'#1A1A2E' }}>
          {character.name}
        </p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>
          {character.title}
        </p>
        <p className="text-[10px] mt-1 leading-snug line-clamp-2 italic"
          style={{ color:'#9CA3AF' }}>
          "{character.signatureVerse}"
        </p>
      </div>
    </motion.button>
  )
}

export default function CharacterPicker({ currentId = 'david', onConfirm, onClose }) {
  const [selected, setSelected] = useState(currentId)

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'88dvh' }}
        initial={{ y:'100%' }}
        animate={{ y:0 }}
        exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>

        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="font-display font-bold text-[22px]" style={{ color:'#1A1A2E' }}>
              Choose your companion
            </p>
            <p className="text-[13px] mt-0.5" style={{ color:'#9CA3AF' }}>
              They will walk with you and reflect your spiritual health
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center ml-3"
            style={{ color:'#6B7280' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-8 scroll-hide">
          {/* 2×2 grid */}
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

          <button
            onClick={() => onConfirm?.(selected)}
            className="mt-5 w-full text-white rounded-full py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'#5B4FCF' }}>
            Walk with {CHARACTERS.find(c => c.id === selected)?.name || 'them'}
          </button>
        </div>
      </motion.div>
    </>
  )
}