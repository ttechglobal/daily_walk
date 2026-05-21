'use client'

// ── src/app/plan/join/[code]/JoinPlanClient.js ──

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Users, Check, Loader2, ArrowLeft } from 'lucide-react'
import { useTheme } from '../../../../lib/theme'
import { ToastContainer, showToast } from '../../../../components/Toast'

export default function JoinPlanClient({ code }) {
  const router = useRouter()
  const { t }  = useTheme()

  const [plan,          setPlan]          = useState(null)
  const [days,          setDays]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [joining,       setJoining]       = useState(null)
  const [authUser,      setAuthUser]      = useState(null)
  const [alreadyMember, setAlreadyMember] = useState(false)
  const [notFound,      setNotFound]      = useState(false)

  useEffect(() => {
    if (!code) return
    loadPlan()
  }, [code])

  async function loadPlan() {
    setLoading(true)
    try {
      const { getPlanByInviteCode, getPlanDays } = await import('../../../../lib/supabase/plans')
      const { getAuthUser } = await import('../../../../lib/supabase/communities')
      const { createClient } = await import('../../../../lib/supabase/client')

      const [p, user] = await Promise.all([
        getPlanByInviteCode(code),
        getAuthUser(),
      ])

      if (!p) { setNotFound(true); setLoading(false); return }

      setPlan(p)
      setAuthUser(user)

      const d = await getPlanDays(p.id)
      setDays((d || []).slice(0, 5))

      // Check membership
      if (user) {
        const sb = createClient()
        if (sb) {
          const { data } = await sb.from('plan_members')
            .select('status').eq('plan_id', p.id).eq('user_id', user.id).maybeSingle()
          if (data?.status === 'active') setAlreadyMember(true)
        }
      }
    } catch (e) {
      console.error('[JoinPlanClient] load error:', e.message)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(fromDay) {
    if (!plan) return

    // Not logged in — redirect to auth with next URL preserved
    if (!authUser) {
      router.push(`/auth?next=${encodeURIComponent(`/plan/join/${code}`)}`)
      return
    }

    setJoining(fromDay === 1 ? 'day1' : 'today')
    try {
      const { joinPlan } = await import('../../../../lib/supabase/plans')
      await joinPlan(plan.id, { fromDay })
      showToast(`Joined "${plan.name}" 🙌`)
      router.push(`/plans/${plan.id}`)
    } catch (e) {
      console.error('[JoinPlanClient] join error:', e.message)
      if (e.message === 'not_authenticated') {
        router.push(`/auth?next=${encodeURIComponent(`/plan/join/${code}`)}`)
      } else {
        showToast('Something went wrong — try again')
        setJoining(null)
      }
    }
  }

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: t.bg }}>
      <Loader2 size={24} className="animate-spin" style={{ color: '#5B4FCF' }}/>
    </div>
  )

  // ── Not found ──
  if (notFound || !plan) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center"
      style={{ background: t.bg }}>
      <span style={{ fontSize: 40 }}>🔍</span>
      <p className="font-bold text-[18px]" style={{ color: t.text }}>Plan not found</p>
      <p className="text-[14px]" style={{ color: t.textMuted }}>
        This invite link may have expired or the plan may have been removed.
        Check the code and try again.
      </p>
      <button onClick={() => router.push('/plans/create?joinCode=1')}
        className="px-5 py-3 rounded-full text-white font-bold text-[14px]"
        style={{ background: '#5B4FCF' }}>
        Try a different code
      </button>
      <button onClick={() => router.push('/plans')}
        className="text-[13px] font-semibold" style={{ color: t.textMuted }}>
        Browse plans
      </button>
    </div>
  )

  const today          = new Date().toISOString().split('T')[0]
  const started        = plan.startDate <= today
  const currentPlanDay = started
    ? Math.min(
        Math.max(1, Math.round((Date.now() - new Date(plan.startDate)) / 86400000) + 1),
        plan.durationDays
      )
    : 1

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button onClick={() => router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.bgCard, boxShadow: t.shadow }}>
          <ArrowLeft size={18} style={{ color: t.text }}/>
        </button>
        <p className="font-semibold text-[14px]" style={{ color: t.textMuted }}>Reading Plan Invite</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-5">

        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="rounded-[22px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <div className="px-5 py-6">
            <div className="text-[44px] mb-3">📖</div>
            <h1 className="font-display font-bold text-[24px] text-white leading-tight">{plan.name}</h1>
            {plan.description && (
              <p className="text-[14px] text-white/75 mt-2 leading-relaxed">{plan.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-white/70"/>
                <span className="text-[13px] text-white/70 font-semibold">{plan.durationDays} days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-white/70"/>
                <span className="text-[13px] text-white/70 font-semibold">
                  {plan.memberCount} member{plan.memberCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[13px] text-white/60">by {plan.creatorName}</span>
            </div>
          </div>
        </motion.div>

        {/* Already a member */}
        {alreadyMember && (
          <div className="rounded-[18px] p-4 flex items-center gap-3"
            style={{ background: '#E0FBEC', border: '1.5px solid #4A7C5F30' }}>
            <Check size={20} style={{ color: '#4A7C5F' }}/>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px]" style={{ color: '#2D5A40' }}>You're already in this plan</p>
              <p className="text-[12px]" style={{ color: '#4A7C5F' }}>Continue where you left off</p>
            </div>
            <button onClick={() => router.push(`/plans/${plan.id}`)}
              className="ml-auto px-4 py-2 rounded-full font-bold text-[13px] text-white flex-shrink-0"
              style={{ background: '#4A7C5F' }}>
              Open →
            </button>
          </div>
        )}

        {/* Passage preview */}
        {days.length > 0 && (
          <div>
            <p className="font-bold text-[14px] mb-2" style={{ color: t.text }}>First few passages</p>
            <div className="flex flex-col gap-1.5">
              {days.map(d => (
                <div key={d.day_number}
                  className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
                  style={{ background: t.bgCard, border: `1.5px solid ${t.border}` }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: t.bgMuted, color: t.textFaint }}>
                    {d.day_number}
                  </div>
                  <p className="font-semibold text-[13px] truncate" style={{ color: t.text }}>
                    {d.passage_reference}
                  </p>
                </div>
              ))}
              {plan.durationDays > 5 && (
                <p className="text-[12px] text-center" style={{ color: t.textFaint }}>
                  + {plan.durationDays - 5} more passages
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sign-in prompt if not logged in */}
        {!authUser && !alreadyMember && (
          <div className="rounded-[18px] p-5 text-center flex flex-col items-center gap-3"
            style={{ background: t.bgCard, boxShadow: t.shadow }}>
            <p className="font-bold text-[16px]" style={{ color: t.text }}>Sign in to join</p>
            <p className="text-[13px]" style={{ color: t.textMuted }}>
              Create a free account to join this plan and read together.
            </p>
            <button
              onClick={() => router.push(`/auth?next=${encodeURIComponent(`/plan/join/${code}`)}`)}
              className="w-full py-4 rounded-full text-white font-bold text-[15px]"
              style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
              Sign in to join →
            </button>
          </div>
        )}

        {/* Join options — only if authenticated and not already a member */}
        {authUser && !alreadyMember && (
          <div className="flex flex-col gap-3">
            <p className="font-bold text-[15px]" style={{ color: t.text }}>
              {started && currentPlanDay > 1
                ? `This plan is on Day ${currentPlanDay} — where would you like to start?`
                : 'Ready to join?'
              }
            </p>

            <button onClick={() => handleJoin(1)} disabled={!!joining}
              className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
              {joining === 'day1'
                ? <><Loader2 size={17} className="animate-spin"/> Joining…</>
                : 'Start from Day 1'
              }
            </button>

            {started && currentPlanDay > 1 && (
              <button onClick={() => handleJoin(currentPlanDay)} disabled={!!joining}
                className="w-full py-4 rounded-full font-bold text-[15px] border-2 disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                style={{ borderColor: '#5B4FCF', color: '#5B4FCF', background: 'transparent' }}>
                {joining === 'today'
                  ? <><Loader2 size={17} className="animate-spin"/> Joining…</>
                  : `Join from Day ${currentPlanDay} (today)`
                }
              </button>
            )}

            <p className="text-center text-[12px] leading-relaxed" style={{ color: t.textFaint }}>
              Both options are equally valid — grace covers the rest.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}