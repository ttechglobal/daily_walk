'use client'

// ── src/components/WeeklyReports.js ── v3 — DEFINITIVE FIX
//
// TWO BUGS FIXED:
//
// BUG 1 — "if (!userId) return null" race condition:
//   loadReports() was called before setUserId() had been processed by React.
//   When loadReports() resolved and called setReports(r), the component was
//   still returning null (because userId was still null in that render cycle).
//   React discarded the update. When setUserId finally ran and triggered a
//   re-render, reports was [] again.
//
//   FIX: Single async init() — auth check + reports load run together with
//   Promise.all. State is set once at the end. No race. No wasted renders.
//   Guard changed from `if (!userId)` to `if (!isAuthed && !loading)` so
//   the component is visible the moment we confirm auth, not after.
//
// BUG 2 — reading_plans 404:
//   AppInit.js was querying a non-existent `reading_plans` table on every
//   app load (fixed separately in AppInit.js). That 404 was polluting the
//   fetch queue and in some cases causing the weekly-report generate call
//   to fail silently.
//
// Grace-oriented throughout. Never shames. Never pressures.

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { getWeeklyReports } from '../lib/supabase/plans'
import { createClient } from '../lib/supabase/client'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function fmtDateRange(start, end) {
  const s  = new Date(start)
  const e  = new Date(end)
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${mo[s.getMonth()]} ${s.getDate()} – ${mo[e.getMonth()]} ${e.getDate()}`
}

function timeAgo(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMondayStr() {
  const d   = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
//  Single week report card
// ─────────────────────────────────────────────
function WeekCard({ report, isCurrentWeek, t }) {
  const [open, setOpen] = useState(isCurrentWeek)
  const data = report.report_data || report

  return (
    <div className="rounded-[18px] overflow-hidden"
      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>

      {/* Header — always visible */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[14px]" style={{ color: t.text }}>
              {isCurrentWeek ? 'This week' : fmtDateRange(data.weekStart, data.weekEnd)}
            </p>
            {isCurrentWeek && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#EDE9FF', color: '#5B4FCF' }}>Current</span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
            {data.daysRead ?? 0} of 7 days read
          </p>
        </div>

        {/* 7-day mini dot grid */}
        <div className="flex gap-1 flex-shrink-0">
          {(data.daysGrid || []).map((d, i) => (
            <div key={i} className="w-4 h-4 rounded-full"
              style={{
                background: d.read ? '#5B4FCF' : t.bgMuted,
                opacity:    d.read ? 1 : 0.4,
              }} />
          ))}
        </div>

        {open
          ? <ChevronUp  size={16} style={{ color: t.textFaint, flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: t.textFaint, flexShrink: 0 }} />
        }
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-5 flex flex-col gap-4"
              style={{ borderTop: `1px solid ${t.border}` }}>

              {/* Grace message */}
              {data.graceMessage && (
                <p className="text-[13px] leading-relaxed pt-3 italic"
                  style={{ color: t.textMuted }}>
                  "{data.graceMessage}"
                </p>
              )}

              {/* Day-by-day grid */}
              {(data.daysGrid || []).length > 0 && (
                <div className="flex justify-between">
                  {data.daysGrid.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold" style={{ color: t.textFaint }}>
                        {DAY_LABELS[i]}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: d.read ? '#5B4FCF' : t.bgMuted,
                          border:     d.read ? 'none' : `1.5px solid ${t.border}`,
                        }}>
                        {d.read && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Plans progress */}
              {data.plans?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
                    style={{ color: t.textFaint }}>Reading plans</p>
                  <div className="flex flex-col gap-3">
                    {data.plans.map((p, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[13px] font-semibold truncate" style={{ color: t.text }}>
                            {p.planName}
                          </p>
                          <span className="text-[11px] font-semibold flex-shrink-0"
                            style={{ color: p.status === 'completed' ? '#4A7C5F' : '#5B4FCF' }}>
                            {p.status === 'completed'
                              ? '✓ Done'
                              : `Day ${p.currentDay ?? '?'}/${p.totalDays ?? '?'}`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: t.bgMuted }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${p.pct ?? 0}%`, background: '#5B4FCF' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflections — framed as a journal */}
              {data.reflections?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: t.textFaint }}>Your reflections this week</p>
                  <div className="flex flex-col gap-2.5">
                    {data.reflections.map((r, i) => (
                      <div key={i} className="px-3 py-3 rounded-[12px]"
                        style={{ background: t.bgMuted }}>
                        <p className="text-[13px] leading-relaxed" style={{ color: t.text }}>
                          "{r.content}"
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: t.textFaint }}>
                          {timeAgo(r.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group activity */}
              {data.groupActivity?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: t.textFaint }}>Group activity</p>
                  {data.groupActivity.map((g, i) => (
                    <p key={i} className="text-[13px]" style={{ color: t.textMuted }}>
                      <span className="font-semibold" style={{ color: t.text }}>{g.planName}</span>
                      {' — '}{g.membersActive} member{g.membersActive !== 1 ? 's' : ''} read this week
                    </p>
                  ))}
                </div>
              )}

              {/* Nothing to show */}
              {!data.graceMessage && !data.plans?.length && !data.reflections?.length && (
                <div className="flex items-center gap-2 pt-2">
                  <BookOpen size={14} style={{ color: t.textFaint }} />
                  <p className="text-[13px]" style={{ color: t.textMuted }}>
                    No reading activity recorded this week.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function WeeklyReports() {
  const { t } = useTheme()

  const [isAuthed,   setIsAuthed]   = useState(false)
  const [reports,    setReports]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accessToken, setAccessToken] = useState(null)

  // ── Single async init — no race condition ──
  useEffect(() => {
    let cancelled = false

    async function init() {
      const sb = createClient()
      if (!sb) { setLoading(false); return }

      try {
        // Get auth user + session together
        const [userResult, sessionResult] = await Promise.all([
          sb.auth.getUser(),
          sb.auth.getSession(),
        ])

        const user    = userResult?.data?.user
        const session = sessionResult?.data?.session

        if (!user || cancelled) { setLoading(false); return }

        // Load reports now that we know user is authed
        const reports = await getWeeklyReports(8)

        if (cancelled) return

        // Set everything at once — single render
        setIsAuthed(true)
        setReports(reports || [])
        setAccessToken(session?.access_token || null)
      } catch (e) {
        console.warn('[WeeklyReports] init error:', e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const loadReports = useCallback(async () => {
    try {
      const r = await getWeeklyReports(8)
      setReports(r || [])
    } catch (e) {
      console.warn('[WeeklyReports] reload error:', e.message)
    }
  }, [])

  async function generateCurrentWeek() {
    if (!accessToken) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/weekly-report/generate', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) await loadReports()
    } catch (e) {
      console.warn('[WeeklyReports] generate error:', e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const currentWeekStart  = getMondayStr()
  const currentWeekReport = reports.find(r => r.week_start === currentWeekStart)
  const pastReports       = reports.filter(r => r.week_start !== currentWeekStart)

  // Guest — hide entirely
  if (!loading && !isAuthed) return null

  return (
    <div className="flex flex-col gap-4">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[17px]" style={{ color: t.text }}>Weekly Reports</p>
          <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
            A personal log of your reading — encouraging, never judgmental
          </p>
        </div>
        {isAuthed && (
          <button
            onClick={generateCurrentWeek}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: t.bgMuted }}
            title="Refresh report">
            {refreshing
              ? <Loader2 size={14} className="animate-spin" style={{ color: '#5B4FCF' }} />
              : <RefreshCw size={14} style={{ color: t.textMuted }} />
            }
          </button>
        )}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: '#5B4FCF' }} />
        </div>
      )}

      {/* Reports */}
      {!loading && isAuthed && (
        <>
          {/* This week */}
          {currentWeekReport ? (
            <WeekCard report={currentWeekReport} isCurrentWeek={true} t={t} />
          ) : (
            <div className="rounded-[18px] p-5 flex flex-col items-center gap-3 text-center"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <p className="font-semibold text-[14px]" style={{ color: t.text }}>
                No report yet this week
              </p>
              <p className="text-[13px]" style={{ color: t.textMuted }}>
                Complete a day in a reading plan, then generate your weekly summary.
              </p>
              <button
                onClick={generateCurrentWeek}
                disabled={refreshing}
                className="px-5 py-2.5 rounded-full text-white font-bold text-[13px] active:scale-95 transition-transform"
                style={{ background: '#5B4FCF' }}>
                {refreshing ? 'Generating…' : "Generate this week's report"}
              </button>
            </div>
          )}

          {/* Past weeks */}
          {pastReports.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: t.textFaint }}>Previous weeks</p>
              {pastReports.map(r => (
                <WeekCard key={r.id || r.week_start} report={r} isCurrentWeek={false} t={t} />
              ))}
            </div>
          )}

          {/* Completely empty */}
          {!currentWeekReport && pastReports.length === 0 && (
            <div className="rounded-[18px] p-6 flex flex-col items-center gap-3 text-center"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <BookOpen size={30} style={{ color: '#5B4FCF', opacity: 0.45 }} />
              <p className="font-semibold text-[14px]" style={{ color: t.text }}>
                No reports yet
              </p>
              <p className="text-[13px] max-w-[260px]" style={{ color: t.textMuted }}>
                Finish your first reading day in a plan and your weekly report will appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}