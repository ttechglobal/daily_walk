'use client'

// ── src/app/onboarding/page.js ──
//
// FIX: Username is NO LONGER collected here. It was already captured on the
// sign-up screen (auth/page.js) and written to the profiles table.
//
// This page now has 3 steps (was 4):
//   Step 0 — How did you hear about us? (heardFrom)
//   Step 1 — Spiritual level
//   Step 2 — Goals
//
// On finish: updates the profile row with heardFrom, spiritualLevel, goals,
// onboarding_complete=true. Username is left untouched (already saved).

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'

// ─────────────────────────────────────────────
//  Data
// ─────────────────────────────────────────────
const HEARD_FROM_OPTIONS = [
  { id: 'friend',      label: '👥 A friend or family member'   },
  { id: 'social',      label: '📱 Social media'                },
  { id: 'app_store',   label: '🛍️ App Store / Play Store'      },
  { id: 'church',      label: '⛪ My church'                   },
  { id: 'google',      label: '🔍 Google search'               },
  { id: 'other',       label: '✨ Other'                       },
]

const SPIRITUAL_LEVELS = [
  { id: 'new',         label: '🌱 Just starting my faith journey'     },
  { id: 'growing',     label: '🌿 Growing and learning'               },
  { id: 'recommitting',label: '🔥 Recommitting to my walk'            },
  { id: 'consistent',  label: '📖 Consistent and deepening'           },
]

const GOAL_OPTIONS = [
  { id: 'daily_reading', label: '📅 Build a daily reading habit'           },
  { id: 'connect',       label: '🤝 Connect with other believers'          },
  { id: 'community',     label: '🙏 Find spiritual community'              },
  { id: 'grow',          label: '📚 Grow in my understanding of the Word'  },
  { id: 'devotion',      label: '☀️ Have a space for devotion & reflection' },
]

// ─────────────────────────────────────────────
//  Dot stepper
// ─────────────────────────────────────────────
function Dots({ current, total, t }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i}
          className="rounded-full transition-all"
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
export default function OnboardingPage() {
  const router  = useRouter()
  const { t }   = useTheme()

  const [user,           setUser]           = useState(null)
  const [step,           setStep]           = useState(0)
  const [saving,         setSaving]         = useState(false)
  const [existingUsername, setExistingUsername] = useState('')

  // Answers for the 3 questions
  const [heardFrom,      setHeardFrom]      = useState(null)
  const [spiritualLevel, setSpiritualLevel] = useState(null)
  const [goals,          setGoals]          = useState(new Set())

  const TOTAL = 3

  // ── Resolve current user ──
  useEffect(() => {
    const sb = createClient()
    if (!sb) { router.push('/'); return }

    sb.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push('/auth'); return }

      setUser(data.user)

      // Fetch the existing username from profiles — it was written during sign-up.
      // We need it to write it back on finish() so it isn't lost.
      const { data: profile } = await sb.from('profiles')
        .select('username, onboarding_complete')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.username) {
        setExistingUsername(profile.username)
      }

      // If already onboarded, go home
      if (profile?.onboarding_complete) {
        router.push('/')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGoal(id) {
    setGoals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function canProceed() {
    if (step === 0) return !!heardFrom
    if (step === 1) return !!spiritualLevel
    if (step === 2) return goals.size > 0
    return false
  }

  async function finish() {
    if (saving) return
    setSaving(true)
    const sb = createClient()
    if (!sb || !user) { router.push('/'); return }

    try {
      // Username comes from what was set during sign-up.
      // We include it in the update to handle any edge case where it wasn't saved.
      const usernameToSave = existingUsername
        || user.user_metadata?.display_name
        || ''

      await sb.from('profiles').update({
        ...(usernameToSave ? { username: usernameToSave } : {}),
        heard_from:          heardFrom,
        spiritual_level:     spiritualLevel,
        goals:               Array.from(goals),
        onboarding_complete: true,
        display_name:        user.user_metadata?.full_name || usernameToSave,
        avatar_url:          user.user_metadata?.avatar_url || null,
        email:               user.email,
      }).eq('id', user.id)

      // Sync localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('dw_user') || '{}')
        localStorage.setItem('dw_user', JSON.stringify({
          ...stored,
          id:          user.id,
          username:    usernameToSave || stored.username || '',
          name:        user.user_metadata?.full_name || usernameToSave || stored.username || '',
          email:       user.email,
          companionId: stored.companionId || 'david',
          joinedAt:    stored.joinedAt || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }))
        localStorage.setItem('dw_onboarding_complete', 'true')
      } catch {}

      router.push('/')
    } catch (e) {
      console.warn('[onboarding] save failed:', e.message)
      // Non-blocking — push home anyway so user isn't stuck
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

  return (
    <div className="fixed inset-0 flex flex-col z-[200]" style={{ background: t.bg }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <Dots current={step} total={TOTAL} t={t} />
        <button
          onClick={() => router.push('/')}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
          style={{ color: t.textFaint, background: t.bgMuted }}>
          Skip
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">

          {/* Step 0 — How did you hear about us? */}
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
                  How did you find us?
                </h1>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  Help us understand how you heard about Daily Walk.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {HEARD_FROM_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setHeardFrom(opt.id)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
                    style={{
                      background:  heardFrom === opt.id ? '#EDE9FF' : t.bgCard,
                      border:      `2px solid ${heardFrom === opt.id ? '#5B4FCF' : t.border}`,
                    }}>
                    <span className="text-[20px]">{opt.label.split(' ')[0]}</span>
                    <p className="font-semibold text-[14px] flex-1" style={{ color: t.text }}>
                      {opt.label.split(' ').slice(1).join(' ')}
                    </p>
                    {heardFrom === opt.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#5B4FCF' }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1 — Spiritual level */}
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
                  Where are you in your walk?
                </h1>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  This helps us personalise your Daily Walk experience.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {SPIRITUAL_LEVELS.map(opt => (
                  <button key={opt.id} onClick={() => setSpiritualLevel(opt.id)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
                    style={{
                      background:  spiritualLevel === opt.id ? '#EDE9FF' : t.bgCard,
                      border:      `2px solid ${spiritualLevel === opt.id ? '#5B4FCF' : t.border}`,
                    }}>
                    <span className="text-[20px]">{opt.label.split(' ')[0]}</span>
                    <p className="font-semibold text-[14px] flex-1" style={{ color: t.text }}>
                      {opt.label.split(' ').slice(1).join(' ')}
                    </p>
                    {spiritualLevel === opt.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#5B4FCF' }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Goals */}
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
                  What are your goals?
                </h1>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  Choose all that apply — you can update these later.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {GOAL_OPTIONS.map(opt => {
                  const selected = goals.has(opt.id)
                  return (
                    <button key={opt.id} onClick={() => toggleGoal(opt.id)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
                      style={{
                        background: selected ? '#EDE9FF' : t.bgCard,
                        border:     `2px solid ${selected ? '#5B4FCF' : t.border}`,
                      }}>
                      <span className="text-[20px]">{opt.label.split(' ')[0]}</span>
                      <p className="font-semibold text-[14px] flex-1" style={{ color: t.text }}>
                        {opt.label.split(' ').slice(1).join(' ')}
                      </p>
                      <div className="w-5 h-5 rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: selected ? '#5B4FCF' : t.borderInput,
                          background:  selected ? '#5B4FCF' : 'transparent',
                        }}>
                        {selected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
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