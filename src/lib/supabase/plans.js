// ── src/lib/supabase/plans.js ──
// Complete shared reading plans data layer.
// v2: Frequency-based scheduling model.
//
// KEY CHANGES FROM v1:
//  • createSharedPlan now accepts content[], item_unit, plan_subtype
//  • joinPlan now accepts frequency { unit, count } and stores it + personal_days
//  • getMyPlans returns frequency + personal_days alongside existing fields
//  • normalisePlan includes new content-model fields
//  • getMemberProgressBoard uses get_member_progress RPC (no N+1)
//  • plan_days table is no longer written to for new plans — content lives in shared_plans.content
//    Old plans that use plan_days still work — getPlanDays still exists unchanged

import { createClient } from './client'
import { getAuthUser }  from './communities'
import { computePersonalDays } from '../plan-schedule'

// ─────────────────────────────────────────────
//  Profile helpers
// ─────────────────────────────────────────────
async function fetchProfile(sb, userId) {
  if (!userId) return null
  const { data } = await sb.from('profiles')
    .select('id, username, full_name, display_name, avatar_url')
    .eq('id', userId).maybeSingle()
  return data || null
}

async function fetchProfiles(sb, userIds) {
  if (!userIds?.length) return {}
  const { data } = await sb.from('profiles')
    .select('id, username, full_name, display_name, avatar_url')
    .in('id', userIds)
  const map = {}
  for (const p of (data || [])) map[p.id] = p
  return map
}

// ─────────────────────────────────────────────
//  Normaliser — single source of truth for plan shape
// ─────────────────────────────────────────────
function normalisePlan(row) {
  const p = row.profiles || {}
  return {
    id:           row.id,
    name:         row.name,
    description:  row.description,
    creatorId:    row.creator_id,
    creatorName:  p.full_name || p.display_name || p.username || 'Someone',
    communityId:  row.community_id,
    visibility:   row.visibility,
    inviteCode:   row.invite_code,
    startDate:    row.start_date,
    durationDays: row.duration_days,   // kept for legacy plans; null for new ones
    status:       row.status,
    memberCount:  row.member_count,
    templateId:   row.template_id,
    createdAt:    row.created_at,
    // v2 content-model fields
    planSubtype:  row.plan_subtype || null,
    content:      row.content      || null,  // ContentItem[] — master list
    totalItems:   row.total_items  || null,
    itemUnit:     row.item_unit    || null,
  }
}

// ─────────────────────────────────────────────
//  CREATE — v2
//  Accepts content[] and frequency metadata.
//  No longer inserts into plan_days for new plans.
//  plan_days is still used by legacy plans.
// ─────────────────────────────────────────────
export async function createSharedPlan({
  name, description, templateId, visibility, communityId,
  startDate, inviteCode,
  // v2 fields
  planSubtype, content, itemUnit,
  // legacy fields (still supported for backwards compat)
  durationDays, days,
}) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const isV2      = !!content?.length
  const totalItems = isV2 ? content.length : null

  const insertPayload = {
    name,
    description,
    creator_id:   authUser.id,
    community_id: communityId || null,
    visibility:   visibility  || 'public',
    start_date:   startDate   || new Date().toISOString().split('T')[0],
    status:       'active',
    template_id:  templateId  || null,
    // v2
    plan_subtype: planSubtype || null,
    content:      isV2 ? content : null,
    total_items:  totalItems,
    item_unit:    itemUnit     || null,
    // legacy: duration_days still written for non-v2 plans
    duration_days: isV2 ? null : (durationDays || null),
  }
  if (inviteCode) insertPayload.invite_code = inviteCode

  const { data: plan, error: planErr } = await sb.from('shared_plans')
    .insert(insertPayload)
    .select('id, name, description, creator_id, community_id, visibility, invite_code, start_date, duration_days, status, member_count, template_id, created_at, plan_subtype, content, total_items, item_unit')
    .single()

  if (planErr) {
    console.error('[createSharedPlan] insert error:', planErr.message, planErr.code)
    throw new Error(planErr.message || 'Failed to create plan')
  }

  // Legacy: write plan_days rows if caller passed days[] (old flow)
  if (!isV2 && days?.length) {
    function addDays(dateStr, n) {
      const d = new Date(dateStr)
      d.setDate(d.getDate() + n)
      return d.toISOString().split('T')[0]
    }
    const dayRows = days.map(d => ({
      plan_id:           plan.id,
      day_number:        d.day_number,
      passage_reference: d.passage_reference,
      book:              d.book              || null,
      chapter_start:     d.chapter_start     || null,
      verse_start:       d.verse_start       || null,
      chapter_end:       d.chapter_end       || null,
      verse_end:         d.verse_end         || null,
      title:             d.title             || null,
      scheduled_date:    addDays(startDate || new Date().toISOString().split('T')[0], d.day_number - 1),
    }))
    const { error: daysErr } = await sb.from('plan_days').insert(dayRows)
    if (daysErr) throw daysErr
  }

  // Auto-join creator — default frequency: 1 chapter/day for chapter plans, 3 verses/day for verse plans
  const defaultFrequency = itemUnit === 'verse'
    ? { unit: 'verse', count: 3 }
    : { unit: 'chapter', count: 1 }
  const personalDays = isV2
    ? computePersonalDays(content, defaultFrequency)
    : (durationDays || 1)

  const { error: joinErr } = await sb.from('plan_members').insert({
    plan_id:         plan.id,
    user_id:         authUser.id,
    current_day:     1,
    status:          'active',
    frequency_unit:  isV2 ? defaultFrequency.unit  : null,
    frequency_count: isV2 ? defaultFrequency.count : null,
    personal_days:   isV2 ? personalDays           : null,
  })
  if (joinErr && joinErr.code !== '23505') {
    console.warn('[createSharedPlan] auto-join error:', joinErr.message)
  }

  return plan
}

// ─────────────────────────────────────────────
//  JOIN — v2
//  Accepts frequency. Computes personal_days.
//  For old plans without content, falls back to legacy behaviour.
// ─────────────────────────────────────────────
export async function joinPlan(planId, { fromDay = 1, frequency } = {}) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  // Check existing membership
  const { data: existing } = await sb.from('plan_members').select('id, status')
    .eq('plan_id', planId).eq('user_id', authUser.id).maybeSingle()

  if (existing) {
    if (existing.status === 'left') {
      // Re-joining — update frequency if provided
      const update = { status: 'active', current_day: fromDay }
      if (frequency) {
        // Need plan content to compute personal_days
        const { data: planRow } = await sb.from('shared_plans')
          .select('content, item_unit, duration_days')
          .eq('id', planId).maybeSingle()

        if (planRow?.content && frequency) {
          update.frequency_unit  = frequency.unit
          update.frequency_count = frequency.count
          update.personal_days   = computePersonalDays(planRow.content, frequency)
        }
      }
      await sb.from('plan_members')
        .update(update)
        .eq('plan_id', planId).eq('user_id', authUser.id)
    }
    return
  }

  // New join
  let frequencyUnit  = null
  let frequencyCount = null
  let personalDays   = null

  if (frequency) {
    const { data: planRow } = await sb.from('shared_plans')
      .select('content, duration_days')
      .eq('id', planId).maybeSingle()

    if (planRow?.content) {
      frequencyUnit  = frequency.unit
      frequencyCount = frequency.count
      personalDays   = computePersonalDays(planRow.content, frequency)
    }
  }

  await sb.from('plan_members').insert({
    plan_id:         planId,
    user_id:         authUser.id,
    current_day:     fromDay,
    start_offset:    fromDay - 1,
    status:          'active',
    frequency_unit:  frequencyUnit,
    frequency_count: frequencyCount,
    personal_days:   personalDays,
  })
}

// ─────────────────────────────────────────────
//  UPDATE FREQUENCY
//  User changes their pace mid-plan.
//  Recomputes personal_days. Does NOT reset current_day.
// ─────────────────────────────────────────────
export async function updateMemberFrequency(planId, frequency) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  const { data: planRow } = await sb.from('shared_plans')
    .select('content').eq('id', planId).maybeSingle()

  if (!planRow?.content) throw new Error('Plan has no content to reschedule')

  const personalDays = computePersonalDays(planRow.content, frequency)

  const { error } = await sb.from('plan_members')
    .update({
      frequency_unit:  frequency.unit,
      frequency_count: frequency.count,
      personal_days:   personalDays,
    })
    .eq('plan_id', planId)
    .eq('user_id', authUser.id)

  if (error) throw error
  return personalDays
}

export async function leavePlan(planId) {
  const authUser = await getAuthUser()
  if (!authUser) return
  const sb = createClient()
  await sb.from('plan_members')
    .update({ status: 'left' })
    .eq('plan_id', planId).eq('user_id', authUser.id)
}

// ─────────────────────────────────────────────
//  READ — discovery
// ─────────────────────────────────────────────
export async function getPublicPlans({ search, filter, limit = 40, offset = 0 } = {}) {
  const sb = createClient()
  if (!sb) return []

  let query = sb.from('shared_plans')
    .select('id, name, description, creator_id, visibility, invite_code, start_date, duration_days, status, member_count, template_id, created_at, plan_subtype, total_items, item_unit')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (search) query = query.ilike('name', `%${search}%`)
  switch (filter) {
    case 'most_members': query = query.order('member_count', { ascending: false }); break
    case 'shortest':     query = query.order('total_items',  { ascending: true  }); break
    case 'longest':      query = query.order('total_items',  { ascending: false }); break
    default:             query = query.order('created_at',   { ascending: false })
  }

  const { data, error } = await query
  if (error) { console.error('[getPublicPlans]', error.message); return [] }
  const plans      = data || []
  const creatorIds = [...new Set(plans.map(p => p.creator_id).filter(Boolean))]
  const profiles   = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}
  return plans.map(p => normalisePlan({ ...p, profiles: profiles[p.creator_id] || null }))
}

export async function getPlanByInviteCode(code) {
  const sb = createClient()
  if (!sb) return null
  const { data, error } = await sb.from('shared_plans')
    .select('*').eq('invite_code', code.toUpperCase().trim()).maybeSingle()
  if (error) { console.error('[getPlanByInviteCode]', error.message); return null }
  if (!data) return null
  const profile = await fetchProfile(sb, data.creator_id)
  return normalisePlan({ ...data, profiles: profile })
}

export async function getPlanById(planId) {
  const sb = createClient()
  if (!sb) return null
  const { data, error } = await sb.from('shared_plans')
    .select('*').eq('id', planId).maybeSingle()
  if (error) { console.error('[getPlanById]', error.message); return null }
  if (!data) return null
  const profile = await fetchProfile(sb, data.creator_id)
  return normalisePlan({ ...data, profiles: profile })
}

// Legacy — still used by old plans that store days in plan_days table
export async function getPlanDays(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_days')
    .select('*').eq('plan_id', planId).order('day_number')
  if (error) { console.error('[getPlanDays]', error.message); return [] }
  return data || []
}

// ─────────────────────────────────────────────
//  READ — member's plans (v2)
//  Returns frequency + personal_days alongside existing fields.
// ─────────────────────────────────────────────
export async function getMyPlans() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  if (!sb) return []

  const { data, error } = await sb.from('plan_members')
    .select('*, shared_plans(id, name, description, creator_id, community_id, visibility, invite_code, start_date, duration_days, status, member_count, template_id, created_at, plan_subtype, total_items, item_unit)')
    .eq('user_id', authUser.id)
    .in('status', ['active', 'paused'])
    .order('joined_at', { ascending: false })

  if (error) { console.error('[getMyPlans]', error.message); return [] }
  const rows       = (data || []).filter(r => r.shared_plans)
  const creatorIds = [...new Set(rows.map(r => r.shared_plans?.creator_id).filter(Boolean))]
  const profiles   = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}

  return rows.map(r => ({
    ...normalisePlan({ ...r.shared_plans, profiles: profiles[r.shared_plans.creator_id] || null }),
    memberStatus:      r.status,
    currentDay:        r.current_day,
    startOffset:       r.start_offset,
    joinedAt:          r.joined_at,
    notifyReads:       r.notify_reads,
    notifyReflections: r.notify_reflections,
    // v2
    frequencyUnit:     r.frequency_unit  || null,
    frequencyCount:    r.frequency_count || null,
    personalDays:      r.personal_days   || r.shared_plans?.duration_days || null,
  }))
}

// ─────────────────────────────────────────────
//  READ — member's ACTIVE plan for home card
//  Returns the most recently joined active plan with full content.
//  Used by TodaysReadingCard.
// ─────────────────────────────────────────────
export async function getActivePlanForHome(userId) {
  if (!userId) return null
  const sb = createClient()
  if (!sb) return null

  const { data, error } = await sb.from('plan_members')
    .select('current_day, frequency_unit, frequency_count, personal_days, joined_at, status, shared_plans(id, name, description, visibility, total_items, item_unit, content, plan_subtype, start_date, member_count)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(5) // return top 5 — client picks the most recent

  if (error) { console.error('[getActivePlanForHome]', error.message); return null }
  const rows = (data || []).filter(r => r.shared_plans?.content)

  if (!rows.length) return null

  return rows.map(r => ({
    planId:         r.shared_plans.id,
    planName:       r.shared_plans.name,
    planSubtype:    r.shared_plans.plan_subtype,
    content:        r.shared_plans.content,
    totalItems:     r.shared_plans.total_items,
    itemUnit:       r.shared_plans.item_unit,
    memberCount:    r.shared_plans.member_count,
    currentDay:     r.current_day,
    frequencyUnit:  r.frequency_unit,
    frequencyCount: r.frequency_count,
    personalDays:   r.personal_days,
    joinedAt:       r.joined_at,
  }))
}

// ─────────────────────────────────────────────
//  READ — members list
// ─────────────────────────────────────────────
export async function getPlanMembers(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_members')
    .select('user_id, current_day, personal_days, frequency_unit, frequency_count, status, joined_at')
    .eq('plan_id', planId)
    .in('status', ['active', 'completed'])
    .order('joined_at')
  if (error) { console.error('[getPlanMembers]', error.message); return [] }
  const members = data || []
  const userIds = members.map(m => m.user_id).filter(Boolean)
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}
  return members.map(m => {
    const p = profiles[m.user_id] || {}
    return {
      userId:         m.user_id,
      name:           p.full_name || p.display_name || p.username || 'Member',
      username:       p.username  || null,
      avatar:         p.avatar_url || null,
      currentDay:     m.current_day,
      personalDays:   m.personal_days,
      frequencyUnit:  m.frequency_unit,
      frequencyCount: m.frequency_count,
      status:         m.status,
      joinedAt:       m.joined_at,
    }
  })
}

// ─────────────────────────────────────────────
//  READ — progress board (v2)
//  Uses get_member_progress RPC to avoid N+1.
//  Returns members ranked by % complete.
// ─────────────────────────────────────────────
export async function getMemberProgressBoard(planId) {
  const sb = createClient()
  if (!sb) return []

  const [rpcResult, profilesResult] = await Promise.all([
    sb.rpc('get_member_progress', { p_plan_id: planId }),
    sb.from('plan_members')
      .select('user_id')
      .eq('plan_id', planId)
      .in('status', ['active', 'completed']),
  ])

  if (rpcResult.error) {
    console.error('[getMemberProgressBoard] rpc error:', rpcResult.error.message)
    return []
  }

  const rows    = rpcResult.data || []
  const userIds = rows.map(r => r.user_id).filter(Boolean)
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}

  return rows.map(r => {
    const p = profiles[r.user_id] || {}
    return {
      userId:       r.user_id,
      name:         p.full_name || p.display_name || p.username || 'Member',
      avatar:       p.avatar_url || null,
      username:     p.username || null,
      currentDay:   r.current_day,
      personalDays: r.personal_days,
      pctComplete:  parseFloat(r.pct_complete) || 0,
      status:       r.status,
      joinedAt:     r.joined_at,
    }
  })
}

// ─────────────────────────────────────────────
//  CHECK-IN STATUS
// ─────────────────────────────────────────────
export async function getDayCheckinStatus(planId, dayNumber) {
  const sb = createClient()
  if (!sb) return []

  const [membersResult, completionsResult] = await Promise.all([
    sb.from('plan_members')
      .select('user_id, current_day, status')
      .eq('plan_id', planId)
      .in('status', ['active', 'completed']),
    sb.from('daily_completions')
      .select('user_id')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber),
  ])

  const members   = membersResult.data || []
  const checkedIn = new Set((completionsResult.data || []).map(c => c.user_id))
  const userIds   = members.map(m => m.user_id).filter(Boolean)
  const profiles  = userIds.length ? await fetchProfiles(sb, userIds) : {}

  return members.map(m => {
    const p = profiles[m.user_id] || {}
    return {
      userId:       m.user_id,
      name:         p.full_name || p.display_name || p.username || 'Member',
      avatar:       p.avatar_url || null,
      hasCheckedIn: checkedIn.has(m.user_id),
      currentDay:   m.current_day,
    }
  })
}

export function subscribeToDayCheckins(planId, dayNumber, onCheckin) {
  const sb = createClient()
  if (!sb) return () => null

  const channel = sb.channel(`checkins:${planId}:${dayNumber}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'daily_completions',
      filter: `plan_id=eq.${planId}`,
    }, async payload => {
      if (payload.new?.day_number !== dayNumber) return
      const profile = await fetchProfile(sb, payload.new.user_id)
      onCheckin({
        userId: payload.new.user_id,
        name:   profile?.full_name || profile?.display_name || profile?.username || 'Someone',
        avatar: profile?.avatar_url || null,
      })
    })
    .subscribe()

  return () => { try { sb.removeChannel(channel) } catch {} }
}

// ─────────────────────────────────────────────
//  COMPLETIONS
// ─────────────────────────────────────────────
export async function markDayComplete(planId, dayNumber) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  const { error } = await sb.from('daily_completions').upsert({
    plan_id:      planId,
    user_id:      authUser.id,
    day_number:   dayNumber,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'plan_id,user_id,day_number', ignoreDuplicates: true })

  if (error) throw error

  const { error: rpcErr } = await sb.rpc('advance_member_day', {
    p_plan_id: planId, p_user_id: authUser.id,
  })
  if (rpcErr) console.warn('[markDayComplete] advance_member_day:', rpcErr.message)

  return true
}

export async function getMyCompletions(planId) {
  const authUser = await getAuthUser()
  if (!authUser) return new Set()
  const sb = createClient()
  const { data } = await sb.from('daily_completions')
    .select('day_number').eq('plan_id', planId).eq('user_id', authUser.id)
  return new Set((data || []).map(d => d.day_number))
}

export async function getDayCompletionCount(planId, dayNumber) {
  const sb = createClient()
  if (!sb) return 0
  const { count } = await sb.from('daily_completions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId).eq('day_number', dayNumber)
  return count || 0
}

// ─────────────────────────────────────────────
//  WEEKLY REPORT DATA
// ─────────────────────────────────────────────
export async function getWeeklyActivity(userId, weekStart) {
  const sb = createClient()
  if (!sb || !userId) return null

  function addDays(dateStr, n) {
    const d = new Date(dateStr); d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const weekEnd = addDays(weekStart, 6)

  const [completionsRes, membershipsRes, reflectionsRes] = await Promise.all([
    sb.from('daily_completions')
      .select('plan_id, day_number, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', weekStart + 'T00:00:00Z')
      .lte('completed_at', weekEnd   + 'T23:59:59Z'),

    sb.from('plan_members')
      .select('plan_id, current_day, personal_days, frequency_unit, frequency_count, status, shared_plans(name, duration_days, total_items)')
      .eq('user_id', userId)
      .in('status', ['active', 'completed', 'paused']),

    sb.from('plan_reflections')
      .select('id, plan_id, day_number, content, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart + 'T00:00:00Z')
      .lte('created_at', weekEnd   + 'T23:59:59Z'),
  ])

  const completions = completionsRes.data || []
  const completionDates = new Set(completions.map(c => c.completed_at.split('T')[0]))
  const daysGrid = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return { date, read: completionDates.has(date) }
  })

  const plansSnapshot = (membershipsRes.data || [])
    .filter(m => m.shared_plans)
    .map(m => {
      const total = m.personal_days || m.shared_plans?.total_items || m.shared_plans?.duration_days || 1
      return {
        planId:     m.plan_id,
        planName:   m.shared_plans.name,
        currentDay: m.current_day,
        totalDays:  total,
        pct:        Math.min(100, Math.round(((m.current_day - 1) / total) * 100)),
        status:     m.status,
      }
    })

  // Group activity
  const planIds = [...new Set(completions.map(c => c.plan_id))]
  let groupActivity = []
  if (planIds.length) {
    const { data: groupCheckins } = await sb.from('daily_completions')
      .select('plan_id, user_id, day_number')
      .in('plan_id', planIds)
      .gte('completed_at', weekStart + 'T00:00:00Z')
      .lte('completed_at', weekEnd   + 'T23:59:59Z')

    const byPlan = {}
    for (const c of (groupCheckins || [])) {
      if (!byPlan[c.plan_id]) byPlan[c.plan_id] = new Set()
      byPlan[c.plan_id].add(c.user_id)
    }
    groupActivity = Object.entries(byPlan).map(([planId, userSet]) => {
      const plan = plansSnapshot.find(p => p.planId === planId)
      return { planId, planName: plan?.planName || 'Reading Plan', membersActive: userSet.size }
    })
  }

  return {
    weekStart, weekEnd,
    daysRead: daysGrid.filter(d => d.read).length,
    daysGrid,
    plans:       plansSnapshot,
    reflections: (reflectionsRes.data || []).map(r => ({
      planId: r.plan_id, dayNumber: r.day_number,
      content: r.content, createdAt: r.created_at,
    })),
    groupActivity,
    completionsCount: completions.length,
  }
}

export async function saveWeeklyReport(userId, weekStart, reportData) {
  const sb = createClient()
  if (!sb) return null
  function addDays(dateStr, n) {
    const d = new Date(dateStr); d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }
  const weekEnd = addDays(weekStart, 6)
  const { data, error } = await sb.from('weekly_reports').upsert({
    user_id: userId, week_start: weekStart, week_end: weekEnd,
    days_read: reportData.daysRead, total_days: 7,
    report_data: reportData, created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' }).select().single()
  if (error) { console.error('[saveWeeklyReport]', error.message); return null }
  return data
}

export async function getWeeklyReports(limit = 8) {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  const { data, error } = await sb.from('weekly_reports')
    .select('id, week_start, week_end, days_read, total_days, report_data, created_at')
    .eq('user_id', authUser.id)
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error) { console.error('[getWeeklyReports]', error.message); return [] }
  return data || []
}

// ─────────────────────────────────────────────
//  PLAN REQUESTS
// ─────────────────────────────────────────────
export async function submitPlanRequest(topic) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const { data, error } = await sb.from('plan_requests')
    .insert({ user_id: authUser.id, topic: topic.trim(), status: 'pending' })
    .select('id, topic, status, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getMyPlanRequests() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  const { data, error } = await sb.from('plan_requests')
    .select('id, topic, status, result_plan_id, created_at')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) { console.error('[getMyPlanRequests]', error.message); return [] }
  return data || []
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS (unchanged from v1)
// ─────────────────────────────────────────────
export async function notifyReadComplete(planId, planName, memberName, dayNumber) {
  try {
    const sb = createClient()
    if (!sb) return
    const authUser = await getAuthUser()
    if (!authUser) return

    const { data: members } = await sb.from('plan_members')
      .select('user_id')
      .eq('plan_id', planId)
      .in('status', ['active'])
      .neq('user_id', authUser.id)

    if (!members?.length) return

    const notifications = members.map(m => ({
      user_id:  m.user_id,
      type:     'plan_read',
      title:    '📖 Reading update',
      body:     `${memberName} completed Day ${dayNumber} of "${planName}"`,
      data:     { planId, dayNumber },
      read:     false,
      created_at: new Date().toISOString(),
    }))

    await sb.from('notifications').insert(notifications)
  } catch (e) {
    console.warn('[notifyReadComplete]', e.message)
  }
}

// ─────────────────────────────────────────────
//  REFLECTIONS
//  Preserved from v1 — unchanged
// ─────────────────────────────────────────────
function normaliseReflection(row, currentUserId, amenSet = new Set()) {
  const p = row.profiles || {}
  return {
    id:             row.id,
    planId:         row.plan_id,
    dayNumber:      row.day_number,
    authorId:       row.user_id,
    authorName:     p.full_name || p.display_name || p.username || 'Anonymous',
    authorUsername: p.username || null,
    authorAvatar:   p.avatar_url || null,
    content:        row.content,
    amened:         amenSet.has(row.id),
    isOwn:          currentUserId === row.user_id,
    createdAt:      row.created_at,
  }
}

export async function postReflection(planId, dayNumber, content) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('plan_reflections').insert({
    plan_id:    planId,
    day_number: dayNumber,
    user_id:    authUser.id,
    content:    content.trim().slice(0, 280),
  }).select('id, plan_id, day_number, user_id, content, created_at').single()
  if (error) throw error
  const profile = await fetchProfile(sb, authUser.id)
  return normaliseReflection({ ...data, profiles: profile }, authUser.id)
}

export async function getReflections(planId, dayNumber) {
  const sb = createClient()
  if (!sb) return []
  const authUser = await getAuthUser()
  const { data, error } = await sb.from('plan_reflections')
    .select('id, plan_id, day_number, user_id, content, created_at')
    .eq('plan_id', planId).eq('day_number', dayNumber)
    .order('created_at', { ascending: true })
  if (error) { console.error('[getReflections]', error.message); return [] }
  const rows    = data || []
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}
  let amenSet = new Set()
  if (authUser?.id && rows.length) {
    const { data: responses } = await sb.from('reflection_responses')
      .select('reflection_id').eq('user_id', authUser.id).eq('type', 'amen')
      .in('reflection_id', rows.map(r => r.id))
    ;(responses || []).forEach(r => amenSet.add(r.reflection_id))
  }
  return rows.map(r => normaliseReflection(
    { ...r, profiles: profiles[r.user_id] || null }, authUser?.id, amenSet
  ))
}

export async function deleteReflection(reflectionId) {
  const authUser = await getAuthUser()
  if (!authUser) return
  const sb = createClient()
  await sb.from('plan_reflections').delete()
    .eq('id', reflectionId).eq('user_id', authUser.id)
}

export async function toggleAmenReflection(reflectionId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data: ex } = await sb.from('reflection_responses').select('id')
    .eq('reflection_id', reflectionId).eq('user_id', authUser.id).eq('type', 'amen').maybeSingle()
  if (ex) {
    await sb.from('reflection_responses').delete()
      .eq('reflection_id', reflectionId).eq('user_id', authUser.id).eq('type', 'amen')
    return false
  } else {
    await sb.from('reflection_responses').insert({
      reflection_id: reflectionId, user_id: authUser.id, type: 'amen',
    })
    return true
  }
}

export async function replyToReflection(reflectionId, content) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('reflection_responses').insert({
    reflection_id: reflectionId,
    user_id:       authUser.id,
    type:          'reply',
    content:       content.trim().slice(0, 280),
  }).select().single()
  if (error) throw error
  return data
}

export async function sendPlanNudge(planId, senderName, planName) {
  const sb = createClient()
  if (!sb) return
  const authUser = await getAuthUser()
  if (!authUser) return

  const { data: members } = await sb.from('plan_members')
    .select('user_id')
    .eq('plan_id', planId)
    .in('status', ['active'])
    .neq('user_id', authUser.id)

  if (!members?.length) return

  const notifications = members.map(m => ({
    user_id:  m.user_id,
    type:     'plan_nudge',
    title:    '🙏 Reading reminder',
    body:     `${senderName} nudged you to read "${planName}" today`,
    data:     { planId },
    read:     false,
    created_at: new Date().toISOString(),
  }))

  await sb.from('notifications').insert(notifications)
}