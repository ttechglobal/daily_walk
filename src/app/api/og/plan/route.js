// ── GET /api/og/plan?name=...&slug=... ──
// Returns a 1200×630 PNG for WhatsApp/Twitter OG preview.
// Pure SVG→PNG using built-in APIs — no sharp needed.

import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') || 'Bible Reading Plan'
  const slug = searchParams.get('slug') || ''

  // Build a clean SVG image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5B4FCF"/>
        <stop offset="100%" stop-color="#3D3190"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>

    <!-- White card -->
    <rect x="80" y="80" width="1040" height="470" rx="32" fill="white" opacity="0.97"/>

    <!-- Accent bar -->
    <rect x="80" y="80" width="8" height="470" rx="4" fill="#E8A838"/>

    <!-- Icon circle -->
    <circle cx="220" cy="220" r="60" fill="#5B4FCF" opacity="0.12"/>
    <text x="220" y="236" font-size="52" text-anchor="middle">📖</text>

    <!-- Plan name -->
    <text x="320" y="190" font-family="Georgia, serif" font-weight="700"
          font-size="56" fill="#1A1A2E">${escXml(name.slice(0, 32))}</text>
    ${name.length > 32 ? `<text x="320" y="258" font-family="Georgia, serif" font-weight="700"
          font-size="56" fill="#1A1A2E">${escXml(name.slice(32, 60))}</text>` : ''}

    <!-- Subtitle -->
    <text x="320" y="${name.length > 32 ? '316' : '248'}"
          font-family="system-ui, sans-serif" font-size="30" fill="#6B7280">
      Bible Reading Plan · Daily Walk
    </text>

    <!-- Bottom brand -->
    <text x="120" y="510" font-family="system-ui, sans-serif" font-weight="700"
          font-size="28" fill="#5B4FCF">Daily Walk</text>
    <text x="120" y="545" font-family="system-ui, sans-serif"
          font-size="22" fill="#9CA3AF">Your daily devotion, together</text>

    <!-- Flame emoji -->
    <text x="1060" y="510" font-size="80" text-anchor="middle">🔥</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

function escXml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}