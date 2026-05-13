'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const CAT_COLORS = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}

export default function CommunityPreviewClient({ slug, name, desc, members, category, inviteCode }) {
  const color = CAT_COLORS[category] || '#5B4FCF'

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

      {/* Community card */}
      <div className="w-full max-w-[420px] bg-white rounded-[20px] overflow-hidden"
        style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>
        <div className="h-2 w-full" style={{ background: color }} />

        <div className="p-6 flex flex-col gap-4 items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-[32px]"
            style={{ background: color }}>
            {name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[22px]" style={{ color:'#1A1A2E', fontFamily:'Lora, serif' }}>{name}</p>
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full inline-block mt-1"
              style={{ background:`${color}20`, color }}>{category}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color:'#6B7280' }}>
            <Users size={14} /><span className="text-[14px]">{members} members</span>
          </div>
          {desc && <p className="text-[14px] leading-relaxed" style={{ color:'#6B7280' }}>{desc}</p>}
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        <a href={inviteCode ? `https://dailywalk.app/join/${inviteCode}` : 'https://dailywalk.app'}
          className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold"
          style={{ background: color }}>
          Join {name}
        </a>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
          No account needed to join or read.
        </p>
      </div>
    </div>
  )
}