// ── middleware.js ──
// Only refreshes Supabase session if one exists.
// Never redirects unauthenticated users — app is fully usable without auth.

import { NextResponse } from 'next/server'

export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase not configured: pass through immediately
  if (!url || !key || url === 'your_supabase_project_url') {
    return NextResponse.next()
  }

  try {
    const { createMiddlewareClient } = await import('@supabase/auth-helpers-nextjs')
    const response = NextResponse.next()
    const sb       = createMiddlewareClient({ req: request, res: response })
    // Refresh session silently — never block the request
    await sb.auth.getSession()
    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)'],
}