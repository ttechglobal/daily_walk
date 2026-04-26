'use client'

// ── MusicPlayer — Update 2 ──
// Two parts:
//   1. MiniPlayer  — persistent bar above nav when music is playing
//   2. MusicSheet  — full track list bottom sheet (opened from home header or mini bar)
// Both consume MusicContext — no prop drilling needed.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music2, X, SkipBack, Play, Pause, SkipForward } from 'lucide-react'
import { useMusic, TRACKS } from '../contexts/MusicContext'

// ── Full music sheet ──
export function MusicSheet({ onClose }) {
  const { playing, trackIdx, togglePlay, playTrack, skipBack, skipForward } = useMusic()

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '85dvh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Music2 size={18} className="text-purple" />
            <span className="font-bold text-text-primary text-[17px]">Worship Music</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Track list */}
        <div className="overflow-y-auto flex-1 px-4 pb-3 scroll-hide">
          {TRACKS.map((track, idx) => {
            const isActive = trackIdx === idx
            return (
              <button
                key={track.id}
                onClick={() => playTrack(idx)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-all text-left ${
                  isActive ? 'bg-purple text-white' : 'hover:bg-gray-100 text-text-primary'
                }`}
              >
                {/* Track number */}
                <span className={`text-[13px] font-bold w-6 text-center flex-shrink-0 ${isActive ? 'text-white/70' : 'text-text-muted'}`}>
                  {isActive && playing ? '♪' : track.id}
                </span>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-[14px] truncate ${isActive ? 'text-white' : 'text-text-primary'}`}>
                    {track.title}
                  </p>
                  <p className={`text-[12px] truncate ${isActive ? 'text-white/70' : 'text-text-muted'}`}>
                    {track.artist}
                  </p>
                </div>

                {/* Duration */}
                <span className={`text-[12px] font-semibold flex-shrink-0 ${isActive ? 'text-white/70' : 'text-text-muted'}`}>
                  {track.duration}
                </span>
              </button>
            )
          })}
        </div>

        {/* Global playback controls */}
        <div className="border-t border-gray-100 px-5 py-4 pb-8 bg-warm-bg">
          {/* Now playing label */}
          <p className="text-text-muted text-[12px] font-semibold text-center mb-3">
            {playing ? `Now playing: ${TRACKS[trackIdx].title}` : `${TRACKS[trackIdx].title}`}
          </p>
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={skipBack}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-text-primary transition-colors"
              aria-label="Previous track"
            >
              <SkipBack size={22} />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-purple text-white flex items-center justify-center shadow-purple hover:bg-purple-dark transition-colors active:scale-95"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
            <button
              onClick={skipForward}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-text-primary transition-colors"
              aria-label="Next track"
            >
              <SkipForward size={22} />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Mini player — shown above nav when playing ──
export function MiniPlayer({ onOpen }) {
  const { playing, trackIdx, togglePlay } = useMusic()
  if (!playing) return null

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[396px] z-40"
    >
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 bg-purple text-white px-4 py-2.5 rounded-2xl shadow-purple"
      >
        <Music2 size={15} className="flex-shrink-0" />
        <span className="flex-1 text-[13px] font-semibold truncate text-left">
          {TRACKS[trackIdx].title}
        </span>
        {/* Inline pause — stops propagation so it doesn't open sheet */}
        <button
          onClick={e => { e.stopPropagation(); togglePlay() }}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label="Pause"
        >
          <Pause size={13} />
        </button>
      </button>
    </motion.div>
  )
}

// ── Music button for home header (exported for use in page.js) ──
export function MusicButton() {
  const [open, setOpen] = useState(false)
  const { playing } = useMusic()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center text-white transition-colors ${
          playing ? 'bg-purple/80' : 'bg-white/20 hover:bg-white/30'
        }`}
        aria-label="Open music player"
      >
        <Music2 size={18} />
      </button>

      <AnimatePresence>
        {open && <MusicSheet onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}