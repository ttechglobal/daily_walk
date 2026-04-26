'use client'

// ── PersistentMusicUI — Update 4a + Update 2 ──
// Renders the MiniPlayer (above nav, when music plays).
// Also exports a hook used by BottomNav to hide itself on /read.

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { MiniPlayer, MusicSheet } from './MusicPlayer'
import { useMusic } from '../contexts/MusicContext'

export default function PersistentMusicUI() {
  const { playing } = useMusic()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
        {playing && <MiniPlayer onOpen={() => setSheetOpen(true)} />}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && <MusicSheet onClose={() => setSheetOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

/** Used by BottomNav and layout to detect the /read route */
export function useIsReadPage() {
  return usePathname() === '/read'
}