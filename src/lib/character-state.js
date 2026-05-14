// ── lib/character-state.js ──
// Maps check-in state → character image state and messages.
// Images live at: /characters/{id}/{id}-{state}.svg
// Drop real SVGs in those paths — they work automatically.

/**
 * The 6 image states that map directly to SVG filenames.
 * No "fading" state — it was removed. Max negative state is "struggling".
 */

/** Returns the image state based on check-in and streak data. */
export function getCharacterImageState(checkedInToday, daysMissed, streakDays) {
  const dayOfYear = getDayOfYear()

  if (checkedInToday) {
    // Long streak → always radiant
    if (streakDays >= 7) return 'radiant'
    // Rotate between positive states daily — feels fresh, not random
    const r = dayOfYear % 3
    return r === 0 ? 'radiant' : r === 1 ? 'happy' : 'neutral'
  }

  if (daysMissed <= 0) return 'neutral'    // opened app, not yet read
  if (daysMissed === 1) return 'quiet'     // missed yesterday
  if (daysMissed <= 3)  return 'sad'       // 2-3 days
  return 'struggling'                      // 4+ days
}

/** Full image path for a character + state. */
export function getImagePath(characterId, state) {
  return `/characters/${characterId}/${characterId}-${state}.svg`
}

/** Day of year (1–365) — used for daily state rotation. */
export function getDayOfYear() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

/** Days since last check-in (0 if never checked in). */
export function getDaysMissed(lastCheckinDate) {
  if (!lastCheckinDate) return 0
  const last  = new Date(lastCheckinDate)
  const today = new Date()
  last.setHours(0,0,0,0); today.setHours(0,0,0,0)
  return Math.max(0, Math.floor((today.getTime() - last.getTime()) / 86_400_000))
}

// ── Legacy mood system (kept for HEALTH_LABELS in CharacterCompanion) ──

export function getCharacterMood(checkedInToday, daysMissed, isFirstOpenToday) {
  if (checkedInToday)                       return 'celebrating'
  if (isFirstOpenToday || daysMissed === 0) return 'welcoming'
  if (daysMissed === 1)                     return 'gentle_nudge'
  if (daysMissed <= 3)                      return 'missing_you'
  if (daysMissed <= 6)                      return 'concerned'
  return 'waiting'
}

export const HEALTH_LABELS = {
  celebrating:  'Growing strong 🔥',
  welcoming:    'Ready to grow',
  gentle_nudge: 'Keep going',
  missing_you:  'Come back',
  concerned:    'Needs attention',
  waiting:      'Waiting for you',
}

export function checkAndMarkFirstOpenToday() {
  if (typeof window === 'undefined') return false
  try {
    const today   = new Date().toISOString().split('T')[0]
    const last    = localStorage.getItem('dw_last_opened')
    const isFirst = last !== today
    if (isFirst) localStorage.setItem('dw_last_opened', today)
    return isFirst
  } catch { return false }
}