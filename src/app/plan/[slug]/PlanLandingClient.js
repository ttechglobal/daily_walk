'use client'

// ── src/app/plan/[slug]/PlanLandingClient.js ──
// Fix: guards against undefined slug on first render (Next.js 16 async params)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Map, BookOpen, Check, Calendar } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = {
  book:      '#5B4FCF',
  topic:     '#4A7C5F',
  character: '#E8A838',
}

const TYPE_LABELS = {
  book:      'Book study',
  topic:     'Topical plan',
  character: 'Character study',
}

export default function PlanLandingClient({ slug }) {
  const router    = useRouter()
  const [planData, setPlanData] = useState(null)

  useEffect(() => {
    // Guard: slug may be undefined on first render with async params
    if (!slug) return

    const parts   = slug.split('-')
    const shortId = parts[parts.length - 1]

    // Try localStorage first (shared from this device)
    try {
      const stored = localStorage.getItem(`dw_plan_share_${shortId}`)
      if (stored) {
        setPlanData(JSON.parse(stored))
        return
      }
    } catch {}

    // Fallback: derive name from slug
    const name = parts.slice(0, -1)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    setPlanData({
      name:    name || 'Bible Reading Plan',
      desc:    '',
      days:    30,
      type:    'topic',
      preview: [],
    })
  }, [slug])

  // Loading — slug not yet resolved or data not yet set
  if (!slug || !planData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#5B4FCF' }} />
      </div>
    )
  }

  const color   = TYPE_COLORS[planData.type] || '#5B4FCF'
  const label   = TYPE_LABELS[planData.type]  || 'Reading plan'
  const preview = planData.preview || []

  return (
    <div className="min-h-screen flex flex-col items-center"
      style={{ background: '#FAF8F5' }}>

      {/* Hero band */}
      <div className="w-full py-10 px-4 flex flex-col items-center text-center"
        style={{ background: `linear-gradient(160deg, ${color}22 0%, #FAF8F5 100%)` }}>
        <div className="flex items-center gap-3 mb-6">
          <AppIcon size={40} />
          <div className="text-left">
            <p className="font-bold text-[17px]" style={{ color: '#1A1A2E' }}>Daily Walk</p>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>Your daily devotion, together</p>
          </div>
        </div>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `${color}20` }}>
          <Map size={28} style={{ color }} />
        </div>

        <h1 className="font-bold text-[26px] leading-tight mb-2 max-w-[320px]"
          style={{ color: '#1A1A2E', fontFamily: 'Lora, Georgia, serif' }}>
          {planData.name}
        </h1>

        <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
          <span className="text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background: `${color}18`, color }}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: '#6B7280' }}>
            <Calendar size={12} />
            <span>{planData.days} days</span>
          </div>
        </div>

        {planData.desc && (
          <p className="text-[14px] leading-relaxed max-w-[340px]" style={{ color: '#6B7280' }}>
            {planData.desc}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-[420px] px-4 pb-16 flex flex-col gap-4">

        {/* Day preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-[20px] overflow-hidden"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#F5F3F0' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: '#9CA3AF' }}>
                First {preview.length} days
              </p>
            </div>
            {preview.map((d, i) => (
              <div key={i}
                className="flex items-start gap-3 px-5 py-3.5 border-b last:border-0"
                style={{ borderColor: '#F5F3F0' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                  style={{ background: color }}>
                  {d.day}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[14px]" style={{ color: '#1A1A2E' }}>{d.passage}</p>
                  {d.title && (
                    <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{d.title}</p>
                  )}
                  {d.focus && (
                    <p className="text-[11px] mt-0.5 italic" style={{ color: '#9CA3AF' }}>{d.focus}</p>
                  )}
                </div>
              </div>
            ))}
            {planData.days > preview.length && (
              <div className="px-5 py-3 text-center">
                <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
                  + {planData.days - preview.length} more days
                </p>
              </div>
            )}
          </div>
        )}

        {/* What you get */}
        <div className="bg-white rounded-[20px] px-5 py-4"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <p className="font-bold text-[13px] mb-3" style={{ color: '#1A1A2E' }}>What's included</p>
          {[
            'Daily Scripture passages with reflections',
            'Track your progress day by day',
            'Read offline — no internet needed',
            'Free — no account required to start',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}>
                <Check size={11} style={{ color }} strokeWidth={2.5} />
              </div>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>{item}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 mt-2">
          <a
            href="/plans"
            className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold active:scale-[0.97] transition-all"
            style={{ background: color, boxShadow: `0 4px 20px ${color}55` }}>
            Start this plan →
          </a>
          <a
            href="/"
            className="block w-full text-center rounded-full py-3.5 text-[14px] font-semibold border-2"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            Open Daily Walk
          </a>
          <p className="text-[12px] text-center" style={{ color: '#9CA3AF' }}>
            Free · No account required · Works offline
          </p>
        </div>
      </div>
    </div>
  )
}