import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const author  = searchParams.get('author')  || 'Someone'
  const content = searchParams.get('content') || ''
  const type    = searchParams.get('type')    || 'general'
  const community = searchParams.get('community') || ''

  const typeColors = { reading:'#5B4FCF', prayer:'#4A7C5F', encouragement:'#E8A838', general:'#888780' }
  const accent = typeColors[type] || '#5B4FCF'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FAF8F5"/>
        <stop offset="100%" stop-color="#EDE9FF"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="80" y="80" width="1040" height="470" rx="32" fill="white" opacity="0.97"
          style="filter:drop-shadow(0 8px 32px rgba(0,0,0,0.1))"/>
    <rect x="80" y="80" width="1040" height="8" rx="4" fill="${accent}"/>

    <!-- Avatar circle -->
    <circle cx="180" cy="220" r="55" fill="${accent}" opacity="0.15"/>
    <text x="180" y="238" font-size="48" text-anchor="middle" font-family="system-ui">
      ${author.slice(0,1).toUpperCase()}
    </text>

    <!-- Author + type -->
    <text x="270" y="204" font-family="system-ui, sans-serif" font-weight="700"
          font-size="36" fill="#1A1A2E">${escXml(author)}</text>
    <rect x="270" y="218" width="${Math.min(type.length * 18 + 24, 200)}" height="34" rx="17" fill="${accent}" opacity="0.15"/>
    <text x="282" y="241" font-family="system-ui, sans-serif" font-weight="600"
          font-size="20" fill="${accent}">${type}</text>

    ${community ? `<text x="270" y="270" font-family="system-ui" font-size="22" fill="#9CA3AF">in ${escXml(community)}</text>` : ''}

    <!-- Content preview -->
    ${content ? `<text x="120" y="340" font-family="Georgia, serif" font-style="italic"
          font-size="34" fill="#1A1A2E">"${escXml(content.slice(0, 60))}${content.length > 60 ? '…' : ''}"</text>` : ''}

    <!-- Brand -->
    <text x="120" y="510" font-family="system-ui" font-weight="700" font-size="28" fill="#5B4FCF">Daily Walk</text>
    <text x="120" y="545" font-family="system-ui" font-size="22" fill="#9CA3AF">Your daily devotion, together</text>
    <text x="1060" y="540" font-size="72" text-anchor="middle">🙏</text>
  </svg>`

  return new NextResponse(svg, {
    headers: { 'Content-Type':'image/svg+xml', 'Cache-Control':'public, max-age=86400' },
  })
}
function escXml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}