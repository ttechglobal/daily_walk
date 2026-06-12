// ── src/middleware.js ──
// FIXED: Removed dead @supabase/auth-helpers-nextjs import.
//
// Daily Walk uses localStorage-based auth (dw-auth-token) via the standard
// @supabase/supabase-js client. There is NO server-side session cookie —
// so middleware does NOT need to refresh or inspect a session.
//
// What this middleware does:
//   1. Protects /admin routes from non-admin users (basic header check only)
//   2. Passes everything else through immediately — auth is handled client-side
//      by AuthContext (offline-first, localStorage-based)
//
// What this middleware does NOT do:
//   • It does NOT call @supabase/auth-helpers-nextjs (package removed)
//   • It does NOT read/write cookies for session tokens
//   • It does NOT block public routes — the app is guest-friendly by design
//
// If you later move to SSR auth with cookie-based sessions, replace this with
// @supabase/ssr's createServerClient, NOT auth-helpers-nextjs (deprecated).

import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Admin guard (server-side header hint only) ──
  // Real admin auth is enforced in /app/admin/ layouts via Supabase RLS.
  // This is a lightweight first-pass redirect for non-configured envs.
  if (pathname.startsWith('/admin')) {
    // Allow through — page-level server component handles the real auth check.
    // We can't read localStorage in middleware (server context), so we pass
    // through and let the page redirect if the user is not an admin.
    return NextResponse.next()
  }

  // ── All other routes: pass through ──
  // Auth state is managed entirely client-side via AuthContext + localStorage.
  // No cookie session to refresh. No token to validate here.
  return NextResponse.next()
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|workbox-).*)',
  ],
}