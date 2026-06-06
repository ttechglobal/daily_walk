'use client'

// ── src/app/plans/[id]/progress/page.js ──
// Member progress board for group plans.
// Shows each member's % completion, streak indicator, and today's read status.
// Real-time updates via Supabase channel on daily_completions.
// Route: /plans/[id]/progress

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Clock, TrendingUp, Users,
  Loader2, RefreshCw,
} from 'lucide-react'
import { useTheme } from '../../../../lib/theme'
import { useAuthContext } from '../../../../contexts/AuthContext'
import { getMemberProgressBoard, getPlanById, subscribeToDayCheckins } from '../../../../lib/supabase/plans'
import { getCompletionPct, getFrequencyLabel } from '../../../../lib/plan-schedule'
import { createClient } from '../../../../lib/supabase/client'
import { ToastContainer } from '../../../../components/Toast'

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  '#5B4FCF', '#4A7C5F', '#E8A838', '#E84060',
  '#7CB9E8', '#8B5CF6', '#EC4899', '#14B8A6',
]
function avatarColor(userId) {
  let hash = 0
  for (const c of (userId || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─────────────────────────────────────────────
//  MemberRow
// ─────────────────────────────────────────────
function MemberRow({ member, rank, isMe, t }) {
  const color = avatarColor(member.userId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-[16px]"
      style={{
        background: isMe ? '#EDE9FF' : t.bgCard,
        border: `1px solid ${isMe ? '#5B4FCF40' : t.border}`,
      }}
    >
      {/* Rank */}
      <span className="text-[13px] font-bold w-5 text-center flex-shrink-0"
        style={{ color: rank === 0 ? '#E8A838' : t.textFaint }}>
        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
      </span>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: color }}>
        {member.avatar
          ? <img src={member.avatar} alt="" className="w-full h-full object-cover" />
          : <span className="text-[12px] font-bold text-white">{avatarInitials(member.name)}</span>
        }
      </div>

      {/* Name + pace */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-[14px] truncate" style={{ color: t.text }}>
            {member.name}
            {isMe && <span className="text-[11px] font-semibold ml-1" style={{ color: '#5B4FCF' }}>(you)</span>}
          </p>
        </div>
        {member.frequencyUnit && (
          <p className="text-[11px]" style={{ color: t.textFaint }}>
            {getFrequencyLabel(member.frequencyUnit, member.frequencyCount)}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-[14px]" style={{ color: t.text }}>
            {member.pctComplete}%
          </p>
          {member.status === 'completed' && (
            <CheckCircle2 size={14} style={{ color: '#4A7C5F' }} />
          )}
        </div>
        {/* Mini progress bar */}
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: t.bgMuted }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${member.pctComplete}%`,
              background: isMe ? '#5B4FCF' : color,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <p className="text-[10px]" style={{ color: t.textFaint }}>
          Day {member.currentDay}{member.personalDays ? `/${member.personalDays}` : ''}
        </p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Progress Page
// ─────────────────────────────────────────────
export default function ProgressPage({ params }) {
  const planId      = params?.id
  const { t }       = useTheme()
  const { user }    = useAuthContext()
  const router      = useRouter()

  const [plan,      setPlan]      = useState(null)
  const [members,   setMembers]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  // Today's check-in state (real-time ring)
  const [checkedIn, setCheckedIn] = useState(new Set())

  async function load(quiet = false) {
    if (!planId) return
    if (!quiet) setLoading(true)
    else setRefreshing(true)

    const [planData, membersData] = await Promise.all([
      getPlanById(planId),
      getMemberProgressBoard(planId),
    ])

    // Also get today's checkins
    try {
      const sb = createClient()
      if (sb) {
        const today = new Date()
        const start = new Date(today.setHours(0,0,0,0)).toISOString()
        const end   = new Date(today.setHours(23,59,59,999)).toISOString()
        const { data } = await sb.from('daily_completions')
          .select('user_id')
          .eq('plan_id', planId)
          .gte('completed_at', start)
          .lte('completed_at', end)
        setCheckedIn(new Set((data || []).map(r => r.user_id)))
      }
    } catch {}

    setPlan(planData)
    setMembers(membersData)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [planId])

  // Real-time: subscribe to today's check-ins
  useEffect(() => {
    if (!planId || !members.length) return
    // Use the first member's current day as a proxy (progress board context)
    const dayNumber = members[0]?.currentDay || 1
    const unsub = subscribeToDayCheckins(planId, dayNumber, ({ userId }) => {
      setCheckedIn(prev => new Set([...prev, userId]))
    })
    return unsub
  }, [planId, members])

  const totalMembers  = members.length
  const checkedToday  = members.filter(m => checkedIn.has(m.userId)).length
  const avgPct        = totalMembers
    ? Math.round(members.reduce((s, m) => s + m.pctComplete, 0) / totalMembers)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
        style={{ background: t.bg }}>
        <p className="font-bold text-[18px]" style={{ color: t.text }}>Plan not found</p>
        <button onClick={() => router.push('/plans')}
          className="px-5 py-2.5 rounded-full text-white font-bold"
          style={{ background: '#5B4FCF' }}>Back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 flex-shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.bgCard, boxShadow: t.shadow }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] truncate" style={{ color: t.text }}>
            Group Progress
          </h1>
          <p className="text-[12px] truncate" style={{ color: t.textFaint }}>
            {plan.name}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgCard }}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} style={{ color: t.textMuted }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users,       label: 'Members',      value: totalMembers },
            { icon: CheckCircle2,label: 'Read today',   value: checkedToday },
            { icon: TrendingUp,  label: 'Avg progress', value: `${avgPct}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[16px] px-3 py-3 flex flex-col gap-1"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <Icon size={14} style={{ color: '#5B4FCF' }} />
              <p className="font-bold text-[18px]" style={{ color: t.text }}>{value}</p>
              <p className="text-[10px] font-semibold" style={{ color: t.textFaint }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Today's reading ring */}
        <div className="rounded-[18px] px-4 py-3.5"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-[14px]" style={{ color: t.text }}>Today's reading</p>
            <p className="text-[12px] font-semibold" style={{ color: t.textFaint }}>
              {checkedToday}/{totalMembers} read
            </p>
          </div>
          {/* Avatars row */}
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const done  = checkedIn.has(m.userId)
              const color = avatarColor(m.userId)
              return (
                <div key={m.userId} className="relative">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: color, opacity: done ? 1 : 0.4 }}>
                    {m.avatar
                      ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-white">{avatarInitials(m.name)}</span>
                    }
                  </div>
                  {done && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                      <CheckCircle2 size={12} style={{ color: '#4A7C5F' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <p className="font-bold text-[15px] mb-2 px-1" style={{ color: t.text }}>
            Leaderboard
          </p>
          <div className="flex flex-col gap-2">
            {members.map((m, i) => (
              <MemberRow
                key={m.userId}
                member={m}
                rank={i}
                isMe={m.userId === user?.id}
                t={t}
              />
            ))}
            {members.length === 0 && (
              <p className="text-center py-8 text-[14px]" style={{ color: t.textMuted }}>
                No members yet
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}