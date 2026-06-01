// ── src/app/api/weekly-report/generate/route.js ──
// Generates and stores a weekly report for the current user.
// Called by the profile page on load, or by a cron job on Sunday/Monday.

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function getMondayOf(dateStr) {
  const d = new Date(dateStr || Date.now())
  const day = d.getDay()           // 0=Sun,1=Mon…6=Sat
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function getGraceMessage(daysRead) {
  if (daysRead >= 6) return "You showed up 6 out of 7 days this week — God's Word is taking root."
  if (daysRead >= 4) return "You read 4 days this week — every day in the Word counts."
  if (daysRead >= 1) return "Life gets busy. You still opened the Word this week — that matters."
  return "A new week is ahead. Today is a great day to start again."
}

export async function POST(request) {
  try {
    const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const sb = createServerClient(url, serviceKey)

    // Get the requesting user from the auth header
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body       = await request.json().catch(() => ({}))
    const weekFor    = body.weekStart || getMondayOf(new Date().toISOString())
    const weekStart  = getMondayOf(weekFor)
    const weekEnd    = addDays(weekStart, 6)

    // 1. Days read this week
    const { data: completions } = await sb.from('daily_completions')
      .select('plan_id, day_number, completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', weekStart + 'T00:00:00Z')
      .lte('completed_at', weekEnd   + 'T23:59:59Z')

    const completionDates = new Set(
      (completions || []).map(c => c.completed_at.split('T')[0])
    )
    const daysGrid = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return { date, read: completionDates.has(date) }
    })
    const daysRead = daysGrid.filter(d => d.read).length

    // 2. Active plans
    const { data: memberships } = await sb.from('plan_members')
      .select('plan_id, current_day, status, shared_plans(name, duration_days)')
      .eq('user_id', user.id)
      .in('status', ['active', 'completed'])

    const plansSnapshot = (memberships || [])
      .filter(m => m.shared_plans)
      .map(m => ({
        planId:     m.plan_id,
        planName:   m.shared_plans.name,
        currentDay: m.current_day,
        totalDays:  m.shared_plans.duration_days,
        pct:        Math.min(100, Math.round(((m.current_day - 1) / m.shared_plans.duration_days) * 100)),
        status:     m.status,
      }))

    // 3. Reflections this week (personal log — not a metric)
    const { data: reflections } = await sb.from('plan_reflections')
      .select('id, plan_id, day_number, content, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekStart + 'T00:00:00Z')
      .lte('created_at', weekEnd   + 'T23:59:59Z')

    // 4. Group activity for shared plans (how many members checked in)
    const planIds = [...new Set((completions || []).map(c => c.plan_id))]
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
        return {
          planId,
          planName:      plan?.planName || 'Reading Plan',
          membersActive: userSet.size,
        }
      })
    }

    // 5. Assemble report
    const report = {
      weekStart,
      weekEnd,
      daysRead,
      daysGrid,
      graceMessage:  getGraceMessage(daysRead),
      plans:         plansSnapshot,
      reflections:   (reflections || []).map(r => ({
        planId:    r.plan_id,
        dayNumber: r.day_number,
        content:   r.content,
        createdAt: r.created_at,
      })),
      groupActivity,
      generatedAt:   new Date().toISOString(),
    }

    // 6. Save to weekly_reports
    const { data: saved, error: saveErr } = await sb.from('weekly_reports')
      .upsert({
        user_id:     user.id,
        week_start:  weekStart,
        week_end:    weekEnd,
        days_read:   daysRead,
        total_days:  7,
        report_data: report,
        created_at:  new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
      .select().single()

    if (saveErr) console.warn('[weekly-report] save error:', saveErr.message)

    return NextResponse.json({ success: true, report, id: saved?.id || null })
  } catch (e) {
    console.error('[weekly-report/generate]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}