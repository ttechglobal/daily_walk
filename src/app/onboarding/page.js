'use client'

// ── src/app/onboarding/page.js ──
//
// BUG FIXED — username being overwritten during onboarding:
//
// ORIGINAL FLOW:
//  auth/page.js → writes username "sarah_k" to DB + localStorage
//  → routes to /onboarding
//  onboarding Step 0 pre-fills username from:
//    user.user_metadata?.full_name || user.user_metadata?.name || ''
//  For email sign-ups, user_metadata is EMPTY, so slug = ""
//  → User doesn't notice the blank field (or it auto-advances)
//  → finish() calls update({ username: "" }) — OVERWRITES the correct "sarah_k"
//
// FIX:
//  1. Read the username from the URL query param `?username=sarah_k`
//     (set by auth/page.js handleSuccess). This is the exact value the user
//     submitted — no transformation, no metadata lookup.
//  2. The username field in Step 0 is pre-filled with this value and validated
//     as "ok" immediately (it was just accepted on the previous screen).
//  3. finish() always sends this username to the DB, even if the user didn't
//     touch the field, so it can never be overwritten with an empty string.
//  4. If the URL param is missing (direct navigation), fall back to the
//     profile row from Supabase, then localStorage. Last resort: empty string
//     which the user must fill in.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'

// ─────────────────────────────────────────────
//  Step data
// ─────────────────────────────────────────────
const HEARD_FROM_OPTIONS = [
  { id: 'friend',    label: '👥 A friend or family member' },
  { id: 'social',    label: '📱 Social media'              },
  { id: 'app_store', label: '🛍️ App Store / Play Store'   },
  { id: 'church',    label: '⛪ My church'                 },
  { id: 'google',    label: '🔍 Google search'             },
  { id: 'other',     label: '✨ Other'                     },
]

const SPIRITUAL_LEVELS = [
  { id: 'new',          label: '🌱 Just starting my faith journey' },
  { id: 'growing',      label: '🌿 Growing and learning'            },
  { id: 'recommitting', label: '🔥 Recommitting to my walk'         },
  { id: 'consistent',   label: '📖 Consistent and deepening'        },
]

const GOAL_OPTIONS = [
  { id: 'daily_reading', label: '📅 Build a daily reading habit'            },
  { id: 'connect',       label: '🤝 Connect with other believers'           },
  { id: 'community',     label: '🙏 Find spiritual community'               },
  { id: 'grow',          label: '📚 Grow in my understanding of the Word'   },
  { id: 'devotion',      label: '☀️ A space for devotion & reflection'      },
]

// ─────────────────────────────────────────────
//  Pill selector
// ─────────────────────────────────────────────
function Pill({ label, selected, onToggle, t }) {
  return (
    <button onClick={onToggle}
      className="px-4 py-2.5 rounded-full text-[14px] font-semibold border-2 transition-all active:scale-95"
      style={{
        background:  selected ? '#5B4FCF' : t.bgCard,
        color:       selected ? 'white'   : t.textMuted,
        borderColor: selected ? '#5B4FCF' : t.border,
      }}>
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────
//  Dot stepper
// ─────────────────────────────────────────────
function Dots({ current, total, t }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all"
          style={{
            width:      i === current ? 20 : 8,
            height:     8,
            background: i <= current ? '#5B4FCF' : t.bgMuted,
          }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main onboarding page
// ─────────────────────────────────────────────
function OnboardingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t }        = useTheme()

  const [user,    setUser]    = useState(null)
  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Username: sourced from URL param first (passed by auth/page.js)
  // This is the authoritative value — never re-derived from user_metadata
  const [username,       setUsername]       = useState(searchParams.get('username') || '')
  const [usernameStatus, setUsernameStatus] = useState(
    searchParams.get('username') ? 'ok' : null  // if passed via URL, it was already validated
  )

  const [heardFrom,      setHeardFrom]      = useState(null)
  const [spiritualLevel, setSpiritualLevel] = useState(null)
  const [goals,          setGoals]          = useState(new Set())

  const TOTAL = 4

  // ── Resolve auth user + fallback username ──
  useEffect(() => {
    const sb = createClient()
    if (!sb) { router.push('/'); return }

    sb.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push('/auth'); return }
      setUser(data.user)

      // If username wasn't in the URL (direct nav, back button, etc.),
      // fetch it from the DB rather than user_metadata
      if (!searchParams.get('username')) {
        const { data: profile } = await sb.from('profiles')
          .select('username').eq('id', data.user.id).maybeSingle()

        const existingUsername = profile?.username
          || (() => { try { return JSON.parse(localStorage.getItem('dw_user') || '{}').username } catch { return '' } })()

        if (existingUsername) {
          setUsername(existingUsername)
          setUsernameStatus('ok')
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Username availability check (only needed if user types a new one) ──
  const checkUsername = useCallback(async (val) => {
    if (!val || val.length < 3)          { setUsernameStatus('invalid'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    const sb = createClient()
    if (!sb) { setUsernameStatus('ok'); return }
    try {
      const { data } = await sb.from('profiles')
        .select('id').eq('username', val).neq('id', user?.id || '').maybeSingle()
      setUsernameStatus(data ? 'taken' : 'ok')
    } catch { setUsernameStatus('ok') }
  }, [user?.id])

  useEffect(() => {
    // Don't re-check a username that arrived via URL (already validated)
    if (searchParams.get('username') === username) return
    const timer = setTimeout(() => checkUsername(username), 500)
    return () => clearTimeout(timer)
  }, [username, checkUsername, searchParams])

  function handleUsernameInput(val) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    setUsername(cleaned)
    setUsernameStatus(null)
  }

  function toggleGoal(id) {
    setGoals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function canProceed() {
    if (step === 0) return usernameStatus === 'ok'
    if (step === 1) return !!heardFrom
    if (step === 2) return !!spiritualLevel
    if (step === 3) return goals.size > 0
    return false
  }

  async function finish() {
    if (saving) return
    setSaving(true)
    const sb = createClient()
    if (!sb || !user) { router.push('/'); return }

    // CRITICAL: `username` here is the value from the URL param (or DB fallback).
    // It is NEVER derived from user_metadata. It is exactly what the user chose.
    const finalUsername = username.trim()

    try {
      const { error } = await sb.from('profiles').update({
        username:            finalUsername,
        full_name:           finalUsername,   // keep in sync with sign-up
        heard_from:          heardFrom,
        spiritual_level:     spiritualLevel,
        goals:               Array.from(goals),
        onboarding_complete: true,
        email:               user.email,
      }).eq('id', user.id)

      if (error) {
        console.error('[onboarding] finish update error:', error.message, error.code)
      }

      // Write to localStorage — use finalUsername as both name and username
      try {
        const existing = (() => {
          try { return JSON.parse(localStorage.getItem('dw_user') || '{}') } catch { return {} }
        })()
        localStorage.setItem('dw_user', JSON.stringify({
          ...existing,
          id:          user.id,
          username:    finalUsername,
          name:        finalUsername,
          email:       user.email,
          companionId: existing.companionId || 'david',
          joinedAt:    existing.joinedAt || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
        localStorage.setItem('dw_onboarding_complete', 'true')
      } catch {}

      router.push('/')
    } catch (e) {
      console.warn('[onboarding] finish error:', e.message)
      // Don't block the user — they can complete onboarding details later
      try { localStorage.setItem('dw_onboarding_complete', 'true') } catch {}
      router.push('/')
    }
  }

  function next() {
    if (step < TOTAL - 1) setStep(s => s + 1)
    else finish()
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: t.bg }}>
        <Loader2 size={28} className="animate-spin" style={{ color: '#5B4FCF' }} />
      </div>
    )
  }

  const USERNAME_HINT = {
    null:      { color: t.textFaint, text: '3–20 chars, letters, numbers and _' },
    checking:  { color: '#E8A838',   text: 'Checking…'                          },
    ok:        { color: '#4A7C5F',   text: '✓ Available!'                       },
    taken:     { color: '#EF4444',   text: '✗ Already taken — try another'      },
    invalid:   { color: '#EF4444',   text: '3–20 chars, letters, numbers and _' },
  }

  return (
    <div className="fixed inset-0 flex flex-col z-[200]" style={{ background: t.bg }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <Dots current={step} total={TOTAL} t={t} />
        <button onClick={() => router.push('/')}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
          style={{ color: t.textFaint, background: t.bgMuted }}>
          Skip
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">

          {/* Step 0 — Username */}
          {step === 0 && (
            <motion.div key="s0"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 1 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  Choose your username
                </h1>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  This is how others will see you in communities.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[15px]"
                    style={{ color: t.textFaint }}>@</span>
                  <input
                    value={username}
                    onChange={e => handleUsernameInput(e.target.value)}
                    placeholder="yourname"
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    className="w-full pl-8 pr-4 py-4 rounded-[16px] text-[16px] font-semibold focus:outline-none border-2"
                    style={{
                      background:  t.bgCard,
                      color:       t.text,
                      borderColor: usernameStatus === 'ok'      ? '#4A7C5F'
                        :          usernameStatus === 'taken'   ? '#EF4444'
                        :          usernameStatus === 'invalid' ? '#EF4444'
                        :                                         t.border,
                    }} />
                </div>
                {username && USERNAME_HINT[usernameStatus] && (
                  <p className="text-[13px] font-semibold"
                    style={{ color: USERNAME_HINT[usernameStatus].color }}>
                    {USERNAME_HINT[usernameStatus].text}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 1 — How did you hear about us? */}
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 2 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  How did you find us?
                </h1>
                <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                  Helps us understand how people discover Daily Walk.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {HEARD_FROM_OPTIONS.map(opt => (
                  <Pill key={opt.id} label={opt.label} selected={heardFrom === opt.id}
                    onToggle={() => setHeardFrom(opt.id)} t={t} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Spiritual level */}
          {step === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 3 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  Where are you in your faith?
                </h1>
                <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                  We'll use this to personalise your experience.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SPIRITUAL_LEVELS.map(opt => (
                  <Pill key={opt.id} label={opt.label} selected={spiritualLevel === opt.id}
                    onToggle={() => setSpiritualLevel(opt.id)} t={t} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3 — Goals */}
          {step === 3 && (
            <motion.div key="s3"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 4 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  What are your goals?
                </h1>
                <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                  Choose all that apply — you can update these later.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {GOAL_OPTIONS.map(opt => (
                  <Pill key={opt.id} label={opt.label} selected={goals.has(opt.id)}
                    onToggle={() => toggleGoal(opt.id)} t={t} />
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-10 pt-4 flex-shrink-0">
        <button
          onClick={next}
          disabled={!canProceed() || saving}
          className="w-full py-4 rounded-full text-white font-bold text-[16px] disabled:opacity-40 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {saving
            ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
            : step < TOTAL - 1 ? 'Continue →' : 'Start my walk 🙌'
          }
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <OnboardingInner />
    </Suspense>
  )
}