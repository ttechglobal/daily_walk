'use client'

// ── src/app/plans/complete/page.js ──
// Shown when a user completes the final day of a plan.
// Warm, meaningful, gospel-centred — not a game screen.
// Access via router.push(`/plans/complete?planId=X`) from PlanDetailClient.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Share2, Compass, Plus } from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import { getPlanById, getMyCompletions } from '../../../lib/supabase/plans'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
}

function CompletionInner() {
  const router = useRouter()
  const sp     = useSearchParams()
  const { t }  = useTheme()

  const planId = sp.get('planId')

  const [plan,      setPlan]      = useState(null)
  const [doneCount, setDoneCount] = useState(0)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!planId) { setLoading(false); return }
    Promise.all([getPlanById(planId), getMyCompletions(planId)])
      .then(([p, comps]) => {
        setPlan(p)
        setDoneCount(comps?.size || 0)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [planId])

  async function handleShare() {
    const text = plan
      ? `I just finished "${plan.name}" on Daily Walk — ${plan.durationDays} days in God's Word. 📖`
      : 'I just completed a Bible reading plan on Daily Walk!'
    if (navigator.share) {
      navigator.share({ title:'Daily Walk', text }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(text).catch(() => null)
      showToast('Message copied!')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:t.bg }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:'#5B4FCF' }}/>
    </div>
  )

  const name     = plan?.name         || 'Your Reading Plan'
  const duration = plan?.durationDays || doneCount
  const started  = plan?.startDate    || null

  return (
    <div className="flex flex-col min-h-screen px-5 py-10" style={{ background:t.bg }}>
      <ToastContainer/>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center max-w-[360px] mx-auto w-full">

        {/* Icon */}
        <motion.div initial={{ scale:0, rotate:-10 }} animate={{ scale:1, rotate:0 }}
          transition={{ type:'spring', stiffness:260, damping:20 }}>
          <div className="w-28 h-28 rounded-[32px] flex items-center justify-center"
            style={{ background:'linear-gradient(145deg,#5B4FCF,#3D3190)',
                     boxShadow:'0 12px 40px rgba(91,79,207,0.4)' }}>
            <span style={{ fontSize:52 }}>📖</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.2 }}
          className="flex flex-col gap-3">
          <p className="font-display font-bold text-[28px] leading-tight" style={{ color:t.text }}>
            You finished<br/>"{name}"
          </p>
          <p className="text-[16px] font-semibold" style={{ color:'#5B4FCF' }}>
            Well done, faithful one.
          </p>
          <p className="text-[14px] leading-relaxed" style={{ color:t.textMuted }}>
            You showed up. Day after day. God's Word does not return void.
          </p>
          <p className="text-[13px] italic" style={{ color:t.textFaint }}>
            "So shall my word be that goes out from my mouth; it shall not return to me empty." — Isaiah 55:11
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.35 }}
          className="w-full rounded-[18px] p-5 flex flex-col gap-3"
          style={{ background:t.bgCard, boxShadow:t.shadow }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-1 p-3 rounded-[12px]"
              style={{ background:'#EDE9FF' }}>
              <p className="font-bold text-[22px]" style={{ color:'#5B4FCF' }}>{duration}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color:'#7C6FCD' }}>
                Days planned
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-[12px]"
              style={{ background:'#E8F5EE' }}>
              <p className="font-bold text-[22px]" style={{ color:'#4A7C5F' }}>{doneCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color:'#4A7C5F' }}>
                Days read
              </p>
            </div>
          </div>
          {started && (
            <p className="text-[12px] text-center" style={{ color:t.textFaint }}>
              Started {fmtDate(started)} · Completed {fmtDate(new Date().toISOString())}
            </p>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:0.5 }}
          className="w-full flex flex-col gap-2.5">

          <button onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-[15px] text-white active:scale-[0.97] transition-all"
            style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            <Share2 size={16}/> Share this milestone
          </button>

          <button onClick={() => router.push('/plans/create')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-[14px] border-2 active:scale-[0.97] transition-all"
            style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
            <Plus size={16}/> Start a new plan
          </button>

          <button onClick={() => router.push('/plans/discover')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-[14px] active:opacity-70"
            style={{ color:t.textMuted }}>
            <Compass size={15}/> Browse more plans
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default function CompletionPage() {
  return <Suspense fallback={null}><CompletionInner/></Suspense>
}