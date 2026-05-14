'use client'

import { useState } from 'react'
import { Map, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = { book:'#5B4FCF', topic:'#4A7C5F', character:'#E8A838' }

export default function PlanLandingClient({ slug, sp }) {
  const name  = sp.name  || 'Bible Reading Plan'
  const desc  = sp.desc  || ''
  const days  = sp.days  || '30'
  const type  = sp.type  || 'topic'
  const color = TYPE_COLORS[type] || '#5B4FCF'
  const [showAll, setShowAll] = useState(false)

  // Parse preview days from query param (JSON-encoded array of first 3 days)
  let previewDays = []
  try { previewDays = sp.preview ? JSON.parse(decodeURIComponent(sp.preview)) : [] } catch {}

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

        {/* Colour accent */}
        <div className="h-2 w-full" style={{ background: color }} />

        <div className="p-6 flex flex-col gap-4">
          {/* Plan identity */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${color}18` }}>
              <Map size={28} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[22px] leading-snug"
                style={{ color:'#1A1A2E', fontFamily:'Lora, Georgia, serif' }}>{name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background:`${color}18`, color }}>{type}</span>
                <span className="text-[12px]" style={{ color:'#9CA3AF' }}>{days} days</span>
              </div>
            </div>
          </div>

          {desc && (
            <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>{desc}</p>
          )}

          {/* Day preview */}
          {previewDays.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color:'#9CA3AF' }}>What you'll read</p>
              {previewDays.map((d, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0"
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
              {parseInt(days) > previewDays.length && (
                <p className="text-[12px] text-center pt-1" style={{ color:'#9CA3AF' }}>
                  + {parseInt(days) - previewDays.length} more days
                </p>
              )}
            </div>
          )}

          {/* No preview — generic */}
          {previewDays.length === 0 && (
            <div className="flex flex-col gap-2 py-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0"
                  style={{ borderColor:'#F5F5F5' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: color }}>{i}</div>
                  <div className="h-3 rounded-full flex-1 animate-pulse" style={{ background:'#F0EDE8' }} />
                </div>
              ))}
              <p className="text-[12px] text-center" style={{ color:'#9CA3AF' }}>
                Open the app to see the full plan
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        <a href="/plans"
          className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold hover:opacity-90 transition-opacity"
          style={{ background: color, boxShadow:`0 4px 20px ${color}50` }}>
          Start this plan in Daily Walk
        </a>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
          Free · No account required · Works offline
        </p>
      </div>
    </div>
  )
}