// ── src/app/api/cron/weekly-report/route.js ──
// Called by Vercel cron every Monday at 6am UTC (7am WAT).
// Generates weekly reports for all users who have had activity in the past week.
// Delivers via in-app notification only (email can be added later).
//
// Security: CRON_SECRET env var — set this in Vercel dashboard.
// Vercel passes it automatically; manual calls require the Authorization header.

import { createClient } from '@supabase/supabase-js'
import { NextResponse }  from 'next/server'

// Use service role key — this runs server-side only, never exposed to client
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not set')
  return createClient(url, key, { auth: { persistSession: false } })
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function getConsistencyRating(daysRead) {
  if (daysRead >= 6) return { label: 'Consistent',     emoji: '🔥', color: '#4A7C5F' }
  if (daysRead >= 4) return { label: 'Improving',      emoji: '📈', color: '#E8A838' }
  if (daysRead >= 2) return { label: 'Getting started', emoji: '🌱', color: '#5B4FCF' }
  return                    { label: 'Needs attention', emoji: '💙', color: '#E84060' }
}

function getGraceMessage(daysRead) {
  const messages = {
    7: "Perfect week! You showed up every single day. 🙌",
    6: "Six days in the Word — that's a beautiful rhythm.",
    5: "Five days strong. You're building something lasting.",
    4: "Four days this week. Every day you showed up counts.",
    3: "Three days in God's Word is three days of growth.",
    2: "Two days this week. Grace covers the rest — keep going.",
    1: "One day in the Word is better than none. Come back tomorrow.",
    0: "A quiet week. He's still waiting for you with open arms.",
  }
  return messages[Math.min(daysRead, 7)] || messages[0]
}

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb         = getAdminClient()
  const weekStart  = getMonday(new Date()) // This Monday
  const lastWeekStart = getMonday(addDays(weekStart, -7)) // Last Monday
  const lastWeekEnd   = addDays(lastWeekStart, 6)

  console.log(`[weekly-report cron] Running for week: ${lastWeekStart} → ${lastWeekEnd}`)

  try {
    // 1. Find all users who had activity last week
    const { data: activeUsers, error: usersErr } = await sb
      .from('daily_completions')
      .select('user_id')
      .gte('completed_at', lastWeekStart + 'T00:00:00Z')
      .lte('completed_at', lastWeekEnd   + 'T23:59:59Z')

    if (usersErr) throw usersErr

    const userIds = [...new Set((activeUsers || []).map(r => r.user_id))]
    console.log(`[weekly-report cron] Processing ${userIds.length} active users`)

    let processed = 0
    let errors    = 0

    // 2. Generate report for each user
    for (const userId of userIds) {
      try {
        // Get this user's completions last week
        const { data: completions } = await sb.from('daily_completions')
          .select('plan_id, day_number, completed_at')
          .eq('user_id', userId)
          .gte('completed_at', lastWeekStart + 'T00:00:00Z')
          .lte('completed_at', lastWeekEnd   + 'T23:59:59Z')

        const completionDates = new Set((completions || []).map(c => c.completed_at.split('T')[0]))
        const daysGrid = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(lastWeekStart, i)
          return { date, read: completionDates.has(date) }
        })
        const daysRead = daysGrid.filter(d => d.read).length

        // Get plans progress
        const { data: memberships } = await sb.from('plan_members')
          .select('plan_id, current_day, personal_days, status, shared_plans(name, total_items, duration_days)')
          .eq('user_id', userId)
          .in('status', ['active', 'completed', 'paused'])

        const plansSnapshot = (memberships || [])
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

        // Group leaderboard for shared plans
        const planIds = [...new Set((completions || []).map(c => c.plan_id))]
        let groupLeaderboard = []
        if (planIds.length) {
          const { data: groupCheckins } = await sb.from('daily_completions')
            .select('plan_id, user_id')
            .in('plan_id', planIds)
            .gte('completed_at', lastWeekStart + 'T00:00:00Z')
            .lte('completed_at', lastWeekEnd   + 'T23:59:59Z')

          const byPlan = {}
          for (const c of (groupCheckins || [])) {
            if (!byPlan[c.plan_id]) byPlan[c.plan_id] = new Set()
            byPlan[c.plan_id].add(c.user_id)
          }
          for (const [planId, readers] of Object.entries(byPlan)) {
            if (readers.size <= 1) continue // skip solo plans
            const plan = plansSnapshot.find(p => p.planId === planId)
            // Get member profiles for leaderboard
            const { data: memberDays } = await sb.from('daily_completions')
              .select('user_id')
              .eq('plan_id', planId)
              .gte('completed_at', lastWeekStart + 'T00:00:00Z')
              .lte('completed_at', lastWeekEnd   + 'T23:59:59Z')
            const memberCounts = {}
            for (const row of (memberDays || [])) {
              memberCounts[row.user_id] = (memberCounts[row.user_id] || 0) + 1
            }
            const ranked = Object.entries(memberCounts)
              .sort(([,a],[,b]) => b - a)
              .slice(0, 5)
            groupLeaderboard.push({
              planId,
              planName:    plan?.planName || 'Reading Plan',
              totalReaders: readers.size,
              ranked: ranked.map(([uid, days]) => ({ userId: uid, daysRead: days })),
            })
          }
        }

        const consistency = getConsistencyRating(daysRead)

        const reportData = {
          weekStart:    lastWeekStart,
          weekEnd:      lastWeekEnd,
          daysRead,
          daysGrid,
          graceMessage: getGraceMessage(daysRead),
          consistency,
          plans:        plansSnapshot,
          groupLeaderboard,
          generatedAt:  new Date().toISOString(),
        }

        // 3. Save report
        await sb.from('weekly_reports').upsert({
          user_id:     userId,
          week_start:  lastWeekStart,
          week_end:    lastWeekEnd,
          days_read:   daysRead,
          total_days:  7,
          report_data: reportData,
          created_at:  new Date().toISOString(),
        }, { onConflict: 'user_id,week_start' })

        // 4. Deliver in-app notification
        const notifTitle = `${consistency.emoji} Your weekly reading report`
        const notifBody  = `${daysRead}/7 days this week — ${consistency.label}. Tap to see your summary.`
        await sb.from('notifications').insert({
          user_id:    userId,
          type:       'weekly_report',
          title:      notifTitle,
          body:       notifBody,
          data:       { weekStart: lastWeekStart, reportType: 'weekly' },
          read:       false,
          created_at: new Date().toISOString(),
        })

        processed++
      } catch (userErr) {
        console.error(`[weekly-report cron] Error for user ${userId}:`, userErr.message)
        errors++
      }
    }

    console.log(`[weekly-report cron] Done. Processed: ${processed}, Errors: ${errors}`)
    return NextResponse.json({
      success: true,
      week:    lastWeekStart,
      processed,
      errors,
    })

  } catch (err) {
    console.error('[weekly-report cron] Fatal error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}