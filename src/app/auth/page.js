'use client'

// ── src/app/auth/page.js — v7 MINIMAL ──
// Stripped to absolute minimum — no withTimeout, no isSupabaseConfigured wrapper.
// Sign-up works → createClient() works → env vars are fine.
// This version removes every layer between the button and Supabase.

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams }       from 'next/navigation'
import { motion, AnimatePresence }          from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Loader2, Flame, Check, Mail } from 'lucide-react'
import { createClient }  from '../../lib/supabase/client'
import { useTheme }      from '../../lib/theme'
import { ToastContainer, showToast } from '../../components/Toast'

function sanitiseNext(raw) {
  if (!raw) return '/'
  const d = decodeURIComponent(raw)
  if (d.startsWith('/') && !d.startsWith('//') && !d.includes(':')) return d
  return '/'
}

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
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
//  Sign In — dead simple, no wrappers
// ─────────────────────────────────────────────
function SignIn({ onToggle, onSuccess, t }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resetSent,setResetSent]= useState(false)

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function submit() {
    setError('')
    if (!emailRe.test(email)) { setError('Enter a valid email'); return }
    if (!password)            { setError('Enter your password'); return }

    setLoading(true)
    try {
      const sb = createClient()
      if (!sb) { setError('App not configured — check env vars'); setLoading(false); return }

      console.log('[signin] calling signInWithPassword...')
      const { data, error: authError } = await sb.auth.signInWithPassword({
        email:    email.trim(),
        password,
      })
      console.log('[signin] result:', { user: data?.user?.id, error: authError?.message })

      if (authError) {
        const m = authError.message.toLowerCase()
        if (m.includes('invalid') || m.includes('credentials')) {
          setError('Incorrect email or password')
        } else if (m.includes('not confirmed')) {
          setError('Please confirm your email — check your inbox')
        } else {
          setError(authError.message)
        }
        return
      }

      const user = data.user
      if (!user) { setError('Sign in failed — please try again'); return }

      // Fetch profile — non-fatal
      let profile = null
      try {
        const { data: p } = await sb
          .from('profiles')
          .select('onboarding_complete, username, full_name, companion_id, walk_stage')
          .eq('id', user.id)
          .maybeSingle()
        profile = p
      } catch (e) {
        console.warn('[signin] profile fetch failed (non-fatal):', e.message)
      }

      // Write localStorage
      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id:          user.id,
          username:    profile?.username     || '',
          name:        profile?.full_name    || profile?.username || '',
          email:       user.email,
          companionId: profile?.companion_id || 'david',
          walkStage:   profile?.walk_stage   || '',
          joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
        if (profile?.onboarding_complete) {
          localStorage.setItem('dw_onboarding_complete', 'true')
        }
      } catch {}

      onSuccess(user, !profile?.onboarding_complete, profile?.username || '')

    } catch (e) {
      console.error('[signin] unexpected error:', e)
      setError(e.message || 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!emailRe.test(email)) { setError('Enter your email above first'); return }
    try {
      const sb = createClient()
      await sb?.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      setResetSent(true)
      showToast('Reset link sent — check your email')
    } catch {
      showToast('Could not send reset email')
    }
  }

  return (
    <motion.div key="signin"
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4">

      {error && (
        <div className="px-4 py-3 rounded-[12px] text-[13px] font-semibold"
          style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input type="email" value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="you@example.com" autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{ background: t.bgInput, color: t.text, borderColor: t.borderInput }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="Your password" autoComplete="current-password"
            className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none"
            style={{ background: t.bgInput, color: t.text, borderColor: t.borderInput }} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
            style={{ color: t.textMuted }}>
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {resetSent
          ? <p className="text-[12px] font-semibold mt-1" style={{ color: '#4A7C5F' }}>✓ Reset link sent</p>
          : <button onClick={handleReset} type="button"
              className="text-left text-[12px] font-semibold underline mt-0.5"
              style={{ color: '#5B4FCF' }}>Forgot password?</button>}
      </div>

      <button onClick={submit} disabled={loading} type="button"
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-60 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign in →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Don't have an account?{' '}
        <button type="button" onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>
          Create one
        </button>
      </p>
    </motion.div>
  )
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
    try {
      const sb = createClient()
      if (!sb) { setUsernameStatus('ok'); return }
      const { data } = await sb.from('profiles').select('id').eq('username', val).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'ok')
    } catch {
      setUsernameStatus('ok')
    }
  }, [])

  async function submit() {
    const errs = {}
    if (!username || usernameStatus !== 'ok') errs.username = 'Choose a valid, available username'
    if (!emailRe.test(email))                 errs.email    = 'Enter a valid email'
    if (!password || password.length < 6)     errs.password = 'At least 6 characters'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const sb = createClient()
      if (!sb) { showToast('App not configured'); setLoading(false); return }

      const { data, error } = await sb.auth.signUp({ email: email.trim(), password })
      if (error) throw error
      if (!data?.user) throw new Error('Sign up failed')

      const user    = data.user
      const session = data.session

      try {
        await sb.from('profiles').upsert({
          id: user.id, username, full_name: username, email: user.email,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } catch (e) { console.warn('[signup] profile upsert:', e.message) }

      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id: user.id, username, name: username, email: user.email,
          companionId: 'david',
          joinedAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
      } catch {}

      if (!session) { setAwaitEmail(true); return }
      onSuccess(user, true, username)
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({ email: 'Account already exists — try signing in' })
      } else {
        showToast(msg || 'Sign up failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const pw = passwordStrength(password)
  const unameHint = {
    null:     { color: '#9CA3AF', text: '3–20 chars, letters, numbers and _' },
    checking: { color: '#E8A838', text: 'Checking…' },
    ok:       { color: '#4A7C5F', text: '✓ Available!' },
    taken:    { color: '#EF4444', text: 'Username taken' },
    invalid:  { color: '#EF4444', text: '3–20 chars, lowercase letters, numbers and _' },
  }[usernameStatus]

  if (awaitEmail) {
    return (
      <motion.div key="await" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E8F4ED' }}>
          <Mail size={28} style={{ color: '#4A7C5F' }} />
        </div>
        <div>
          <p className="font-bold text-[20px] mb-2" style={{ color: t.text }}>Check your inbox</p>
          <p className="text-[14px] leading-relaxed" style={{ color: t.textMuted }}>
            Confirmation link sent to <strong>{email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] w-full" style={{ background: '#E8F4ED' }}>
          <Check size={16} style={{ color: '#4A7C5F' }} />
          <p className="text-[13px] font-semibold" style={{ color: '#4A7C5F' }}>After confirming, come back and sign in</p>
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

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Username</label>
        <input type="text" value={username}
          onChange={e => {
            const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
            setUsername(v)
            setErrors(er => ({ ...er, username: undefined }))
            checkUsername(v)
          }}
          placeholder="your_username" autoCapitalize="none" autoCorrect="off"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{ background: t.bgInput, color: t.text, borderColor: errors.username ? '#EF4444' : t.borderInput }} />
        {unameHint && <p className="text-[12px]" style={{ color: unameHint.color }}>{unameHint.text}</p>}
        {errors.username && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.username}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Email</label>
        <input type="email" value={email}
          onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })) }}
          placeholder="you@example.com" autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
          style={{ background: t.bgInput, color: t.text, borderColor: errors.email ? '#EF4444' : t.borderInput }} />
        {errors.email && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-[13px]" style={{ color: t.text }}>Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })) }}
            placeholder="At least 6 characters" autoComplete="new-password"
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
                  style={{ background: i <= pw.score ? pw.color : t.bgMuted }} />
              ))}
            </div>
            {pw.label && <span className="text-[11px] font-bold" style={{ color: pw.color }}>{pw.label}</span>}
          </div>
        )}
        {errors.password && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.password}</p>}
      </div>

      <button onClick={submit} type="button"
        disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
        {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : 'Create account →'}
      </button>

      <p className="text-center text-[13px]" style={{ color: t.textMuted }}>
        Already have an account?{' '}
        <button type="button" onClick={onToggle} className="font-bold underline" style={{ color: '#5B4FCF' }}>Sign in</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Page shell
// ─────────────────────────────────────────────
function AuthPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t }        = useTheme()

  const next     = sanitiseNext(searchParams.get('next'))
  const initMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const reason   = searchParams.get('reason') || ''
  const [mode, setMode] = useState(initMode)

  const REASON_COPY = {
    post:    'Sign in to share what God is teaching you.',
    join:    'Sign in to join this community.',
    comment: 'Sign in to join the conversation.',
    like:    'Sign in to like posts.',
    plan:    'Sign in to save your reading plans.',
  }

  function handleSuccess(user, isNew, username) {
    if (isNew) {
      router.push(`/onboarding?username=${encodeURIComponent(username || '')}`)
    } else {
      router.push(next)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      <div className="px-4 pt-6 flex-shrink-0">
        <button type="button" onClick={() => router.push(next)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgCard, boxShadow: t.shadow }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
      </div>

      <div className="flex flex-col items-center pt-6 pb-8 px-6 flex-shrink-0">
        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Flame size={32} className="text-white" />
        </div>
        <h1 className="font-display text-[26px] font-bold text-center" style={{ color: t.text }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        {reason && REASON_COPY[reason] && (
          <p className="text-[14px] text-center mt-2" style={{ color: t.textMuted }}>{REASON_COPY[reason]}</p>
        )}
      </div>

      <div className="flex-1 px-5 overflow-y-auto" style={{ paddingBottom: 40 }}>
        <div className="rounded-[24px] p-5 flex flex-col gap-4"
          style={{ background: t.bgCard, boxShadow: t.shadowMd }}>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: t.border }} />
            <span className="text-[12px] font-semibold" style={{ color: t.textFaint }}>Daily Walk</span>
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
          <button type="button" onClick={() => router.push(next)}
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