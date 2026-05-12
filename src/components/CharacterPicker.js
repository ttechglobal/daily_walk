'use client'

// ── CharacterPicker — Update 3 ──
// Bottom sheet for selecting a companion character.
// Used in onboarding step 2 and Profile settings.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { CHARACTERS } from '../lib/characters'

function CharacterCard({ character, selected, onSelect }) {
  const color = character.accentColor
  return (
    <button
      onClick={() => onSelect(character.id)}
      className="flex flex-col items-center gap-2 p-3 rounded-[16px] text-left transition-all relative"
      style={{
        background: selected ? `${color}15` : 'white',
        border: `2px solid ${selected ? color : '#F0EDE8'}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: selected ? `0 0 0 1px ${color}33` : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: color }}>
          <Check size={11} className="text-white" />
        </div>
      )}

      {/* Placeholder visual */}
      <div className="w-full h-[90px] rounded-[12px] flex flex-col items-center justify-center"
        style={{ background: `${color}18` }}>
        <span style={{ fontSize: 36 }}>{character.placeholderEmoji}</span>
      </div>

      <div className="w-full">
        <p className="font-display font-semibold text-[14px]" style={{ color: '#1A1A2E' }}>
          {character.name}
        </p>
        <p className="text-[11px] font-semibold" style={{ color }}>
          {character.title}
        </p>
        <p className="text-[11px] mt-1 leading-snug line-clamp-2" style={{ color: '#9CA3AF' }}>
          "{character.signatureVerse}"
        </p>
      </div>
    </button>
  )
}

export default function CharacterPicker({ currentId = 'david', onConfirm, onClose }) {
  const [selected, setSelected] = useState(currentId)

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '90dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="font-display text-[22px] font-bold" style={{ color: '#1A1A2E' }}>
              Choose your companion
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>
              They will walk with you on your journey
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3 flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* 2x2 grid */}
        <div className="overflow-y-auto scroll-hide px-5 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.map(character => (
              <CharacterCard
                key={character.id}
                character={character}
                selected={selected === character.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Confirm */}
        <div className="px-5 pb-10 pt-3 border-t border-gray-100">
          <button
            onClick={() => onConfirm(selected)}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background: '#5B4FCF' }}
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </>
  )
}