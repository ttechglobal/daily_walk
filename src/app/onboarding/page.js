'use client'

// ── src/app/onboarding/page.js ──
// Post-signup onboarding: 4 screens of personalisation questions.
// Saves answers to Supabase profiles table.
// Warm, simple, max 4 screens — no bloat.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'

// ─────────────────────────────────────────────
//  Step dots
// ─────────────────────────────────────────────
function Dots({ current, total, t }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width:      i === current ? 24 : 8,
            background: i <= current ? '#5B4FCF' : t.border,
          }}
          className="h-2 rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Pill option (single or multi select)
// ─────────────────────────────────────────────
function Pill({ label, selected, onToggle, accent = '#5B4FCF', t }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-3 rounded-full text-[14px] font-semibold border-2 transition-all active:scale-95 min-h-[48px]"
      style={{
        background:  selected ? `${accent}15` : t.bgCard,
        borderColor: selected ? accent         : t.borderInput,
        color:       selected ? accent         : t.textMuted,
        boxShadow:   selected ? `0 0 0 3px ${accent}20` : t.shadow,
      }}
    >
      {selected && <Check size={14} strokeWidth={3} />}
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────
//  Steps
// ─────────────────────────────────────────────
const HEARD_FROM_OPTIONS = [
  { id: 'social',     label: '📱 Social media'        },
  { id: 'friend',     label: '👥 Friend or family'    },
  { id: 'church',     label: '⛪ Church'              },
  { id: 'app_store',  label: '📲 App store'           },
  { id: 'other',      label: '✨ Other'               },
]

const SPIRITUAL_LEVELS = [
  { id: 'new_believer', label: '🌱 New believer',      sub: "I'm just getting started" },
  { id: 'growing',      label: '🌿 Growing in faith',  sub: 'Building my relationship with God' },
  { id: 'mature',       label: '🌳 Mature believer',   sub: "I've walked with God for years" },
  { id: 'returning',    label: '🕊️ Returning to faith', sub: 'Coming back after time away' },
]

const GOAL_OPTIONS = [
  { id: 'read_bible',  label: '📖 Read my Bible consistently'           },
  { id: 'connect',     label: '🤝 Connect with other believers'         },
  { id: 'community',   label: '🙏 Find spiritual community'             },
  { id: 'grow',        label: '📚 Grow in my understanding of the Word' },
  { id: 'devotion',    label: '☀️ Have a space for devotion & reflection' },
]

// ─────────────────────────────────────────────
//  Main onboarding page
// ─────────────────────────────────────────────
export default function OnboardingPage() {
  const router  = useRouter()
  const { t }   = useTheme()

  const [user,    setUser]    = useState(null)
  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Answers
  const [username,       setUsername]       = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'ok' | 'taken' | 'invalid'
  const [heardFrom,      setHeardFrom]      = useState(null)
  const [spiritualLevel, setSpiritualLevel] = useState(null)
  const [goals,          setGoals]          = useState(new Set())

  const TOTAL = 4

  // ── Resolve current user ──
  useEffect(() => {
    const sb = createClient()
    if (!sb) { router.push('/'); return }
    sb.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        // Pre-fill username from Google name
        const rawName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''
        const slug = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
        if (slug) setUsername(slug)
      } else {
        router.push('/auth')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check username availability (debounced) ──
  const checkUsername = useCallback(async (val) => {
    if (!val || val.length < 3) { setUsernameStatus('invalid'); return }
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
    const t = setTimeout(() => checkUsername(username), 500)
    return () => clearTimeout(t)
  }, [username, checkUsername])

  function handleUsernameInput(val) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    setUsername(cleaned)
    setUsernameStatus(null)
  }

  function toggleGoal(id) {
    setGoals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

    try {
      await sb.from('profiles').update({
        username,
        heard_from:       heardFrom,
        spiritual_level:  spiritualLevel,
        goals:            Array.from(goals),
        onboarding_complete: true,
        display_name:     user.user_metadata?.full_name || user.user_metadata?.name || username,
        avatar_url:       user.user_metadata?.avatar_url || null,
        email:            user.email,
      }).eq('id', user.id)

      // Write to localStorage for immediate use
      try {
        localStorage.setItem('dw_user', JSON.stringify({
          id:          user.id,
          name:        user.user_metadata?.full_name || username,
          username,
          email:       user.email,
          companionId: 'david',
          joinedAt:    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
        localStorage.setItem('dw_onboarding_complete', 'true')
      } catch {}

      router.push('/')
    } catch (e) {
      console.warn('onboarding save failed:', e.message)
      router.push('/')
    }
  }

  function next() {
    if (step < TOTAL - 1) setStep(s => s + 1)
    else finish()
  }

  const USERNAME_HINT = {
    null:      { color: t.textFaint,  text: '3–20 chars, letters, numbers and _' },
    checking:  { color: '#E8A838',    text: 'Checking…' },
    ok:        { color: '#4A7C5F',    text: '✓ Available!' },
    taken:     { color: '#EF4444',    text: '✗ Already taken — try another' },
    invalid:   { color: '#EF4444',    text: '3–20 chars, letters, numbers and _ only' },
  }

  return (
    <div className="fixed inset-0 flex flex-col z-[200]" style={{ background: t.bg }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <Dots current={step} total={TOTAL} t={t} />
        <button
          onClick={() => router.push('/')}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
          style={{ color: t.textFaint, background: t.bgMuted }}
        >
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
              className="flex flex-col gap-6"
            >
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 1 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  Set your username
                </h1>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  This is what others will see on your posts and in communities. Make it yours.
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
                    className="w-full pl-8 pr-4 py-4 rounded-[16px] border-2 text-[16px] font-semibold focus:outline-none transition-all"
                    style={{
                      background:  t.bgInput,
                      color:       t.text,
                      borderColor: usernameStatus === 'ok' ? '#4A7C5F'
                                 : usernameStatus === 'taken' || usernameStatus === 'invalid' ? '#EF4444'
                                 : t.borderInput,
                    }}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  />
                </div>
                {username && (
                  <p className="text-[13px] font-semibold" style={{ color: USERNAME_HINT[usernameStatus]?.color || t.textFaint }}>
                    {USERNAME_HINT[usernameStatus]?.text}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 1 — Heard from */}
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6"
            >
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
                  <Pill
                    key={opt.id}
                    label={opt.label}
                    selected={heardFrom === opt.id}
                    onToggle={() => setHeardFrom(opt.id)}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Spiritual level */}
          {step === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6"
            >
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 3 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  Where are you in your faith?
                </h1>
                <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                  We'll use this to personalise your reading plans.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {SPIRITUAL_LEVELS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSpiritualLevel(opt.id)}
                    className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left border-2 transition-all active:scale-[0.98] min-h-[64px]"
                    style={{
                      background:  spiritualLevel === opt.id ? '#5B4FCF15' : t.bgCard,
                      borderColor: spiritualLevel === opt.id ? '#5B4FCF'   : t.borderInput,
                      boxShadow:   t.shadow,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px]" style={{ color: t.text }}>{opt.label}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>{opt.sub}</p>
                    </div>
                    {spiritualLevel === opt.id && (
                      <CheckCircle2 size={20} style={{ color: '#5B4FCF', flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3 — Goals (multi-select) */}
          {step === 3 && (
            <motion.div key="s3"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="flex flex-col gap-6"
            >
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5B4FCF' }}>
                  Step 4 of {TOTAL}
                </p>
                <h1 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
                  What are you here for?
                </h1>
                <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                  Pick everything that resonates — you can choose multiple.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {GOAL_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleGoal(opt.id)}
                    className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left border-2 transition-all active:scale-[0.98] min-h-[56px]"
                    style={{
                      background:  goals.has(opt.id) ? '#5B4FCF15' : t.bgCard,
                      borderColor: goals.has(opt.id) ? '#5B4FCF'   : t.borderInput,
                      boxShadow:   t.shadow,
                    }}
                  >
                    <p className="font-semibold text-[14px] flex-1" style={{ color: t.text }}>
                      {opt.label}
                    </p>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: goals.has(opt.id) ? '#5B4FCF' : t.borderInput,
                        background:  goals.has(opt.id) ? '#5B4FCF' : 'transparent',
                      }}
                    >
                      {goals.has(opt.id) && (
                        <Check size={10} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Fixed footer CTA */}
      <div className="flex-shrink-0 px-5 pt-3 pb-10 border-t" style={{ borderColor: t.border, background: t.bg }}>
        <button
          onClick={next}
          disabled={!canProceed() || saving}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
        >
          {saving
            ? <><Loader2 size={18} className="animate-spin" /> Setting up your account…</>
            : step < TOTAL - 1 ? 'Continue →' : "Let's get started 🙌"
          }
        </button>
      </div>
    </div>
  )
}