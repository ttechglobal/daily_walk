'use client'

// ── src/app/auth/page.js ──
// Sign Up + Sign In in one file, toggled by ?mode=signin or ?mode=signup.
// Creates auth user + profiles row. Syncs localStorage on sign-in.
// Returns user to ?next= param after auth, or to home.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Flame, ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import { syncLocalToSupabase } from '../../lib/supabase/sync'
import { ToastContainer, showToast } from '../../components/Toast'

// ─────────────────────────────────────────────
//  Validation helpers
// ─────────────────────────────────────────────
const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernameRe = /^[a-z0-9_]{3,20}$/

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)          s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { label: '',        color: '' },
    { label: 'Weak',    color: '#EF4444' },
    { label: 'Fair',    color: '#E8A838' },
    { label: 'Good',    color: '#7CB9E8' },
    { label: 'Strong',  color: '#4A7C5F' },
  ]
  return { score: s, ...map[s] }
}

// ─────────────────────────────────────────────
//  Input field
// ─────────────────────────────────────────────
function Field({ label, type='text', value, onChange, error, hint, right, placeholder, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-bold text-[13px]" style={{color:'#1A1A2E'}}>{label}</label>
      <div className="relative">
        <input
          type={type} value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none transition-all bg-white"
          style={{
            borderColor: error ? '#EF4444' : '#E8E5E0',
            color: '#1A1A2E',
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none',
          }}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && <p className="text-[12px] font-medium" style={{color:'#EF4444'}}>{error}</p>}
      {hint && !error && <p className="text-[12px]" style={{color:'#9CA3AF'}}>{hint}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Password field with visibility toggle + strength bar
// ─────────────────────────────────────────────
function PasswordField({ label='Password', value, onChange, error, showStrength }) {
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? passwordStrength(value) : null

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-bold text-[13px]" style={{color:'#1A1A2E'}}>{label}</label>
      <div className="relative">
        <input
          type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)}
          placeholder="Choose a password" autoComplete={showStrength?'new-password':'current-password'}
          className="w-full px-4 py-3.5 pr-12 rounded-[14px] border text-[15px] focus:outline-none transition-all bg-white"
          style={{borderColor:error?'#EF4444':'#E8E5E0',color:'#1A1A2E'}}
        />
        <button type="button" onClick={()=>setVisible(v=>!v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
          style={{color:'#9CA3AF'}}>
          {visible?<EyeOff size={18}/>:<Eye size={18}/>}
        </button>
      </div>
      {showStrength && value && strength && (
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex gap-1 flex-1">
            {[1,2,3,4].map(i=>(
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                style={{background: i<=strength.score ? strength.color : '#E8E5E0'}}/>
            ))}
          </div>
          <span className="text-[11px] font-bold" style={{color:strength.color}}>{strength.label}</span>
        </div>
      )}
      {error && <p className="text-[12px] font-medium" style={{color:'#EF4444'}}>{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Sign Up
// ─────────────────────────────────────────────
function SignUp({ onSuccess, onToggle }) {
  const [name,     setName]     = useState('')
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(false) // username availability

  // Validate username format inline
  function handleUsername(v) {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g,'')
    setUsername(cleaned)
    if (cleaned && !usernameRe.test(cleaned)) {
      setErrors(e=>({...e,username:'3–20 characters, letters, numbers and _ only'}))
    } else {
      setErrors(e=>{const n={...e};delete n.username;return n})
    }
  }

  async function handleSubmit() {
    // Validate
    const errs = {}
    if (!name.trim())                errs.name     = 'Please enter your name'
    if (!usernameRe.test(username))  errs.username = '3–20 characters, letters, numbers and _ only'
    if (!emailRe.test(email))        errs.email    = 'Please enter a valid email'
    const pw = passwordStrength(password)
    if (pw.score < 2)                errs.password = 'Password too weak — add numbers or symbols'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const sb = createClient()
    if (!sb) { showToast('Supabase not configured'); setLoading(false); return }

    try {
      // Check username uniqueness
      const { data: existing } = await sb.from('profiles').select('id').eq('username', username).maybeSingle()
      if (existing) { setErrors({username:'That username is already taken'}); setLoading(false); return }

      // Create auth user
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name.trim(), username } },
      })
      if (error) throw error

      const userId = data.user?.id
      if (!userId) throw new Error('User creation failed')

      // Create profile row
      await sb.from('profiles').upsert({
        id:           userId,
        display_name: name.trim(),
        username:     username,
        walk_stage:   'Just starting',
        companion_id: 'david',
        streak_current: 0,
        streak_longest: 0,
      }, { onConflict: 'id' })

      // Persist to localStorage for immediate use
      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id:          userId,
          name:        name.trim(),
          username,
          email,
          companionId: 'david',
          joinedAt:    new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'}),
        }))
      } catch {}

      // Sync any existing localStorage data to Supabase
      await syncLocalToSupabase(userId).catch(()=>null)

      onSuccess()
    } catch (e) {
      if (e.message?.toLowerCase().includes('already registered')) {
        setErrors({email:'An account with this email already exists'})
      } else {
        showToast(e.message || 'Something went wrong — please try again')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
      className="flex flex-col gap-5">
      <Field label="Full name" value={name} onChange={setName} error={errors.name}
        placeholder="Your name" autoComplete="name"/>
      <div className="flex flex-col gap-1.5">
        <Field label="Username" value={username} onChange={handleUsername} error={errors.username}
          placeholder="e.g. john_doe" autoComplete="username"
          hint="This is what others will see on posts"/>
      </div>
      <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email}
        placeholder="you@example.com" autoComplete="email"/>
      <PasswordField label="Password" value={password} onChange={setPassword}
        error={errors.password} showStrength/>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-60 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
        {loading?<><Loader2 size={18} className="animate-spin"/> Creating account…</>:'Create Account'}
      </button>

      <p className="text-center text-[13px]" style={{color:'#6B7280'}}>
        Already have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{color:'#5B4FCF'}}>Sign in</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Sign In
// ─────────────────────────────────────────────
function SignIn({ onSuccess, onToggle }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit() {
    const errs = {}
    if (!emailRe.test(email)) errs.email    = 'Please enter a valid email'
    if (!password.trim())     errs.password = 'Please enter your password'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const sb = createClient()
    if (!sb) { showToast('Supabase not configured'); setLoading(false); return }

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error

      const user = data.user
      if (!user) throw new Error('Sign in failed')

      // Pull profile and write to localStorage
      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (profile) {
        try {
          localStorage.setItem('dw_user', JSON.stringify({
            id:          user.id,
            name:        profile.display_name || user.user_metadata?.display_name || 'Friend',
            username:    profile.username || '',
            email:       user.email,
            companionId: profile.companion_id || 'david',
            walkStage:   profile.walk_stage,
            joinedAt:    profile.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})
              : 'recently',
          }))
          localStorage.setItem('dw_onboarding_complete', 'true')
        } catch {}
      }

      // Sync Supabase data back to localStorage
      const { syncSupabaseToLocal } = await import('../../lib/supabase/sync')
      await syncSupabaseToLocal(user.id).catch(()=>null)

      onSuccess()
    } catch (e) {
      if (e.message?.toLowerCase().includes('invalid login')) {
        setErrors({password:'Incorrect email or password'})
      } else {
        showToast(e.message || 'Sign in failed — please try again')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!emailRe.test(email)) { setErrors({email:'Enter your email above first'}); return }
    const sb = createClient()
    if (!sb) { showToast('Supabase not configured'); return }
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setResetSent(true)
  }

  return (
    <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
      className="flex flex-col gap-5">
      <Field label="Email" type="email" value={email} onChange={v=>{setEmail(v);setErrors({})}} error={errors.email}
        placeholder="you@example.com" autoComplete="email"/>
      <div className="flex flex-col gap-1">
        <PasswordField label="Password" value={password} onChange={v=>{setPassword(v);setErrors({})}}
          error={errors.password}/>
        {resetSent ? (
          <p className="text-[12px] font-semibold" style={{color:'#4A7C5F'}}>
            ✓ Reset link sent — check your email
          </p>
        ) : (
          <button onClick={handleReset}
            className="text-left text-[12px] font-semibold underline" style={{color:'#5B4FCF'}}>
            Forgot password?
          </button>
        )}
      </div>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-60 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
        {loading?<><Loader2 size={18} className="animate-spin"/> Signing in…</>:'Sign In'}
      </button>

      <p className="text-center text-[13px]" style={{color:'#6B7280'}}>
        Don't have an account?{' '}
        <button onClick={onToggle} className="font-bold underline" style={{color:'#5B4FCF'}}>Create one</button>
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main auth page
// ─────────────────────────────────────────────
export default function AuthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initMode     = searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  const next         = searchParams.get('next') || '/'

  const [mode, setMode] = useState(initMode)

  function handleSuccess() {
    router.push(next)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{background:'#FAF8F5'}}>
      <ToastContainer/>

      {/* Back button */}
      <div className="px-4 pt-5">
        <button onClick={()=>router.push(next)}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
          style={{boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
          <ArrowLeft size={18} style={{color:'#1A1A2E'}}/>
        </button>
      </div>

      {/* Logo + heading */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6">
        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
          style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
          <Flame size={32} className="text-white"/>
        </div>
        <h1 className="font-display text-[26px] font-bold text-center" style={{color:'#1A1A2E'}}>
          {mode==='signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-[14px] text-center mt-1.5" style={{color:'#6B7280'}}>
          {mode==='signup'
            ? 'Save your progress and join the community'
            : 'Your streak and plans are waiting for you'}
        </p>
      </div>

      {/* Form card */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="bg-white rounded-[24px] p-5" style={{boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
          <AnimatePresence mode="wait">
            {mode==='signup'
              ? <SignUp key="signup" onSuccess={handleSuccess} onToggle={()=>setMode('signin')}/>
              : <SignIn key="signin" onSuccess={handleSuccess} onToggle={()=>setMode('signup')}/>
            }
          </AnimatePresence>
        </div>

        {/* Guest / skip */}
        <div className="text-center py-6">
          <button onClick={()=>router.push(next)}
            className="text-[13px] font-semibold underline underline-offset-2"
            style={{color:'#9CA3AF'}}>
            Continue without an account
          </button>
        </div>
      </div>
    </div>
  )
}