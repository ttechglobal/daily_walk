'use client'

// ── CommunityPreviewClient ──
// Shown for unauthenticated visitors (SSR preview).
// Join button navigates within the app — never to a dead external URL.

import { useRouter } from 'next/navigation'
import { Users, Globe, Lock } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const CAT_COLORS = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}
const CAT_GRADIENTS = {
  'Bible Study':'linear-gradient(135deg,#5B4FCF,#3D3190)',
  'Prayer':'linear-gradient(135deg,#4A7C5F,#2D5A40)',
  'Mental Health':'linear-gradient(135deg,#7CB9E8,#4A7C5F)',
  'Youth':'linear-gradient(135deg,#E8A838,#B07000)',
  'Worship':'linear-gradient(135deg,#C77DFF,#7C3AED)',
  'General':'linear-gradient(135deg,#888780,#4A4A4A)',
}

export default function CommunityPreviewClient({ slug, name, desc, members, category }) {
  const router   = useRouter()
  const color    = CAT_COLORS[category]    || '#5B4FCF'
  const gradient = CAT_GRADIENTS[category] || CAT_GRADIENTS.General

  function handleJoin() {
    // Navigate to the full community page — CommunityBySlug handles the rest
    router.push(`/community/${slug}`)
  }

  return (
    <div className="min-h-screen" style={{ background:'#FAF8F5' }}>

      {/* Brand header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-white border-b" style={{ borderColor:'#F0EDE8' }}>
        <AppIcon size={36} />
        <div>
          <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>Daily Walk</p>
          <p className="text-[11px]" style={{ color:'#6B7280' }}>Your daily devotion, together</p>
        </div>
      </div>

      {/* Cover banner */}
      <div className="h-[160px] relative" style={{ background:gradient }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize:'28px 28px' }} />
      </div>

      {/* Community info */}
      <div className="bg-white px-5 pt-5 pb-5 relative" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="absolute -top-8 left-5 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-[28px] border-4 border-white"
          style={{ background:color }}>
          {(name||'C')[0].toUpperCase()}
        </div>
        <div className="mt-10">
          <h1 className="font-bold text-[24px]" style={{ color:'#1A1A2E' }}>{name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5" style={{ color:'#9CA3AF' }}>
              <Users size={13} />
              <span className="text-[13px] font-semibold">{members || 0} members</span>
            </div>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:`${color}18`, color }}>{category}</span>
          </div>
          {desc && <p className="text-[14px] leading-relaxed mt-2.5" style={{ color:'#6B7280' }}>{desc}</p>}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-6 flex flex-col gap-3">
        <button onClick={handleJoin}
          className="w-full text-white rounded-full py-4 text-[16px] font-bold active:scale-[0.97] transition-all"
          style={{ background:color, boxShadow:`0 4px 20px ${color}50` }}>
          Join {name}
        </button>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
          Free to join · Be part of the conversation
        </p>
      </div>
    </div>
  )
}