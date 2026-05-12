// ─────────────────────────────────────────────────────────────
//  lib/health.js — Spiritual health calculation
// ─────────────────────────────────────────────────────────────

/** 0–100 health score based on streak and missed days */
export function calculateHealth(streak, daysMissed) {
  const streakHealth = Math.min(streak * 8, 80)
  const missPenalty  = daysMissed * 20
  return Math.max(0, Math.min(100, streakHealth - missPenalty))
}

/** CharacterState from health score */
export function getCharacterState(health) {
  if (health >= 85) return 'radiant'
  if (health >= 65) return 'happy'
  if (health >= 50) return 'neutral'
  if (health >= 35) return 'quiet'
  if (health >= 20) return 'sad'
  if (health >= 8)  return 'struggling'
  return 'fading'
}

/** Human-readable health label */
export function getHealthLabel(health) {
  if (health >= 85) return 'Radiant'
  if (health >= 65) return 'Thriving'
  if (health >= 50) return 'Doing well'
  if (health >= 35) return 'A little quiet'
  if (health >= 20) return 'Needs care'
  if (health >= 8)  return 'Struggling'
  return 'Fading...'
}

/** Health bar colour — interpolates purple → amber */
export function getHealthColor(health) {
  if (health >= 50) return '#5B4FCF'
  if (health >= 20) return '#E8A838'
  return '#C0392B'
}