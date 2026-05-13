// ─────────────────────────────────────────────────────────────
//  lib/character-state.js — Encouragement-first mood logic
//
//  Core principle: The character is ALWAYS encouraging.
//  It never makes the user feel guilty. It reflects their
//  journey with warmth and grace.
// ─────────────────────────────────────────────────────────────

/**
 * CharacterMood — maps to a visual state and message set.
 * 'fading' state is intentionally excluded — never shown.
 */

/** Get mood based on check-in state and missed days */
export function getCharacterMood(checkedInToday, daysMissed, isFirstOpenToday) {
  if (checkedInToday)                          return 'celebrating'
  if (isFirstOpenToday || daysMissed === 0)    return 'welcoming'
  if (daysMissed === 1)                        return 'gentle_nudge'
  if (daysMissed <= 3)                         return 'missing_you'
  if (daysMissed <= 6)                         return 'concerned'
  return 'waiting'
}

/** Maps mood to a character visual state (for placeholder animations) */
export const MOOD_TO_STATE = {
  celebrating:  'radiant',
  welcoming:    'happy',
  gentle_nudge: 'neutral',
  missing_you:  'quiet',
  concerned:    'sad',
  waiting:      'struggling',
}

/** Health bar labels — always encouraging */
export const HEALTH_LABELS = {
  celebrating:  'Growing strong',
  welcoming:    'Ready to grow',
  gentle_nudge: 'Keep going',
  missing_you:  'Come back',
  concerned:    'Needs attention',
  waiting:      'Waiting for you',
}

/**
 * Track whether this is the first time the app is opened today.
 * Reads/writes 'dw_last_opened' in localStorage.
 * Returns true if first open today, then updates the timestamp.
 */
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