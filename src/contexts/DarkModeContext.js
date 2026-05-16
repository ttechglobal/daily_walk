'use client'

// ── src/contexts/DarkModeContext.js ──
// Global dark mode — one toggle, everywhere.
// Applies `data-theme="dark"` to <html> so CSS variables cascade automatically.
// Reads from localStorage on mount (no flash thanks to inline script in layout).
// Export useDarkMode() from any component — no prop drilling needed.

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const DarkModeContext = createContext({ dark: false, toggle: () => {}, setDark: () => {} })

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dw_dark_mode')
      const isDark = stored === 'true'
      setDark(isDark)
      applyTheme(isDark)
    } catch {}
    setReady(true)
  }, [])

  function applyTheme(isDark) {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    if (isDark) {
      html.setAttribute('data-theme', 'dark')
      html.classList.add('dark')
    } else {
      html.removeAttribute('data-theme')
      html.classList.remove('dark')
    }
  }

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev
      try { localStorage.setItem('dw_dark_mode', String(next)) } catch {}
      applyTheme(next)
      return next
    })
  }, [])

  const setDarkMode = useCallback((val) => {
    setDark(val)
    try { localStorage.setItem('dw_dark_mode', String(val)) } catch {}
    applyTheme(val)
  }, [])

  return (
    <DarkModeContext.Provider value={{ dark, toggle, setDark: setDarkMode, ready }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  return useContext(DarkModeContext)
}

// ── Colour tokens — import these instead of hardcoding hex values ──
// Use: const { colors } = useDarkMode()  ← but inline styles are fine too
export function getDarkModeColors(dark) {
  return {
    // Backgrounds
    bg:          dark ? '#0F1117' : '#FAF8F5',
    bgCard:      dark ? '#1A1A2E' : '#FFFFFF',
    bgCardAlt:   dark ? '#1E2035' : '#F8F7FF',
    bgInput:     dark ? '#1A1A2E' : '#FFFFFF',
    bgMuted:     dark ? '#252840' : '#F0EDE8',
    bgNav:       dark ? '#0F1117' : '#FFFFFF',
    bgNavBorder: dark ? '#252840' : '#F0F0F0',
    // Text
    text:        dark ? '#E8E4DC' : '#1A1A2E',
    textMuted:   dark ? '#8A8FA8' : '#6B7280',
    textFaint:   dark ? '#555A72' : '#9CA3AF',
    // Borders
    border:      dark ? '#252840' : '#F0EDE8',
    borderInput: dark ? '#2E3250' : '#E5E7EB',
    // Accent (unchanged)
    purple:      '#5B4FCF',
    purpleLight: dark ? '#2A244A' : '#EDE9FF',
    sage:        '#4A7C5F',
    sageLight:   dark ? '#1A2E22' : '#E8F4ED',
    amber:       '#E8A838',
    amberLight:  dark ? '#2E2210' : '#FFF4DC',
    // Shadows
    shadow:      dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.07)',
    shadowHeavy: dark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.14)',
  }
}