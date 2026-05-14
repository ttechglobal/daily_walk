// ── lib/character-state.js — Encouragement-first mood logic ──
// The character is ALWAYS encouraging. Tone shifts, never guilt.

export function getCharacterMood(checkedInToday, daysMissed, isFirstOpenToday) {
  if (checkedInToday)                       return 'celebrating'
  if (isFirstOpenToday || daysMissed === 0) return 'welcoming'
  if (daysMissed === 1)                     return 'gentle_nudge'
  if (daysMissed <= 3)                      return 'missing_you'
  if (daysMissed <= 6)                      return 'concerned'
  return 'waiting'
}

export const MOOD_TO_STATE = {
  celebrating:  'radiant',
  welcoming:    'happy',
  gentle_nudge: 'neutral',
  missing_you:  'quiet',
  concerned:    'sad',
  waiting:      'struggling',
}

// Always encouraging labels — mapped from mood
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