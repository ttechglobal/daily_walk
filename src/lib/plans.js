// ── lib/plans.js — Plans feature helpers ──
// Update: buildPlanShareUrl no longer uses require() — safe in client components

function today() { return new Date().toISOString().split('T')[0] }

export function readPlans() {
  try { const r = localStorage.getItem('dw_plans'); return r ? JSON.parse(r) : [] } catch { return [] }
}
export function writePlans(plans) {
  try { localStorage.setItem('dw_plans', JSON.stringify(plans)) } catch {}
}

/** Returns the first active plan whose current day is NOT completed today */
export function getTodaysPlan(plans) {
  return (plans || []).find(p => {
    if (p.status !== 'active') return false
    const day = p.days[p.currentDay - 1]
    if (!day) return false
    return !day.completedAt || !day.completedAt.startsWith(today())
  }) || null
}

/** True if current day is already marked complete today */
export function isPlanCompletedToday(plan) {
  if (!plan) return false
  const day = plan.days[plan.currentDay - 1]
  if (!day) return false
  return !!day.completedAt && day.completedAt.startsWith(today())
}

/** Mark today's day complete — DO NOT advance currentDay here.
 *  Advancement happens next day via advancePlanIfNeeded(). */
export function markDayComplete(planId, dayNumber, reflection = '') {
  const plans   = readPlans()
  const updated = plans.map(p => {
    if (p.id !== planId) return p
    const days = p.days.map(d =>
      d.day === dayNumber
        ? { ...d, completedAt: new Date().toISOString(), reflection }
        : d
    )
    const allDone = days.every(d => d.completedAt)
    return { ...p, days, status: allDone ? 'completed' : p.status }
  })
  writePlans(updated)
}

/** Call on app load / plans page open.
 *  If current day was completed before today → advance currentDay. */
export function advancePlanIfNeeded(planId) {
  const plans = readPlans()
  const plan  = plans.find(p => p.id === planId)
  if (!plan || plan.status !== 'active') return

  const currentDay = plan.days[plan.currentDay - 1]
  if (!currentDay?.completedAt) return

  const completedDate = currentDay.completedAt.split('T')[0]
  if (completedDate < today() && plan.currentDay < plan.totalDays) {
    const updated = plans.map(p => {
      if (p.id !== planId) return p
      const nextDay = p.currentDay + 1
      return {
        ...p,
        currentDay: nextDay,
        status: nextDay > p.totalDays ? 'completed' : p.status,
      }
    })
    writePlans(updated)
  }
}

/** Advance all active plans that need it — call once on app load */
export function advanceAllPlans() {
  const plans = readPlans()
  plans.forEach(p => { if (p.status === 'active') advancePlanIfNeeded(p.id) })
}

export function adjustPace(planId, newPace) {
  const plans   = readPlans()
  const updated = plans.map(p => {
    if (p.id !== planId) return p
    const remaining = p.totalDays - p.currentDay + 1
    const end       = new Date()
    end.setDate(end.getDate() + remaining)
    return { ...p, pace: newPace, estimatedEndDate: end.toISOString().split('T')[0] }
  })
  writePlans(updated)
}

export function getPlanProgress(plan) {
  if (!plan?.days?.length) return 0
  return Math.round((plan.days.filter(d => d.completedAt).length / plan.totalDays) * 100)
}

export function buildBookPlanDays(book, pace) {
  return Array.from({ length: book.chapters }, (_, i) => ({
    day:         i + 1,
    passage:     `${book.name} ${i + 1}`,
    title:       `${book.name} Chapter ${i + 1}`,
    focus:       '',
    completedAt: null,
    reflection:  '',
  }))
}

export function calcEndDate(totalDays) {
  const d = new Date()
  d.setDate(d.getDate() + totalDays - 1)
  return d.toISOString().split('T')[0]
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
}

export async function prefetchPlanPassages(days) {
  const promises = days.map(day =>
    fetch(`https://bible-api.com/${encodeURIComponent(day.passage)}?translation=kjv`).catch(() => null)
  )
  await Promise.allSettled(promises)
}

/**
 * Build a short shareable URL for a plan.
 * Stores a preview snapshot in localStorage so the landing page can read it.
 * URL format: /plan/{slug}-{shortId}
 *
 * FIX: No longer uses require('./config') — that crashes in client components.
 * Uses window.location.origin directly (safe — this is always called client-side).
 */
export function buildPlanShareUrl(plan) {
  // Safe client-side origin — no require(), no import at call time
  const origin  = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalk.app')

  const slug    = (plan.name || 'plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24)

  const shortId = (plan.id || '').slice(-8)
  const urlId   = `${slug}-${shortId}`

  // Store preview data so the landing page can read it without an API call
  const preview = {
    name:    plan.name,
    desc:    plan.description || '',
    days:    plan.totalDays,
    type:    plan.type || 'topic',
    preview: (plan.days || []).slice(0, 3).map(d => ({
      day: d.day, passage: d.passage, title: d.title, focus: d.focus || '',
    })),
  }
  try { localStorage.setItem(`dw_plan_share_${shortId}`, JSON.stringify(preview)) } catch {}

  return `${origin}/plan/${urlId}`
}