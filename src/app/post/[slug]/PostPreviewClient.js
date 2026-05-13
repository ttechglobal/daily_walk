'use client'

// ── PostPreviewClient — the interactive part of /post/[slug] ──
// Shows rich post preview + "Open in Daily Walk" CTA.
// If user already has the app (PWA): clicking "Open" routes directly.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, BookOpen } from 'lucide-react'
import { AppIcon } from '../../../components/icons/AppIcon'

const TYPE_COLORS = {
  general:'#888780', reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838'
}

export default function PostPreviewClient({ slug, content, author, passage, type }) {
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    // Detect if running as installed PWA
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  const typeColor = TYPE_COLORS[type] || '#888780'
  const initials  = (author || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors    = ['#5B4FCF','#4A7C5F','#E8A838','#C77DFF','#7CB9E8']
  const avatarBg  = colors[author.charCodeAt(0) % colors.length]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background:'#FAF8F5', fontFamily:'system-ui, sans-serif' }}>

      {/* App brand header */}
      <div className="flex items-center gap-3 mb-8">
        <AppIcon size={44} />
        <div>
          <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Daily Walk</p>
          <p className="text-[12px]" style={{ color:'#6B7280' }}>Your daily devotion, together</p>
        </div>
      </div>

      {/* Post card */}
      <div className="w-full max-w-[420px] bg-white rounded-[20px] overflow-hidden"
        style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>

        {/* Type accent bar */}
        <div className="h-1 w-full" style={{ background:typeColor }} />

        <div className="p-5 flex flex-col gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
              style={{ background: avatarBg }}>
              {initials}
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{author}</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${typeColor}18`, color:typeColor }}>{type}</span>
            </div>
          </div>

          {/* Passage */}
          {passage && (
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color:'#5B4FCF' }} />
              <span className="text-[13px] font-bold" style={{ color:'#5B4FCF' }}>{passage}</span>
            </div>
          )}

          {/* Content */}
          {content ? (
            <p className="text-[16px] leading-[1.8]" style={{ color:'#1A1A2E', fontFamily:'Lora, serif', fontStyle:'italic' }}>
              "{content}"
            </p>
          ) : (
            <p className="text-[14px]" style={{ color:'#9CA3AF' }}>
              This post is waiting for you in the app.
            </p>
          )}

          {/* Engagement hint */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5" style={{ color:'#9CA3AF' }}>
              <Heart size={15} />
              <span className="text-[13px]">Like</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color:'#9CA3AF' }}>
              <MessageCircle size={15} />
              <span className="text-[13px]">Comment</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-[420px] mt-5 flex flex-col gap-3">
        {isPWA ? (
          <Link href="/communities"
            className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold"
            style={{ background:'#5B4FCF' }}>
            Open in Daily Walk
          </Link>
        ) : (
          <>
            <a href="https://dailywalk.app"
              className="block w-full text-center text-white rounded-full py-4 text-[15px] font-bold"
              style={{ background:'#5B4FCF' }}>
              Open in Daily Walk
            </a>
            <p className="text-[13px] text-center" style={{ color:'#9CA3AF' }}>
              No account needed. Start reading your Bible today.
            </p>
          </>
        )}
      </div>
    </div>
  )
}