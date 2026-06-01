// ── src/lib/supabase/plans.js ──
// Complete shared reading plans data layer.
// Additions in this version:
//  • getCheckinStatus(planId, dayNumber) — who checked in today
//  • subscribeToDayCheckins — real-time updates when members check in
//  • getWeeklyActivity — raw data for weekly report generation
//  • saveWeeklyReport / getWeeklyReports — report persistence

import { createClient } from './client'
import { getAuthUser }  from './communities'

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
//  CREATE
// ─────────────────────────────────────────────
export async function createSharedPlan({ name, description, templateId, durationDays, visibility, communityId, startDate, days, inviteCode }) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const insertPayload = {
    name, description, creator_id: authUser.id,
    community_id: communityId || null,
    visibility:   visibility  || 'public',
    duration_days: durationDays,
    start_date:   startDate || new Date().toISOString().split('T')[0],
    status:       'active',
    template_id:  templateId || null,
  }
  if (inviteCode) insertPayload.invite_code = inviteCode

  const { data: plan, error: planErr } = await sb.from('shared_plans')
    .insert(insertPayload)
    .select('id, name, description, creator_id, community_id, visibility, invite_code, start_date, duration_days, status, member_count, template_id, created_at')
    .single()

  if (planErr) {
    console.error('[createSharedPlan] insert error:', planErr.message, planErr.code, planErr.details)
    throw new Error(planErr.message || 'Failed to create plan')
  }

  if (days?.length) {
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

  const { error: joinErr } = await sb.from('plan_members').insert({
    plan_id: plan.id, user_id: authUser.id,
    current_day: 1, status: 'active',
  })
  if (joinErr && joinErr.code !== '23505') {
    console.warn('[createSharedPlan] auto-join error:', joinErr.message)
  }

  return plan
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
//  READ — discovery
// ─────────────────────────────────────────────
export async function getPublicPlans({ search, filter, limit = 40, offset = 0 } = {}) {
  const sb = createClient()
  if (!sb) return []

  let query = sb.from('shared_plans')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (search) query = query.ilike('name', `%${search}%`)
  switch (filter) {
    case 'most_members': query = query.order('member_count', { ascending: false }); break
    case 'shortest':     query = query.order('duration_days', { ascending: true });  break
    case 'longest':      query = query.order('duration_days', { ascending: false }); break
    default:             query = query.order('created_at',    { ascending: false })
  }

  const { data, error } = await query
  if (error) { console.error('[getPublicPlans]', error.message); return [] }
  const plans = data || []
  const creatorIds = [...new Set(plans.map(p => p.creator_id).filter(Boolean))]
  const profiles = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}
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

export async function getPlanDays(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_days')
    .select('*').eq('plan_id', planId).order('day_number')
  if (error) { console.error('[getPlanDays]', error.message); return [] }
  return data || []
}

// ─────────────────────────────────────────────
//  READ — member's plans
// ─────────────────────────────────────────────
export async function getMyPlans() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  if (!sb) return []

  const { data, error } = await sb.from('plan_members')
    .select('*, shared_plans(*)')
    .eq('user_id', authUser.id)
    .in('status', ['active', 'paused'])
    .order('joined_at', { ascending: false })

  if (error) { console.error('[getMyPlans]', error.message); return [] }
  const rows = (data || []).filter(r => r.shared_plans)
  const creatorIds = [...new Set(rows.map(r => r.shared_plans?.creator_id).filter(Boolean))]
  const profiles = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}
  return rows.map(r => ({
    ...normalisePlan({ ...r.shared_plans, profiles: profiles[r.shared_plans.creator_id] || null }),
    memberStatus:      r.status,
    currentDay:        r.current_day,
    startOffset:       r.start_offset,
    joinedAt:          r.joined_at,
    notifyReads:       r.notify_reads,
    notifyReflections: r.notify_reflections,
  }))
}

export async function getPlanMembers(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_members')
    .select('user_id, current_day, status, joined_at')
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
      userId:     m.user_id,
      name:       p.full_name || p.display_name || p.username || 'Member',
      username:   p.username  || null,
      avatar:     p.avatar_url || null,
      currentDay: m.current_day,
      status:     m.status,
      joinedAt:   m.joined_at,
    }
  })
}

// ─────────────────────────────────────────────
//  CHECK-IN STATUS (who read today)
// ─────────────────────────────────────────────

/**
 * Returns all members with a boolean hasCheckedIn for a specific day.
 * Used to show the daily accountability panel.
 */
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

  const members    = membersResult.data || []
  const checkedIn  = new Set((completionsResult.data || []).map(c => c.user_id))
  const userIds    = members.map(m => m.user_id).filter(Boolean)
  const profiles   = userIds.length ? await fetchProfiles(sb, userIds) : {}

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

/**
 * Subscribe to real-time check-ins for a plan day.
 * Calls onCheckin({ userId, name, avatar }) when a new completion is inserted.
 */
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
//  JOIN / LEAVE
// ─────────────────────────────────────────────
export async function joinPlan(planId, { fromDay = 1 } = {}) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  const { data: existing } = await sb.from('plan_members').select('id, status')
    .eq('plan_id', planId).eq('user_id', authUser.id).maybeSingle()

  if (existing) {
    if (existing.status === 'left') {
      await sb.from('plan_members')
        .update({ status: 'active', current_day: fromDay })
        .eq('plan_id', planId).eq('user_id', authUser.id)
    }
    return
  }

  await sb.from('plan_members').insert({
    plan_id:      planId,
    user_id:      authUser.id,
    current_day:  fromDay,
    start_offset: fromDay - 1,
    status:       'active',
  })
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
//  COMPLETIONS
// ─────────────────────────────────────────────
export async function markDayComplete(planId, dayNumber) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  const { error } = await sb.from('daily_completions').upsert({
    plan_id: planId, user_id: authUser.id, day_number: dayNumber,
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
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId).eq('day_number', dayNumber)
  return count || 0
}

// ─────────────────────────────────────────────
//  REFLECTIONS
// ─────────────────────────────────────────────
export async function postReflection(planId, dayNumber, content) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('plan_reflections').insert({
    plan_id: planId, day_number: dayNumber,
    user_id: authUser.id, content: content.trim().slice(0, 280),
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
  const rows = data || []
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}
  let amenSet = new Set()
  if (authUser?.id && rows.length) {
    const { data: responses } = await sb.from('reflection_responses')
      .select('reflection_id').eq('user_id', authUser.id).eq('type', 'amen')
      .in('reflection_id', rows.map(r => r.id))
    ;(responses || []).forEach(r => amenSet.add(r.reflection_id))
  }
  return rows.map(r => normaliseReflection({ ...r, profiles: profiles[r.user_id] || null }, authUser?.id, amenSet))
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
    reflection_id: reflectionId, user_id: authUser.id,
    type: 'reply', content: content.trim().slice(0, 280),
  }).select().single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
export async function sendPlanNudge(planId, creatorName, planName) {
  await fetch('/api/push/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type:'plan_nudge', planId,
      title:`${creatorName} is nudging the group`,
      body:`Time to read today's passage in "${planName}"`,
      url:`/plans/${planId}` }),
  }).catch(() => null)
}

export async function notifyReadComplete(planId, planName, readerName, dayNumber) {
  await fetch('/api/push/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type:'plan_read', planId,
      title: planName,
      body: `${readerName} just checked in for Day ${dayNumber}`,
      url: `/plans/${planId}` }),
  }).catch(() => null)
}

// ─────────────────────────────────────────────
//  WEEKLY ACTIVITY — data for report generation
// ─────────────────────────────────────────────

/**
 * Returns the user's reading activity for a 7-day window.
 * weekStart: 'YYYY-MM-DD' (Monday)
 */
export async function getWeeklyActivity(userId, weekStart) {
  const sb = createClient()
  if (!sb || !userId) return null

  const weekEnd = addDays(weekStart, 6)

  // Days read this week (from daily_completions across all plans)
  const { data: completions } = await sb.from('daily_completions')
    .select('plan_id, day_number, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', weekStart + 'T00:00:00Z')
    .lte('completed_at', weekEnd  + 'T23:59:59Z')

  // Active plans and their progress
  const { data: memberships } = await sb.from('plan_members')
    .select('plan_id, current_day, status, shared_plans(name, duration_days)')
    .eq('user_id', userId)
    .in('status', ['active', 'completed', 'paused'])

  // Reflections posted this week
  const { data: reflections } = await sb.from('plan_reflections')
    .select('id, plan_id, day_number, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekStart + 'T00:00:00Z')
    .lte('created_at', weekEnd   + 'T23:59:59Z')

  // Build 7-day grid: which dates had a completion?
  const completionDates = new Set(
    (completions || []).map(c => c.completed_at.split('T')[0])
  )
  const daysGrid = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return { date, read: completionDates.has(date) }
  })

  return {
    weekStart,
    weekEnd,
    daysRead:   daysGrid.filter(d => d.read).length,
    daysGrid,
    plans:      (memberships || [])
      .filter(m => m.shared_plans)
      .map(m => ({
        planId:      m.plan_id,
        planName:    m.shared_plans.name,
        currentDay:  m.current_day,
        totalDays:   m.shared_plans.duration_days,
        status:      m.status,
      })),
    reflections: (reflections || []).map(r => ({
      id:        r.id,
      planId:    r.plan_id,
      dayNumber: r.day_number,
      content:   r.content,
      createdAt: r.created_at,
    })),
    completionsCount: (completions || []).length,
  }
}

/**
 * Save a generated weekly report to the database.
 */
export async function saveWeeklyReport(userId, weekStart, reportData) {
  const sb = createClient()
  if (!sb) return null
  const weekEnd = addDays(weekStart, 6)
  const { data, error } = await sb.from('weekly_reports').upsert({
    user_id:     userId,
    week_start:  weekStart,
    week_end:    weekEnd,
    days_read:   reportData.daysRead,
    total_days:  7,
    report_data: reportData,
    created_at:  new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' }).select().single()
  if (error) { console.error('[saveWeeklyReport]', error.message); return null }
  return data
}

/**
 * Fetch past weekly reports for the current user.
 */
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
//  Normalisers
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
    durationDays: row.duration_days,
    status:       row.status,
    memberCount:  row.member_count,
    templateId:   row.template_id,
    createdAt:    row.created_at,
  }
}

function normaliseReflection(row, currentUserId, amenSet = new Set()) {
  const p = row.profiles || {}
  return {
    id:           row.id,
    planId:       row.plan_id,
    dayNumber:    row.day_number,
    authorId:     row.user_id,
    authorName:   p.full_name || p.display_name || p.username || 'Anonymous',
    authorUsername: p.username || null,
    authorAvatar: p.avatar_url || null,
    content:      row.content,
    amened:       amenSet.has(row.id),
    isOwn:        currentUserId === row.user_id,
    createdAt:    row.created_at,
  }
}