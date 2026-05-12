// ─────────────────────────────────────────────────────────────
//  lib/plans.js — Plans feature helpers
// ─────────────────────────────────────────────────────────────

/** Read plans array from localStorage safely */
export function readPlans() {
  try {
    const raw = localStorage.getItem('dw_plans')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/** Write plans array to localStorage */
export function writePlans(plans) {
  try { localStorage.setItem('dw_plans', JSON.stringify(plans)) } catch {}
}

/** Returns the first active plan that has today's reading incomplete */
export function getTodaysPlan(plans) {
  const today = new Date().toISOString().split('T')[0]
  return (plans || []).find(p => {
    if (p.status !== 'active') return false
    const day = p.days[p.currentDay - 1]
    if (!day) return false
    return !day.completedAt
  }) || null
}

/** Mark a specific day complete, advance currentDay, complete plan if done */
export function markDayComplete(planId, dayNumber, reflection = '') {
  const plans = readPlans()
  const updated = plans.map(p => {
    if (p.id !== planId) return p
    const days = p.days.map(d =>
      d.day === dayNumber
        ? { ...d, completedAt: new Date().toISOString(), reflection }
        : d
    )
    const nextDay     = Math.min(p.currentDay + 1, p.totalDays + 1)
    const allDone     = days.every(d => d.completedAt)
    return {
      ...p,
      days,
      currentDay: nextDay,
      status: allDone ? 'completed' : p.status,
    }
  })
  writePlans(updated)
}

/** Adjust pace — recalculate estimated end date */
export function adjustPace(planId, newPace) {
  const plans = readPlans()
  const updated = plans.map(p => {
    if (p.id !== planId) return p
    const remaining   = p.totalDays - p.currentDay + 1
    const end         = new Date()
    end.setDate(end.getDate() + remaining)
    return { ...p, pace: newPace, estimatedEndDate: end.toISOString().split('T')[0] }
  })
  writePlans(updated)
}

/** Returns 0–100 completion percentage */
export function getPlanProgress(plan) {
  if (!plan?.days?.length) return 0
  const done = plan.days.filter(d => d.completedAt).length
  return Math.round((done / plan.totalDays) * 100)
}

/** Build a Book plan's days array from BIBLE_BOOKS data */
export function buildBookPlanDays(book, paceLabel) {
  // Each day = one chapter for simplicity; pace adjusts estimatedEndDate
  return Array.from({ length: book.chapters }, (_, i) => ({
    day:         i + 1,
    passage:     `${book.name} ${i + 1}`,
    title:       `${book.name} Chapter ${i + 1}`,
    focus:       '',
    completedAt: null,
    reflection:  '',
  }))
}

/** Calculate estimated end date given totalDays from today */
export function calcEndDate(totalDays) {
  const d = new Date()
  d.setDate(d.getDate() + totalDays - 1)
  return d.toISOString().split('T')[0]
}

/** Format a date string as "May 24, 2026" */
export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * prefetchPlanPassages — pre-fetch all plan passages on creation.
 * Service worker caches each response (CacheFirst, 365 days).
 * Runs in the background — UI is not blocked.
 * If offline: silently skips, passages cache on first read instead.
 */
export async function prefetchPlanPassages(days) {
  const promises = days.map(day =>
    fetch(`https://bible-api.com/${encodeURIComponent(day.passage)}?translation=kjv`)
      .catch(() => null) // silent fail — will cache on first read
  )
  await Promise.allSettled(promises)
}