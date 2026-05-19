// ── src/lib/supabase/sync.js ──
//
// BUG FIXED — wrong username displayed after sign-up:
//
// The original syncSupabaseToLocal wrote:
//   name: profile.full_name || profile.display_name || existing.name || 'Friend'
//
// If `full_name` was never set (sign-up only writes `username`, not `full_name`),
// and `display_name` was also empty, `name` fell back to `existing.name` (stale)
// or 'Friend'. This meant every component reading `dw_user.name` showed 'Friend'.
//
// FIX: name resolution order is now:
//   profile.full_name || profile.username || existing.name || existing.username || ''
// 'Friend' is completely removed as a fallback — an authenticated user always
// has at minimum an email address and a username.
//
// Supabase is the source of truth. localStorage is a fast read cache.

import { createClient } from './client'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function local(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─────────────────────────────────────────────
//  PULL: Supabase → localStorage
//  Called after sign-in and on app load.
// ─────────────────────────────────────────────
export async function syncSupabaseToLocal(userId) {
  const sb = createClient()
  if (!sb || !userId) return

  try {
    const { data: profile, error } = await sb.from('profiles')
      .select('*').eq('id', userId).maybeSingle()

    if (error) {
      console.warn('[sync] profile fetch error:', error.message, error.code)
      return
    }

    if (profile) {
      const existing = local('dw_user', {})

      // FIXED: name falls back to username, never 'Friend'
      // full_name is the user-set display name (can be null on new accounts)
      // username is always set at sign-up — it's the reliable fallback
      writeLocal('dw_user', {
        ...existing,
        id:          userId,
        name:        profile.full_name   || profile.username || existing.name     || existing.username || '',
        username:    profile.username    || existing.username || '',
        email:       profile.email       || existing.email   || '',
        companionId: profile.companion_id || 'david',
        walkStage:   profile.walk_stage  || '',
        goal:        profile.spiritual_goal || '',
        joinedAt:    existing.joinedAt   || new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      })

      writeLocal('dw_streak', {
        current:         profile.streak_current    || 0,
        longest:         profile.streak_longest    || 0,
        lastCheckinDate: profile.last_checkin_date || null,
      })

      if (profile.onboarding_complete) {
        writeLocal('dw_onboarding_complete', true)
      }
    }

    // ── Checkins ──
    const { data: checkins, error: ciErr } = await sb.from('checkins')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(365)
    if (ciErr) console.warn('[sync] checkins fetch:', ciErr.message)
    if (checkins?.length) {
      writeLocal('dw_checkins', checkins.map(c => ({
        id:         c.id,
        date:       c.checked_in_date,
        passage:    c.passage,
        reflection: c.reflection,
        createdAt:  c.created_at,
      })))
    }

    // ── Plans ──
    const { data: plans, error: plErr } = await sb.from('plans')
      .select('*').eq('user_id', userId)
    if (plErr) console.warn('[sync] plans fetch:', plErr.message)
    if (plans?.length) {
      writeLocal('dw_plans', plans.map(p => ({
        id:               p.id,
        type:             p.plan_type,
        name:             p.name,
        pace:             p.pace,
        startDate:        p.start_date,
        estimatedEndDate: p.estimated_end_date,
        totalDays:        p.total_days,
        currentDay:       p.current_day,
        status:           p.status,
        days:             p.days || [],
        createdAt:        p.created_at,
      })))
    }

    // ── Nuggets ──
    const { data: nuggets, error: ngErr } = await sb.from('nuggets')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (ngErr) console.warn('[sync] nuggets fetch:', ngErr.message)
    if (nuggets?.length) {
      writeLocal('dw_nuggets', nuggets.map(n => ({
        id:        n.id,
        text:      n.text,
        source:    n.source,
        createdAt: n.created_at,
      })))
    }
  } catch (e) {
    console.warn('[sync] syncSupabaseToLocal error (non-fatal):', e.message)
  }
}

// ─────────────────────────────────────────────
//  PUSH: localStorage → Supabase
//  Merges locally-created data into the account after sign-in.
// ─────────────────────────────────────────────
export async function syncLocalToSupabase(userId) {
  const sb = createClient()
  if (!sb || !userId) return

  try {
    const user   = local('dw_user', null)
    const streak = local('dw_streak', null)
    if (user) {
      await sb.from('profiles').upsert({
        id:                userId,
        // Only set full_name from local if it's a real value (not empty/Friend)
        ...(user.name && user.name !== 'Friend' ? { full_name: user.name } : {}),
        username:          user.username    || null,
        companion_id:      user.companionId || 'david',
        walk_stage:        user.walkStage   || null,
        spiritual_goal:    user.goal        || null,
        streak_current:    streak?.current  || 0,
        streak_longest:    streak?.longest  || 0,
        last_checkin_date: streak?.lastCheckinDate || null,
      }, { onConflict: 'id' }).catch(e => console.warn('[sync] profile upsert:', e.message))
    }

    const checkins = local('dw_checkins', [])
    for (const ci of checkins) {
      if (!ci.id || !ci.date) continue
      await sb.from('checkins').upsert({
        id:              ci.id,
        user_id:         userId,
        checked_in_date: ci.date,
        passage:         ci.passage    || null,
        reflection:      ci.reflection || null,
        created_at:      ci.createdAt  || new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }

    const plans = local('dw_plans', [])
    for (const p of plans) {
      if (!p.id) continue
      await sb.from('plans').upsert({
        id:                 p.id,
        user_id:            userId,
        plan_type:          p.type             || 'book',
        name:               p.name             || 'Plan',
        pace:               p.pace             || 'daily',
        start_date:         p.startDate        || null,
        estimated_end_date: p.estimatedEndDate || null,
        total_days:         p.totalDays        || 0,
        current_day:        p.currentDay       || 1,
        status:             p.status           || 'active',
        days:               p.days             || [],
        created_at:         p.createdAt        || new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }

    const nuggets = local('dw_nuggets', [])
    for (const n of nuggets) {
      if (!n.id) continue
      await sb.from('nuggets').upsert({
        id:         n.id,
        user_id:    userId,
        text:       n.text      || '',
        source:     n.source    || null,
        created_at: n.createdAt || new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }
  } catch (e) {
    console.warn('[sync] syncLocalToSupabase error (non-fatal):', e.message)
  }
}

// ─────────────────────────────────────────────
//  WRITE-THROUGH helpers
// ─────────────────────────────────────────────

export async function persistCheckin(checkin, userId) {
  const existing = local('dw_checkins', [])
  const updated  = [checkin, ...existing.filter(c => c.date !== checkin.date)]
  writeLocal('dw_checkins', updated)

  if (userId) {
    const sb = createClient()
    sb?.from('checkins').upsert({
      id:              checkin.id,
      user_id:         userId,
      checked_in_date: checkin.date,
      passage:         checkin.passage    || null,
      reflection:      checkin.reflection || null,
      created_at:      checkin.createdAt,
    }, { onConflict: 'id' }).catch(e => console.warn('[sync] checkin upsert:', e.message))

    const streak = local('dw_streak', null)
    if (streak) {
      sb?.from('profiles').update({
        streak_current:    streak.current,
        streak_longest:    streak.longest,
        last_checkin_date: streak.lastCheckinDate,
      }).eq('id', userId).catch(() => null)
    }
  }
}

export async function persistPlan(plan, userId) {
  const existing = local('dw_plans', [])
  const updated  = existing.some(p => p.id === plan.id)
    ? existing.map(p => p.id === plan.id ? plan : p)
    : [plan, ...existing]
  writeLocal('dw_plans', updated)

  if (userId) {
    const sb = createClient()
    sb?.from('plans').upsert({
      id:                 plan.id,
      user_id:            userId,
      plan_type:          plan.type             || 'book',
      name:               plan.name,
      pace:               plan.pace             || 'daily',
      start_date:         plan.startDate        || null,
      estimated_end_date: plan.estimatedEndDate || null,
      total_days:         plan.totalDays,
      current_day:        plan.currentDay       || 1,
      status:             plan.status           || 'active',
      days:               plan.days             || [],
      created_at:         plan.createdAt        || new Date().toISOString(),
    }, { onConflict: 'id' }).catch(e => console.warn('[sync] plan upsert:', e.message))
  }
}

export async function persistNugget(nugget, userId) {
  const existing = local('dw_nuggets', [])
  writeLocal('dw_nuggets', [nugget, ...existing])

  if (userId) {
    const sb = createClient()
    sb?.from('nuggets').insert({
      id:         nugget.id,
      user_id:    userId,
      text:       nugget.text,
      source:     nugget.source  || null,
      created_at: nugget.createdAt,
    }).catch(e => console.warn('[sync] nugget insert:', e.message))
  }
}

export async function deleteNugget(nuggetId, userId) {
  const existing = local('dw_nuggets', [])
  writeLocal('dw_nuggets', existing.filter(n => n.id !== nuggetId))

  if (userId) {
    const sb = createClient()
    sb?.from('nuggets').delete().eq('id', nuggetId).eq('user_id', userId)
      .catch(e => console.warn('[sync] nugget delete:', e.message))
  }
}

export async function persistPlanProgress(planId, currentDay, status, days, userId) {
  const existing = local('dw_plans', [])
  const updated  = existing.map(p => p.id !== planId ? p : { ...p, currentDay, status, days })
  writeLocal('dw_plans', updated)

  if (userId) {
    const sb = createClient()
    sb?.from('plans').update({ current_day: currentDay, status, days })
      .eq('id', planId).eq('user_id', userId)
      .catch(e => console.warn('[sync] plan progress:', e.message))
  }
}

export async function getCurrentUserId() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data: { user } } = await sb.auth.getUser()
    return user?.id || null
  } catch { return null }
}