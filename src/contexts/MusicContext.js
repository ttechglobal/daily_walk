'use client'

// ── MusicContext — Update 2 ──
// Single Audio element shared across all pages via React Context.
// Prevents music stopping on navigation. Volume: 40%.

import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'

export const TRACKS = [
  { id: 1,  title: "Still Waters",    artist: "Worship Instrumentals", duration: "4:32", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"  },
  { id: 2,  title: "Morning Glory",   artist: "Worship Instrumentals", duration: "3:58", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"  },
  { id: 3,  title: "Abide With Me",   artist: "Worship Instrumentals", duration: "5:10", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"  },
  { id: 4,  title: "Quiet Strength",  artist: "Worship Instrumentals", duration: "4:15", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"  },
  { id: 5,  title: "Holy Ground",     artist: "Worship Instrumentals", duration: "3:44", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"  },
  { id: 6,  title: "Sanctuary",       artist: "Worship Instrumentals", duration: "4:50", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"  },
  { id: 7,  title: "Draw Me Close",   artist: "Worship Instrumentals", duration: "3:30", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"  },
  { id: 8,  title: "Ancient of Days", artist: "Worship Instrumentals", duration: "5:22", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"  },
  { id: 9,  title: "Emmanuel",        artist: "Worship Instrumentals", duration: "4:05", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"  },
  { id: 10, title: "Be Still",        artist: "Worship Instrumentals", duration: "4:48", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
]

const MusicContext = createContext(null)

export function MusicProvider({ children }) {
  const audioRef                    = useRef(null)
  const [playing,    setPlaying]    = useState(false)
  const [trackIdx,   setTrackIdx]   = useState(0)

  useEffect(() => {
    const audio  = new Audio(TRACKS[0].url)
    audio.loop   = false
    audio.volume = 0.4
    audioRef.current = audio

    // Auto-advance when track ends
    function onEnded() {
      setTrackIdx(prev => {
        const next = (prev + 1) % TRACKS.length
        if (audioRef.current) {
          audioRef.current.src = TRACKS[next].url
          audioRef.current.play().catch(() => {})
        }
        return next
      })
    }
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  const playTrack = useCallback((idx) => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = TRACKS[idx].url
    audio.play().catch(() => {})
    setTrackIdx(idx)
    setPlaying(true)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }, [playing])

  const skipBack    = useCallback(() => playTrack((trackIdx - 1 + TRACKS.length) % TRACKS.length), [trackIdx, playTrack])
  const skipForward = useCallback(() => playTrack((trackIdx + 1) % TRACKS.length),                 [trackIdx, playTrack])

  return (
    <MusicContext.Provider value={{ playing, trackIdx, togglePlay, playTrack, skipBack, skipForward }}>
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error('useMusic must be inside MusicProvider')
  return ctx
}