'use client'

// ── src/app/auth/page.js ──
//
// BUG FIXED — wrong username shown after sign-up:
//
// TRACE OF THE BUG:
//  1. User types "sarah_k" in the sign-up form
//  2. auth/page.js SignUp.submit() calls sb.auth.signUp()
//  3. Upsert writes: { id, username: "sarah_k", created_at }
//     — BUT does NOT write full_name
//  4. localStorage is written: { username: "sarah_k", name: undefined (email only) }
//     — dw_user.name was missing
//  5. onSuccess(user, true) → routes to /onboarding
//  6. onboarding/page.js starts, pre-fills username from user_metadata.full_name
//     which for email sign-ups is "" (empty string)
//  7. User advances through steps without touching the username field
//  8. finish() calls update({ username: "" }) — OVERWRITES "sarah_k" with ""
//  9. syncSupabaseToLocal runs: name = profile.full_name || profile.display_name
//     || existing.name || 'Friend' → all null/empty → "Friend"
//
// FIXES IN THIS FILE:
//  1. The upsert now writes BOTH username AND full_name (= username for new accounts)
//  2. localStorage dw_user.name is explicitly set to username (not user_metadata)
//  3. The onboarding step 0 username field is pre-filled from the JUST-SUBMITTED
//     username via router state — so if onboarding does re-collect it, it's
//     the right value. (But the real fix is in onboarding/page.js — see that file.)

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Loader2, Flame, Check, Mail } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'
import { ToastContainer, showToast } from '../../components/Toast'

// ─────────────────────────────────────────────
//  Google button — coming soon
// ─────────────────────────────────────────────
function GoogleButton() {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button"
        className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-bold text-[15px] border-2"
        style={{
          background: 'white', color: '#1A1A2E', borderColor: '#E5E7EB',
          opacity: 0.4, filter: 'blur(0.5px)',
          pointerEvents: 'none', cursor: 'default',
        }}>
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <div className="absolute inset-0 flex items-end justify-center pb-1.5" style={{ pointerEvents: 'none' }}>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.12)', color: '#6B7280', letterSpacing: '0.05em' }}>
          Coming soon
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Password strength
// ─────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)          s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return [
    { label: '',       color: ''        },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#E8A838' },
    { label: 'Good',   color: '#7CB9E8' },
    { label: 'Strong', color: '#4A7C5F' },
  ][s]
}

// ─────────────────────────────────────────────
//  Sign Up
// ─────────────────────────────────────────────
function SignUp({ onToggle, onSuccess, t }) {
  const [username,       setUsername]       = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPw,         setShowPw]         = useState(false)
  const [errors,         setErrors]         = useState({})
  const [loading,        setLoading]        = useState(false)
  const [awaitEmail,     setAwaitEmail]     = useState(false)

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const checkUsername = useCallback(async (val) => {
    if (!val || val.length < 3)          { setUsernameStatus('invalid'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    const sb = createClient()
    if (!sb) { setUsernameStatus('ok'); return }
    const { data } = await sb.from('profiles').select('id').eq('username', val).maybeSingle()
    setUsernameStatus(data ? 'taken' : 'ok')
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(username), 480)
    return () => clearTimeout(timer)
  }, [username, checkUsername])

  function handleUsernameInput(v) {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    setUsername(cleaned)
    setUsernameStatus(null)
    setErrors(e => { const n = { ...e }; delete n.username; return n })
  }

  async function submit() {
    const errs = {}
    if (usernameStatus !== 'ok')              errs.username = usernameStatus === 'taken' ? 'Already taken' : '3–20 chars, letters/numbers/_'
    if (!emailRe.test(email))                 errs.email    = 'Enter a valid email'
    if (passwordStrength(password).score < 2) errs.password = 'Password too weak — add numbers or symbols'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const sb = createClient()
    if (!sb) { showToast('Supabase not configured'); setLoading(false); return }

    try {
      // ── Step 1: Create auth user ──
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) throw error

      const user    = data.user
      const session = data.session

      if (!user) throw new Error('Account creation failed — please try again.')

      // ── Step 2: Write profile row ──
      // CRITICAL: Write BOTH username AND full_name.
      // full_name = username for new email sign-ups (no Google name available).
      // This ensures sync.js's `profile.full_name || profile.username` chain
      // always resolves to the correct username and never falls back to 'Friend'.
      const { error: profileError } = await sb.from('profiles').upsert({
        id:         user.id,
        username:   username,
        full_name:  username,   // ← FIX: set full_name so sync.js resolves correctly
        email:      user.email,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (profileError) {
        // Log but don't abort — user IS created, username is in localStorage
        console.error('[auth/signup] profile upsert failed:', profileError.message, profileError.code)
        // If it's an RLS error, surface it clearly
        if (profileError.code === '42501') {
          console.error('[auth/signup] RLS POLICY ERROR — ensure profiles INSERT policy allows: auth.uid() = id')
        }
      }

      // ── Step 3: Write to localStorage ──
      // Use the SUBMITTED username as name — never user_metadata which may be empty
      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id:          user.id,
          username:    username,
          name:        username,   // ← FIX: name = username, not user_metadata
          email:       user.email,
          companionId: 'david',
          joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
      } catch {}

      if (!session) {
        setAwaitEmail(true)
        setLoading(false)
        return
      }

      // Session live → route to onboarding, passing username so it isn't lost
      onSuccess(user, true, username)
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({ email: 'An account with this email already exists — try signing in' })
      } else {
        showToast(msg || 'Sign-up failed — please try again')
      }
    } finally {
      if (!awaitEmail) setLoading(false)
    }
  }

  const pw = passwordStrength(password)

  const unameHint = {
    null:      { color: t.textFaint, text: '3–20 chars, letters, numbers and _' },
    checking:  { color: '#E8A838',   text: 'Checking…'                          },
    ok:        { color: '#4A7C5F',   text: '✓ Available!'                       },
    taken:     { color: '#EF4444',   text: '✗ Already taken — try another'      },
    invalid:   { color: '#EF4444',   text: '3–20 chars, letters, numbers and _' },
  }[usernameStatus]

  if (awaitEmail) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: t.purpleBg || '#EDE9FF' }}>
          <Mail size={28} style={{ color: '#5B4FCF' }} />
        </div>
        <div>
          <p className="font-display font-bold text-[20px]" style={{ color: t.text }}>
            Check your email
          </p>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account, then come back and sign in.
          </p>
        </div>
        <button onClick={() => setAwaitEmail(false)}
          className="text-[13px] font-semibold underline"
          style={{ color: '#5B4FCF' }}>
          Back to sign in
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div key="signup"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4">

      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Username</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[15px]"
            style={{ color: t.textFaint }}>@</span>
          <input
            value={username}
            onChange={e => handleUsernameInput(e.target.value)}
            placeholder="yourname"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="w-full pl-8 pr-10 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
            style={{
              background:  t.bgInput, color: t.text,
              borderColor: usernameStatus === 'ok' ? '#4A7C5F'
                : (usernameStatus === 'taken' || usernameStatus === 'invalid' || errors.username) ? '#EF4444'
                : t.borderInput,
            }} />
          {usernameStatus === 'checking' && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
              style={{ color: '#E8A838' }} />
          )}
          {usernameStatus === 'ok' && (
            <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#4A7C5F' }} />
          )}
        </div>
        {unameHint && <p className="text-[12px]" style={{ color: unameHint.color }}>{unameHint.text}</p>}
        {errors.username && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.username}</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErrors(er => { const n = { ...er }; delete n.email; return n }) }}
          placeholder="you@example.com" autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{ background: t.bgInput, color: t.text, borderColor: errors.email ? '#EF4444' : t.borderInput }} />
        {errors.email && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.email}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(er => { const n = { ...er }; delete n.password; return n }) }}
            placeholder="Min. 8 characters" autoComplete="new-password"
            className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none"
            style={{ background: t.bgInput, color: t.text, borderColor: errors.password ? '#EF4444' : t.borderInput }} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
            style={{ color: t.textMuted }}>
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {password && (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex gap-1 flex-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: i <= pw.score ? pw.color : t.bgMuted || '#F0EDE8' }} />
              ))}
            </div>
            {pw.label && <span className="text-[11px] font-bold" style={{ color: pw.color }}>{pw.label}</span>}
          </div>
        )}
        {errors.password && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.password}</p>}
      </div>

      <button onClick={submit} disabled={loading || usernameStatus !== 'ok'}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : 'Create account →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Already have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>Sign in</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Sign In
// ─────────────────────────────────────────────
function SignIn({ onToggle, onSuccess, t }) {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [loading,   setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function submit() {
    const errs = {}
    if (!emailRe.test(email)) errs.email    = 'Enter a valid email'
    if (!password)            errs.password = 'Enter your password'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const sb = createClient()
    if (!sb) { showToast('Supabase not configured'); setLoading(false); return }

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error

      const user = data.user

      const { data: profile, error: profileError } = await sb.from('profiles')
        .select('onboarding_complete, username, full_name, companion_id, walk_stage')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('[auth/signin] profile fetch error:', profileError.message)
      }

      // Write to localStorage using the DB username as name — no fallback to 'Friend'
      try {
        const displayName = profile?.full_name || profile?.username || ''
        localStorage.setItem('dw_user', JSON.stringify({
          id:          user.id,
          username:    profile?.username     || '',
          name:        displayName,
          email:       user.email,
          companionId: profile?.companion_id || 'david',
          walkStage:   profile?.walk_stage   || '',
          joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
        if (profile?.onboarding_complete) {
          localStorage.setItem('dw_onboarding_complete', 'true')
        }
      } catch {}

      const isNew = !profile?.onboarding_complete
      onSuccess(user, isNew, profile?.username || '')
    } catch (e) {
      const msg = e.message || ''
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setErrors({ password: 'Incorrect email or password' })
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setErrors({ email: 'Please confirm your email first — check your inbox' })
      } else {
        showToast(msg || 'Sign in failed')
      }
    } finally { setLoading(false) }
  }

  async function handleReset() {
    if (!emailRe.test(email)) { setErrors({ email: 'Enter your email first' }); return }
    const sb = createClient()
    await sb?.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setResetSent(true)
    showToast('Reset link sent — check your email')
  }

  return (
    <motion.div key="signin"
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4">

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErrors({}) }}
          placeholder="you@example.com" autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{ background: t.bgInput, color: t.text, borderColor: errors.email ? '#EF4444' : t.borderInput }} />
        {errors.email && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setErrors({}) }}
            placeholder="Your password" autoComplete="current-password"
            className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none"
            style={{ background: t.bgInput, color: t.text, borderColor: errors.password ? '#EF4444' : t.borderInput }} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
            style={{ color: t.textMuted }}>
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.password}</p>}
        {resetSent
          ? <p className="text-[12px] font-semibold mt-1" style={{ color: '#4A7C5F' }}>✓ Reset link sent</p>
          : <button onClick={handleReset} className="text-left text-[12px] font-semibold underline mt-0.5"
              style={{ color: '#5B4FCF' }}>Forgot password?</button>
        }
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign in →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Don't have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>Create one</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main auth page
// ─────────────────────────────────────────────
function AuthPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t }        = useTheme()

  const next     = searchParams.get('next') || '/'
  const initMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState(initMode)

  // onSuccess now receives (user, isNew, username) — username passed through
  // so onboarding can use it without re-fetching or re-asking
  function handleSuccess(user, isNew, username) {
    if (isNew) {
      // Encode username in URL so onboarding can read it without a DB call
      router.push(`/onboarding?username=${encodeURIComponent(username || '')}`)
    } else {
      router.push(next)
    }
  }

  const REASON_COPY = {
    post:    'Sign in to share what God is teaching you.',
    join:    'Sign in to join this community.',
    comment: 'Sign in to join the conversation.',
    like:    'Sign in to like posts.',
    plan:    'Sign in to save your reading plans.',
    default: '',
  }
  const reason     = searchParams.get('reason') || ''
  const reasonCopy = REASON_COPY[reason] || ''

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Back */}
      <div className="px-4 pt-6 flex-shrink-0">
        <button onClick={() => router.push(next)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgCard, boxShadow: t.shadow }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
      </div>

      {/* Logo + heading */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6 flex-shrink-0">
        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Flame size={32} className="text-white" />
        </div>
        <h1 className="font-display text-[26px] font-bold text-center" style={{ color: t.text }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        {reasonCopy && (
          <p className="text-[14px] text-center mt-2" style={{ color: t.textMuted }}>{reasonCopy}</p>
        )}
      </div>

      {/* Form card */}
      <div className="flex-1 px-5 overflow-y-auto" style={{ paddingBottom: 40 }}>
        <div className="rounded-[24px] p-5 flex flex-col gap-4"
          style={{ background: t.bgCard, boxShadow: t.shadowMd }}>

          <GoogleButton />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: t.border }} />
            <span className="text-[12px] font-semibold" style={{ color: t.textFaint }}>or</span>
            <div className="flex-1 h-px" style={{ background: t.border }} />
          </div>

          <AnimatePresence mode="wait">
            {mode === 'signup'
              ? <SignUp key="up" onToggle={() => setMode('signin')} onSuccess={handleSuccess} t={t} />
              : <SignIn key="in" onToggle={() => setMode('signup')} onSuccess={handleSuccess} t={t} />
            }
          </AnimatePresence>
        </div>

        <div className="text-center py-6">
          <button onClick={() => router.push(next)}
            className="text-[13px] font-semibold underline underline-offset-2"
            style={{ color: t.textFaint }}>
            Continue without an account
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <AuthPageInner />
    </Suspense>
  )
}