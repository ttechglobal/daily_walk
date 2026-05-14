'use client'

import { useEffect, useState } from 'react'
import { Map } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = { book:'#5B4FCF', topic:'#4A7C5F', character:'#E8A838' }

export default function PlanLandingClient({ slug }) {
  const [planData, setPlanData] = useState(null)

  useEffect(() => {
    // Extract shortId (last segment after final dash)
    const parts   = slug.split('-')
    const shortId = parts[parts.length - 1]

    // Try localStorage first (shared from this device)
    try {
      const stored = localStorage.getItem(`dw_plan_share_${shortId}`)
      if (stored) { setPlanData(JSON.parse(stored)); return }
    } catch {}

    // Fallback: derive name from slug
    const name = parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    setPlanData({ name: name || 'Bible Reading Plan', desc:'', days: 30, type:'topic', preview:[] })
  }, [slug])

  if (!planData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#FAF8F5' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} />
    </div>
  )

  const color   = TYPE_COLORS[planData.type] || '#5B4FCF'
  const preview = planData.preview || []

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ background:'#FAF8F5', fontFamily:'system-ui, sans-serif' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <AppIcon size={48} />
        <div>
          <p className="font-bold text-[20px]" style={{ color:'#1A1A2E' }}>Daily Walk</p>
          <p className="text-[13px]" style={{ color:'#6B7280' }}>Your daily devotion, together</p>
        </div>
      </div>

      {/* Plan card */}
      <div className="w-full max-w-[420px] bg-white rounded-[24px] overflow-hidden"
        style={{ boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
        <div className="h-2 w-full" style={{ background: color }} />

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${color}18` }}>
              <Map size={28} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[22px] leading-snug"
                style={{ color:'#1A1A2E', fontFamily:'Lora, Georgia, serif' }}>
                {planData.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background:`${color}18`, color }}>
                  {planData.type || 'reading plan'}
                </span>
                <span className="text-[12px]" style={{ color:'#9CA3AF' }}>
                  {planData.days} days
                </span>
              </div>
            </div>
          </div>

          {planData.desc && (
            <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>
              {planData.desc}
            </p>
          )}

          {/* Day preview */}
          {preview.length > 0 && (
            <div className="flex flex-col gap-0">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color:'#9CA3AF' }}>First {preview.length} days</p>
              {preview.map((d, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0"
                  style={{ borderColor:'#F5F5F5' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: color }}>{d.day}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>{d.passage}</p>
                    <p className="text-[12px] mt-0.5" style={{ color:'#6B7280' }}>{d.title}</p>
                    {d.focus && (
                      <p className="text-[11px] mt-0.5 italic" style={{ color:'#9CA3AF' }}>{d.focus}</p>
                    )}
                  </div>
                </div>
              ))}
              {planData.days > preview.length && (
                <p className="text-[12px] text-center pt-2" style={{ color:'#9CA3AF' }}>
                  + {planData.days - preview.length} more days
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        <a href="/plans"
          className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold"
          style={{ background: color, boxShadow:`0 4px 20px ${color}55` }}>
          Start this plan in Daily Walk
        </a>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
          Free · No account required · Works offline
        </p>
      </div>
    </div>
  )
}