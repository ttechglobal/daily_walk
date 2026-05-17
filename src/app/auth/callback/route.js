// ── src/app/auth/callback/route.js ──
// Handles the OAuth redirect from Google.
// Exchanges code for session, checks if user is new, routes accordingly.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code       = requestUrl.searchParams.get('code')
  const next       = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: true } }
    )

    try {
      const { data } = await sb.auth.exchangeCodeForSession(code)
      const user     = data?.session?.user

      if (user) {
        // Check if profile is onboarded
        const { data: profile } = await sb.from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }
    } catch {
      // Fall through — redirect to next anyway
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}