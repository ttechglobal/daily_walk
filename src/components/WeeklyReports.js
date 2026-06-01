'use client'

// ── src/components/WeeklyReports.js ──
// Weekly reading report component — shown on the Profile page.
// Grace-oriented throughout. Never shames. Never pressures.
// Shows: 7-day grid, plans progress, personal reflections log, group activity.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { getWeeklyReports } from '../lib/supabase/plans'
import { createClient } from '../lib/supabase/client'

const DAY_LABELS = ['M','T','W','T','F','S','S']

function fmtDateRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${mo[s.getMonth()]} ${s.getDate()} – ${mo[e.getMonth()]} ${e.getDate()}`
}

function timeAgo(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

// ─────────────────────────────────────────────
//  Single week report card
// ─────────────────────────────────────────────
function WeekCard({ report, isCurrentWeek, t }) {
  const [open, setOpen] = useState(isCurrentWeek)
  const data = report.report_data || report

  return (
    <div className="rounded-[18px] overflow-hidden"
      style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>

      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[14px]" style={{ color:t.text }}>
              {isCurrentWeek ? 'This week' : fmtDateRange(data.weekStart, data.weekEnd)}
            </p>
            {isCurrentWeek && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:'#EDE9FF', color:'#5B4FCF' }}>Current</span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>
            {data.daysRead} of 7 days read
          </p>
        </div>

        {/* 7-day mini grid */}
        <div className="flex gap-1 flex-shrink-0">
          {(data.daysGrid || []).map((d, i) => (
            <div key={i}
              className="w-4 h-4 rounded-full"
              style={{
                background: d.read ? '#5B4FCF' : t.bgMuted,
                opacity:    d.read ? 1 : 0.4,
              }}/>
          ))}
        </div>

        {open ? <ChevronUp size={15} style={{ color:t.textFaint, flexShrink:0 }}/>
               : <ChevronDown size={15} style={{ color:t.textFaint, flexShrink:0 }}/>}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
            <div className="px-4 pb-5 flex flex-col gap-4 border-t" style={{ borderColor:t.border }}>

              {/* Grace message */}
              <div className="pt-4">
                <p className="text-[14px] leading-relaxed font-semibold" style={{ color:t.text }}>
                  {data.graceMessage}
                </p>
              </div>

              {/* 7-day strip with day labels */}
              <div>
                <div className="flex items-center gap-1.5">
                  {(data.daysGrid || []).map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-8 rounded-[8px] flex items-center justify-center"
                        style={{
                          background: d.read ? '#5B4FCF' : t.bgMuted,
                        }}>
                        {d.read && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold"
                        style={{ color: d.read ? '#5B4FCF' : t.textFaint }}>
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plans in progress */}
              {data.plans?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color:t.textFaint }}>Plans</p>
                  <div className="flex flex-col gap-2">
                    {data.plans.map(p => (
                      <div key={p.planId} className="flex items-center gap-3">
                        <BookOpen size={13} style={{ color:'#5B4FCF', flexShrink:0 }}/>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[13px] truncate" style={{ color:t.text }}>{p.planName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:t.bgMuted }}>
                              <div className="h-full rounded-full" style={{ width:`${p.pct}%`, background:'#5B4FCF' }}/>
                            </div>
                            <span className="text-[11px] font-bold flex-shrink-0" style={{ color:'#5B4FCF' }}>
                              Day {p.currentDay}/{p.totalDays}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal reflections log — framed as a journal, not a metric */}
              {data.reflections?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color:t.textFaint }}>Your reflections this week</p>
                  <div className="flex flex-col gap-2.5">
                    {data.reflections.map((r, i) => (
                      <div key={i} className="px-3 py-3 rounded-[12px]"
                        style={{ background:t.bgMuted }}>
                        <p className="text-[13px] leading-relaxed" style={{ color:t.text }}>
                          "{r.content}"
                        </p>
                        <p className="text-[11px] mt-1" style={{ color:t.textFaint }}>
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
                    style={{ color:t.textFaint }}>Group activity</p>
                  {data.groupActivity.map((g, i) => (
                    <p key={i} className="text-[13px]" style={{ color:t.textMuted }}>
                      <span className="font-semibold" style={{ color:t.text }}>{g.planName}</span>
                      {' '}— {g.membersActive} member{g.membersActive!==1?'s':''} read this week
                    </p>
                  ))}
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
//  Main component — shown on Profile page
// ─────────────────────────────────────────────
export default function WeeklyReports() {
  const { t }      = useTheme()
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [userId,   setUserId]   = useState(null)

  useEffect(() => {
    const sb = createClient()
    if (!sb) { setLoading(false); return }
    sb.auth.getUser().then(({ data:{ user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      loadReports()
    }).catch(() => setLoading(false))
  }, [])

  async function loadReports() {
    setLoading(true)
    try {
      const r = await getWeeklyReports(8)
      setReports(r)
    } catch { }
    finally { setLoading(false) }
  }

  async function generateCurrentWeek() {
    setRefreshing(true)
    try {
      const sb = createClient()
      if (!sb) return
      const { data:{ session } } = await sb.auth.getSession()
      if (!session) return
      const res = await fetch('/api/weekly-report/generate', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        await loadReports()
      }
    } catch { }
    finally { setRefreshing(false) }
  }

  // Determine current week Monday
  function getMondayStr() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  const currentWeekStart = getMondayStr()
  const currentWeekReport = reports.find(r => r.week_start === currentWeekStart)
  const pastReports = reports.filter(r => r.week_start !== currentWeekStart)

  if (!userId) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[17px]" style={{ color:t.text }}>Weekly Reports</p>
          <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>
            A personal log of your reading — encouraging, never judgmental
          </p>
        </div>
        <button onClick={generateCurrentWeek} disabled={refreshing}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:t.bgMuted }}>
          {refreshing
            ? <Loader2 size={14} className="animate-spin" style={{ color:'#5B4FCF' }}/>
            : <RefreshCw size={14} style={{ color:t.textMuted }}/>
          }
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color:'#5B4FCF' }}/>
        </div>
      ) : (
        <>
          {/* Current week */}
          {currentWeekReport ? (
            <WeekCard report={currentWeekReport} isCurrentWeek={true} t={t}/>
          ) : (
            <div className="rounded-[18px] p-5 flex flex-col items-center gap-3 text-center"
              style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
              <p className="font-semibold text-[14px]" style={{ color:t.text }}>
                No report for this week yet
              </p>
              <p className="text-[13px]" style={{ color:t.textMuted }}>
                Generate your first report to see a summary of this week's reading.
              </p>
              <button onClick={generateCurrentWeek} disabled={refreshing}
                className="px-5 py-2.5 rounded-full text-white font-bold text-[13px]"
                style={{ background:'#5B4FCF' }}>
                {refreshing ? 'Generating…' : 'Generate this week\'s report'}
              </button>
            </div>
          )}

          {/* Past weeks */}
          {pastReports.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color:t.textFaint }}>Previous weeks</p>
              {pastReports.map(r => (
                <WeekCard key={r.id} report={r} isCurrentWeek={false} t={t}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}