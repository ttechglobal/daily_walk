'use client'

import Link from 'next/link'
import { Heart, MessageCircle, Globe, Users } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = {
  general:'#888780', reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838'
}

function initials(name) {
  return (name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}
function avatarBg(name) {
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#C77DFF','#7CB9E8']
  return colors[(name||'A').charCodeAt(0) % colors.length]
}

export default function PostLandingClient({ slug, sp }) {
  const author    = sp.author    || 'Someone'
  const content   = sp.content   || ''
  const passage   = sp.passage   || ''
  const type      = sp.type      || 'general'
  const community = sp.community || ''
  const typeColor = TYPE_COLORS[type] || '#888780'

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

      {/* Post card */}
      <div className="w-full max-w-[420px] bg-white rounded-[24px] overflow-hidden"
        style={{ boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>

        {/* Community source tag */}
        {community && (
          <div className="flex items-center gap-2 px-5 pt-4 pb-2"
            style={{ borderBottom:'1px solid #F5F5F5' }}>
            <Users size={12} style={{ color:'#5B4FCF' }} />
            <span className="text-[12px] font-bold" style={{ color:'#5B4FCF' }}>{community}</span>
          </div>
        )}
        {!community && (
          <div className="flex items-center gap-2 px-5 pt-4 pb-2"
            style={{ borderBottom:'1px solid #F5F5F5' }}>
            <Globe size={12} style={{ color:'#5B4FCF' }} />
            <span className="text-[12px] font-bold" style={{ color:'#5B4FCF' }}>Daily Walk Community</span>
          </div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[15px]"
              style={{ background: avatarBg(author) }}>
              {initials(author)}
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{author}</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${typeColor}18`, color:typeColor }}>{type}</span>
            </div>
          </div>

          {/* Passage */}
          {passage && (
            <p className="text-[13px] font-bold" style={{ color:'#5B4FCF' }}>{passage}</p>
          )}

          {/* Content */}
          <p className="text-[16px] leading-[1.8]"
            style={{ color:'#1A1A2E', fontFamily:'Lora, Georgia, serif', fontStyle:'italic' }}>
            {content ? `"${content}"` : 'This post is waiting for you in the app.'}
          </p>

          {/* Engagement hint */}
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5" style={{ color:'#C4C1BC' }}>
              <Heart size={15} /><span className="text-[13px]">Like</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color:'#C4C1BC' }}>
              <MessageCircle size={15} /><span className="text-[13px]">Comment</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        <a href="/"
          className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold hover:opacity-90 transition-opacity"
          style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.35)' }}>
          Join Daily Walk
        </a>
        <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
          Free · No account required · Read the Bible daily
        </p>
      </div>
    </div>
  )
}