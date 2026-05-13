'use client'

import { BookOpen, Map } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = { book:'#5B4FCF', topic:'#4A7C5F', character:'#E8A838' }

export default function PlanPreviewClient({ slug, name, desc, days, type }) {
  const color = TYPE_COLORS[type] || '#5B4FCF'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background:'#FAF8F5', fontFamily:'system-ui' }}>

      <div className="flex items-center gap-3 mb-8">
        <AppIcon size={44} />
        <div>
          <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Daily Walk</p>
          <p className="text-[12px]" style={{ color:'#6B7280' }}>Your daily devotion, together</p>
        </div>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-[20px] overflow-hidden"
        style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>
        <div className="h-2 w-full" style={{ background: color }} />
        <div className="p-6 flex flex-col gap-3 items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background:`${color}20` }}>
            <Map size={30} style={{ color }} />
          </div>
          <p className="font-bold text-[22px]" style={{ color:'#1A1A2E', fontFamily:'Lora, serif' }}>{name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full"
              style={{ background:`${color}20`, color }}>{type}</span>
            <span className="text-[12px] font-semibold" style={{ color:'#6B7280' }}>{days} days</span>
          </div>
          {desc && <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>{desc}</p>}
        </div>
      </div>

      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        <a href="https://dailywalk.app/plans"
          className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold"
          style={{ background: color }}>
          Start this plan on Daily Walk
        </a>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>Free · No account required</p>
      </div>
    </div>
  )
}