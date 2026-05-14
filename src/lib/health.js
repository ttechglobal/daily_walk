// ── lib/health.js — Spiritual health calculation ──
// Labels are always encouraging — never negative.

export function calculateHealth(streak, daysMissed) {
  const streakHealth = Math.min(streak * 8, 80)
  const missPenalty  = daysMissed * 20
  return Math.max(0, Math.min(100, streakHealth - missPenalty))
}

// Maps health score to a visual state key
export function getCharacterState(health) {
  if (health >= 85) return 'radiant'
  if (health >= 65) return 'happy'
  if (health >= 50) return 'neutral'
  if (health >= 35) return 'quiet'
  if (health >= 20) return 'sad'
  if (health >= 8)  return 'struggling'
  return 'fading'
}

// Always-encouraging human-readable label
export function getHealthLabel(health) {
  if (health >= 85) return 'Radiant ✨'
  if (health >= 65) return 'Thriving'
  if (health >= 50) return 'Growing'
  if (health >= 35) return 'Needs a nudge'
  if (health >= 20) return 'Needs care'
  if (health >= 8)  return 'Come back'
  return 'Waiting for you'
}

// Health bar colour — purple (high) → amber (mid) → soft grey (low)
export function getHealthColor(health) {
  if (health >= 50) return '#5B4FCF'
  if (health >= 20) return '#E8A838'
  return '#9CA3AF'
}