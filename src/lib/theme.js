// ── src/lib/theme.js ──
// THE ONLY place colours are defined.
// Every page and component imports from here — no hardcoded hex anywhere else.
// Usage: const t = useTheme()  OR  const t = getTheme(dark)

export const LIGHT = {
  // Backgrounds
  bg:          '#FAF8F5',   // page background
  bgCard:      '#FFFFFF',   // card / sheet surface
  bgCardAlt:   '#F8F7FF',   // slightly tinted card (e.g. scripture blocks)
  bgMuted:     '#F0EDE8',   // tab bars, pill backgrounds, skeleton
  bgInput:     '#FFFFFF',   // input fields
  bgNav:       '#FFFFFF',   // bottom nav + top header

  // Text
  text:        '#1A1A2E',   // primary text
  textMuted:   '#6B7280',   // secondary / label text
  textFaint:   '#9CA3AF',   // timestamps, hints, placeholders

  // Borders & dividers
  border:      '#F0EDE8',
  borderInput: '#E5E7EB',

  // Elevation
  shadow:      '0 2px 12px rgba(0,0,0,0.07)',
  shadowMd:    '0 4px 20px rgba(0,0,0,0.10)',
  shadowHeavy: '0 8px 32px rgba(0,0,0,0.14)',

  // Brand accent shortcuts
  purple:      '#5B4FCF',
  purpleBg:    '#EDE9FF',
  sage:        '#4A7C5F',
  sageBg:      '#E8F4ED',
  amber:       '#E8A838',
  amberBg:     '#FFF4DC',
  red:         '#E84060',
  redBg:       '#FFF0F3',
}

export const DARK = {
  // Backgrounds
  bg:          '#111318',   // true dark page bg — slightly blue-tinted, not pure black
  bgCard:      '#1C1C2A',   // card / sheet surface
  bgCardAlt:   '#1E2035',   // slightly lighter card variant
  bgMuted:     '#252840',   // tab bars, pill backgrounds, skeleton
  bgInput:     '#1C1C2A',   // input fields
  bgNav:       '#111318',   // bottom nav + top header

  // Text
  text:        '#EAE6DE',   // primary — warm off-white, easier on eyes than pure white
  textMuted:   '#8A8FA8',   // secondary
  textFaint:   '#50546A',   // timestamps, hints

  // Borders & dividers
  border:      '#252840',
  borderInput: '#2E3258',

  // Elevation
  shadow:      '0 2px 12px rgba(0,0,0,0.5)',
  shadowMd:    '0 4px 20px rgba(0,0,0,0.6)',
  shadowHeavy: '0 8px 32px rgba(0,0,0,0.7)',

  // Brand accent shortcuts (unchanged — brand colours stay consistent)
  purple:      '#5B4FCF',
  purpleBg:    '#2A244A',
  sage:        '#4A7C5F',
  sageBg:      '#1A2E22',
  amber:       '#E8A838',
  amberBg:     '#2E2210',
  red:         '#E84060',
  redBg:       '#2E0F18',
}

/** Get theme tokens for a given dark boolean */
export function getTheme(dark) {
  return dark ? DARK : LIGHT
}

/** React hook — reads from DarkModeContext */
export { useDarkMode } from '../contexts/DarkModeContext'

import { useDarkMode as _useDarkMode } from '../contexts/DarkModeContext'

export function useTheme() {
  const { dark, toggle } = _useDarkMode()
  return { t: getTheme(dark), dark, toggle }
}