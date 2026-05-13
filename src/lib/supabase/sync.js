// ── lib/supabase/sync.js ──
// Syncs localStorage ↔ Supabase when user signs in.
// Falls back silently if Supabase not configured.

import { createClient } from './client'

function readLocal(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}

/** Upload localStorage data to Supabase after sign-in. */
export async function syncLocalToSupabase(userId) {
  const sb = createClient()
  if (!sb || !userId) return

  try {
    // Sync profile / streak
    const user   = readLocal('dw_user', null)
    const streak = readLocal('dw_streak', null)
    if (user) {
      await sb.from('profiles').upsert({
        id: userId,
        display_name:      user.name || 'Friend',
        walk_stage:        user.walkStage || 'growing',
        spiritual_goal:    user.goal || null,
        companion_id:      user.companionId || 'david',
        streak_current:    streak?.current || 0,
        streak_longest:    streak?.longest || 0,
        last_checkin_date: streak?.lastCheckinDate || null,
      }, { onConflict: 'id' })
    }

    // Sync check-ins (don't duplicate by date)
    const checkins = readLocal('dw_checkins', [])
    for (const ci of checkins) {
      await sb.from('checkins').upsert({
        id:               ci.id,
        user_id:          userId,
        passage:          ci.passage,
        reflection:       ci.reflection,
        checked_in_date:  ci.date,
        created_at:       ci.createdAt,
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }

    // Sync plans
    const plans = readLocal('dw_plans', [])
    for (const p of plans) {
      await sb.from('plans').upsert({
        id:                  p.id,
        user_id:             userId,
        plan_type:           p.type,
        name:                p.name,
        pace:                p.pace,
        start_date:          p.startDate,
        estimated_end_date:  p.estimatedEndDate,
        total_days:          p.totalDays,
        current_day:         p.currentDay,
        status:              p.status,
        days:                p.days,
        created_at:          p.createdAt,
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }

    // Sync nuggets
    const nuggets = readLocal('dw_nuggets', [])
    for (const n of nuggets) {
      await sb.from('nuggets').upsert({
        id:         n.id,
        user_id:    userId,
        text:       n.text,
        source:     n.source,
        created_at: n.createdAt,
      }, { onConflict: 'id', ignoreDuplicates: true }).catch(() => null)
    }
  } catch (e) {
    console.warn('syncLocalToSupabase failed silently:', e)
  }
}

/** Pull Supabase data into localStorage on app load. */
export async function syncSupabaseToLocal(userId) {
  const sb = createClient()
  if (!sb || !userId) return

  try {
    // Pull profile
    const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).single()
    if (profile) {
      try {
        const existing = JSON.parse(localStorage.getItem('dw_user') || '{}')
        localStorage.setItem('dw_user', JSON.stringify({
          ...existing,
          name:        profile.display_name,
          walkStage:   profile.walk_stage,
          goal:        profile.spiritual_goal,
          companionId: profile.companion_id,
          joinedAt:    existing.joinedAt || 'recently',
        }))
        localStorage.setItem('dw_streak', JSON.stringify({
          current:         profile.streak_current,
          longest:         profile.streak_longest,
          lastCheckinDate: profile.last_checkin_date,
        }))
      } catch {}
    }

    // Pull check-ins
    const { data: checkins } = await sb.from('checkins')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    if (checkins?.length) {
      const mapped = checkins.map(c => ({
        id: c.id, date: c.checked_in_date, passage: c.passage,
        reflection: c.reflection, challengeId: null, createdAt: c.created_at,
      }))
      try { localStorage.setItem('dw_checkins', JSON.stringify(mapped)) } catch {}
    }

    // Pull plans
    const { data: plans } = await sb.from('plans').select('*').eq('user_id', userId)
    if (plans?.length) {
      const mapped = plans.map(p => ({
        id: p.id, type: p.plan_type, name: p.name, pace: p.pace,
        startDate: p.start_date, estimatedEndDate: p.estimated_end_date,
        totalDays: p.total_days, currentDay: p.current_day,
        status: p.status, days: p.days, createdAt: p.created_at,
      }))
      try { localStorage.setItem('dw_plans', JSON.stringify(mapped)) } catch {}
    }

    // Pull nuggets
    const { data: nuggets } = await sb.from('nuggets').select('*').eq('user_id', userId)
    if (nuggets?.length) {
      const mapped = nuggets.map(n => ({
        id: n.id, text: n.text, source: n.source, createdAt: n.created_at,
      }))
      try { localStorage.setItem('dw_nuggets', JSON.stringify(mapped)) } catch {}
    }
  } catch (e) {
    console.warn('syncSupabaseToLocal failed silently:', e)
  }
}