'use client'

// ── src/app/admin/login/page.js ──
// Dedicated admin login — completely separate from the normal /auth page.
// Asks only for email + password.
// On success, checks profiles.role === 'superadmin' before letting in.
// Redirects away immediately if already authenticated as superadmin.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState('')

  // If already signed in as superadmin, go straight to admin
  useEffect(() => {
    async function check() {
      const sb = createClient()
      if (!sb) { setChecking(false); return }
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setChecking(false); return }
      const { data: profile } = await sb.from('profiles')
        .select('role').eq('id', user.id).single()
      if (profile?.role === 'superadmin') {
        router.replace('/admin')
      } else {
        setChecking(false)
      }
    }
    check()
  }, []) // eslint-disable-line

  async function handleLogin() {
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const sb = createClient()
    if (!sb) { setError('Supabase not configured.'); setLoading(false); return }

    try {
      const { data, error: authError } = await sb.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const user = data.user
      const { data: profile } = await sb.from('profiles')
        .select('role').eq('id', user.id).single()

      if (profile?.role !== 'superadmin') {
        // Sign them back out — not an admin
        await sb.auth.signOut()
        setError('Access denied. This account does not have admin access.')
        setLoading(false)
        return
      }

      router.replace('/admin')
    } catch (e) {
      const msg = e.message || ''
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password.')
      } else {
        setError(msg || 'Sign in failed — please try again.')
      }
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0F1117' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#5B4FCF' }}/>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4"
      style={{ background: '#0F1117' }}>
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            <Shield size={28} className="text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-[20px]">Admin Access</p>
            <p className="text-[13px] mt-1" style={{ color: '#8A8FA8' }}>
              Daily Walk — Platform Management
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-[20px] p-6 flex flex-col gap-4"
          style={{ background: '#1C1C2A', border: '1px solid #252840' }}>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#8A8FA8' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="admin@dailywalk.app"
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-[12px] text-[15px] focus:outline-none transition-all"
              style={{
                background:  '#252840',
                color:       '#EAE6DE',
                border:      `1px solid ${error ? '#EF4444' : '#2E3258'}`,
              }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#8A8FA8' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                placeholder="••••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3.5 pr-12 rounded-[12px] text-[15px] focus:outline-none transition-all"
                style={{
                  background:  '#252840',
                  color:       '#EAE6DE',
                  border:      `1px solid ${error ? '#EF4444' : '#2E3258'}`,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
                style={{ color: '#50546A' }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[13px] font-semibold px-1" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-bold text-[15px] text-white disabled:opacity-50 transition-all active:scale-[0.97] flex items-center justify-center gap-2 mt-1"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Verifying…</>
              : 'Sign in to Admin'
            }
          </button>
        </div>

        <p className="text-center text-[12px] mt-5" style={{ color: '#50546A' }}>
          Not an admin?{' '}
          <button onClick={() => router.push('/')}
            className="underline" style={{ color: '#8A8FA8' }}>
            Return to app
          </button>
        </p>
      </div>
    </div>
  )
}