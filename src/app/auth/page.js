'use client'

// ── src/app/auth/page.js — v5 (spinner-fix) ──
//
// ROOT CAUSE OF INFINITE SPINNER:
//   1. signInWithPassword() has no timeout — if Supabase is unreachable or
//      misconfigured the promise never settles and finally{} never runs.
//   2. The Supabase client singleton can return a non-null object even when
//      env vars are wrong, so the !sb guard doesn't catch it.
//
// FIXES:
//   1. All Supabase calls wrapped in withTimeout(promise, 10_000).
//      If no response in 10s → error shown, spinner released.
//   2. isSupabaseConfigured() checked explicitly before any call.
//      Clear "Supabase not configured" toast if env vars are missing.
//   3. Every code path that could leave loading=true now has a guaranteed
//      setLoading(false) via try/catch/finally with timeout fallback.
//   4. Detailed error messages for every known Supabase error code.

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams }       from 'next/navigation'
import { motion, AnimatePresence }          from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Loader2, Flame, Check, Mail } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../../lib/supabase/client'
import { useTheme }       from '../../lib/theme'
import { ToastContainer, showToast } from '../../components/Toast'

// ─────────────────────────────────────────────
//  Timeout wrapper
//  Rejects (not resolves) on timeout so catch() handles it
// ─────────────────────────────────────────────
function withTimeout(promise, ms = 10000) {
  let timer
  const timeout = new Promise((_, reject) =>
    (timer = setTimeout(() => reject(new Error('Request timed out — check your connection')), ms))
  )
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// ─────────────────────────────────────────────
//  Friendly error messages for Supabase error codes / messages
// ─────────────────────────────────────────────
function friendlyAuthError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password'))
    return { field: 'password', text: 'Incorrect email or password' }
  if (m.includes('email not confirmed'))
    return { field: 'email', text: 'Please confirm your email — check your inbox' }
  if (m.includes('user not found'))
    return { field: 'email', text: 'No account found with this email' }
  if (m.includes('too many requests') || m.includes('rate limit'))
    return { field: null, text: 'Too many attempts — wait a few minutes and try again' }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return { field: null, text: 'Network error — check your connection and try again' }
  if (m.includes('timed out'))
    return { field: null, text: 'Request timed out — check your connection' }
  return { field: null, text: msg || 'Sign in failed — please try again' }
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
//  Google Button (coming soon)
// ─────────────────────────────────────────────
function GoogleButton() {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button"
        className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-bold text-[15px] border-2"
        style={{
          background: 'white', color: '#1A1A2E', borderColor: '#E5E7EB',
          opacity: 0.4, pointerEvents: 'none', cursor: 'default',
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
          style={{ background: 'rgba(0,0,0,0.12)', color: '#6B7280' }}>
          Coming soon
        </span>
      </div>
    </div>
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
    // Validate
    const errs = {}
    if (!emailRe.test(email)) errs.email    = 'Enter a valid email'
    if (!password)            errs.password = 'Enter your password'
    if (Object.keys(errs).length) { setErrors(errs); return }

    // Guard: env vars
    if (!isSupabaseConfigured()) {
      showToast('⚠️ App not connected to database — contact support')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const sb = createClient()

      // ── Sign in with 10s timeout ──
      const { data, error } = await withTimeout(
        sb.auth.signInWithPassword({ email: email.trim(), password }),
        10000
      )

      if (error) throw error
      if (!data?.user) throw new Error('Sign in failed — no user returned')

      const user = data.user

      // ── Fetch profile with 8s timeout ──
      // Non-fatal: if this fails, we still let the user in
      let profile = null
      try {
        const { data: p } = await withTimeout(
          sb.from('profiles')
            .select('onboarding_complete, username, full_name, companion_id, walk_stage')
            .eq('id', user.id)
            .maybeSingle(),
          8000
        )
        profile = p
      } catch (profileErr) {
        console.warn('[auth/signin] profile fetch failed (non-fatal):', profileErr.message)
      }

      // ── Write to localStorage ──
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
      const { field, text } = friendlyAuthError(e.message)
      if (field) {
        setErrors({ [field]: text })
      } else {
        showToast(text)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!emailRe.test(email)) { setErrors({ email: 'Enter your email first' }); return }
    if (!isSupabaseConfigured()) { showToast('App not configured'); return }
    try {
      const sb = createClient()
      await withTimeout(
        sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/reset`,
        }),
        8000
      )
      setResetSent(true)
      showToast('Reset link sent — check your email')
    } catch (e) {
      showToast('Could not send reset email — check your connection')
    }
  }

  return (
    <motion.div key="signin"
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4">

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input
          type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: undefined })) }}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{
            background:   t.bgInput,
            color:        t.text,
            borderColor:  errors.email ? '#EF4444' : t.borderInput,
          }}
        />
        {errors.email && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })) }}
            placeholder="Your password"
            autoComplete="current-password"
            className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none"
            style={{
              background:  t.bgInput,
              color:       t.text,
              borderColor: errors.password ? '#EF4444' : t.borderInput,
            }}
          />
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

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-60 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
          : 'Sign in →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Don't have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>Create one</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Sign Up
// ─────────────────────────────────────────────
function SignUp({ onToggle, onSuccess, t }) {
  const [username,       setUsername]       = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // null|'checking'|'ok'|'taken'|'invalid'
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
    if (!isSupabaseConfigured()) { setUsernameStatus('ok'); return }
    try {
      const sb = createClient()
      const { data } = await withTimeout(
        sb.from('profiles').select('id').eq('username', val).maybeSingle(),
        5000
      )
      setUsernameStatus(data ? 'taken' : 'ok')
    } catch {
      setUsernameStatus('ok') // network error — don't block sign-up over a username check
    }
  }, [])

  async function submit() {
    const errs = {}
    if (!username || usernameStatus !== 'ok') errs.username = 'Choose a valid, available username'
    if (!emailRe.test(email))                 errs.email    = 'Enter a valid email'
    if (!password || password.length < 6)     errs.password = 'Password must be at least 6 characters'
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (!isSupabaseConfigured()) {
      showToast('⚠️ App not connected to database — contact support')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const sb = createClient()

      // ── Step 1: Create auth user ──
      const { data, error } = await withTimeout(
        sb.auth.signUp({ email: email.trim(), password }),
        10000
      )
      if (error) throw error
      if (!data?.user) throw new Error('Sign up failed — please try again')

      const user    = data.user
      const session = data.session

      // ── Step 2: Write profile row ──
      try {
        await withTimeout(
          sb.from('profiles').upsert({
            id:         user.id,
            username:   username,
            full_name:  username,
            email:      user.email,
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' }),
          8000
        )
      } catch (profileErr) {
        console.warn('[auth/signup] profile upsert failed:', profileErr.message)
      }

      // ── Step 3: Write to localStorage ──
      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id:          user.id,
          username:    username,
          name:        username,
          email:       user.email,
          companionId: 'david',
          joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
      } catch {}

      // ── Step 4: Email confirmation or direct session ──
      if (!session) {
        setAwaitEmail(true)
        return // loading cleared in finally
      }

      onSuccess(user, true, username)

    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({ email: 'An account with this email already exists — try signing in' })
      } else {
        const { field, text } = friendlyAuthError(msg)
        if (field) setErrors({ [field]: text })
        else showToast(text)
      }
    } finally {
      setLoading(false)
    }
  }

  const pw = passwordStrength(password)

  const unameHint = {
    null:      { color: t.textFaint, text: '3–20 chars, letters, numbers and _' },
    checking:  { color: '#E8A838',   text: 'Checking…'                          },
    ok:        { color: '#4A7C5F',   text: '✓ Available!'                       },
    taken:     { color: '#EF4444',   text: 'Username taken — try another'       },
    invalid:   { color: '#EF4444',   text: '3–20 chars, lowercase letters, numbers and _' },
  }[usernameStatus]

  if (awaitEmail) {
    return (
      <motion.div key="await-email"
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#E8F4ED' }}>
          <Mail size={28} style={{ color: '#4A7C5F' }} />
        </div>
        <div>
          <p className="font-bold text-[20px] mb-2" style={{ color: t.text }}>Check your inbox</p>
          <p className="text-[14px] leading-relaxed" style={{ color: t.textMuted }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] w-full"
          style={{ background: '#E8F4ED' }}>
          <Check size={16} style={{ color: '#4A7C5F' }} />
          <p className="text-[13px] font-semibold" style={{ color: '#4A7C5F' }}>
            After confirming, come back and sign in
          </p>
        </div>
        <button onClick={onToggle} className="font-bold text-[14px] underline" style={{ color: '#5B4FCF' }}>
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
        <input
          type="text" value={username}
          onChange={e => {
            const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
            setUsername(v)
            setErrors(er => ({ ...er, username: undefined }))
            checkUsername(v)
          }}
          placeholder="your_username"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{
            background:  t.bgInput,
            color:       t.text,
            borderColor: errors.username ? '#EF4444' : t.borderInput,
          }}
        />
        {unameHint && (
          <p className="text-[12px]" style={{ color: unameHint.color }}>{unameHint.text}</p>
        )}
        {errors.username && (
          <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.username}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input
          type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })) }}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{
            background:  t.bgInput,
            color:       t.text,
            borderColor: errors.email ? '#EF4444' : t.borderInput,
          }}
        />
        {errors.email && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.email}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })) }}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none"
            style={{
              background:  t.bgInput,
              color:       t.text,
              borderColor: errors.password ? '#EF4444' : t.borderInput,
            }}
          />
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
                  style={{ background: i <= pw.score ? pw.color : t.bgMuted }} />
              ))}
            </div>
            {pw.label && <span className="text-[11px] font-bold" style={{ color: pw.color }}>{pw.label}</span>}
          </div>
        )}
        {errors.password && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.password}</p>}
      </div>

      <button
        onClick={submit}
        disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Creating account…</>
          : 'Create account →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Already have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>Sign in</button>
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

  function handleSuccess(user, isNew, username) {
    if (isNew) {
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

      {/* Form */}
      <div className="flex-1 px-6 pb-10">
        <div className="flex flex-col gap-5">
          <GoogleButton />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: t.border }} />
            <span className="text-[12px] font-semibold" style={{ color: t.textFaint }}>or</span>
            <div className="flex-1 h-px" style={{ background: t.border }} />
          </div>

          <AnimatePresence mode="wait">
            {mode === 'signin'
              ? <SignIn key="si" onToggle={() => setMode('signup')} onSuccess={handleSuccess} t={t} />
              : <SignUp key="su" onToggle={() => setMode('signin')} onSuccess={handleSuccess} t={t} />
            }
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  )
}