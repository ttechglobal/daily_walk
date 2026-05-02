'use client'

// ── /offline — Part 6 ──
// Shown by the service worker when user is offline and page isn't cached.
// Registered as the fallback URL in next-pwa config.

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex flex-col min-h-screen bg-warm-bg items-center justify-center px-8 text-center gap-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-purple-light flex items-center justify-center">
        <WifiOff size={36} className="text-purple" style={{ color: '#5B4FCF' }} />
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-bold text-text-primary leading-snug"
          style={{ fontFamily: 'Lora, serif' }}>
          You're offline
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed max-w-[280px]">
          Daily Walk works offline for pages you've already visited.
          Connect to the internet to load new content.
        </p>
      </div>

      {/* Try again */}
      <button
        onClick={() => window.location.reload()}
        className="bg-purple text-white rounded-pill px-8 py-4 text-[15px] font-bold transition-all active:scale-[0.97] hover:opacity-90"
        style={{ background: '#5B4FCF' }}
      >
        Try again
      </button>

      {/* Reassurance */}
      <p className="text-text-muted text-[13px] leading-relaxed max-w-[280px]">
        Your check-ins and nuggets are always saved locally — nothing is lost.
      </p>
    </div>
  )
}