'use client'

// ── src/components/EditUsername.js ──
// Inline username editor — works for signed-in AND guest (localStorage) users.
// Shows current username with an edit button.
// Real-time uniqueness check against Supabase.
// On save: writes to profiles table (if signed in) AND to dw_user in localStorage.
//
// Usage in profile page:
//   import EditUsername from '../../components/EditUsername'
//   <EditUsername />

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Check, X, Loader2 } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import { showToast } from './Toast'

export default function EditUsername() {
  const [currentUsername, setCurrentUsername] = useState('')
  const [editing,  setEditing]  = useState(false)
  const [input,    setInput]    = useState('')
  const [status,   setStatus]   = useState(null) // null|'checking'|'ok'|'taken'|'invalid'
  const [saving,   setSaving]   = useState(false)
  const [userId,   setUserId]   = useState(null)

  // Load current username from localStorage + Supabase
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dw_user') || '{}')
      if (stored.username) setCurrentUsername(stored.username)
      if (stored.id)       setUserId(stored.id)
    } catch {}

    // Also try to get from live Supabase session
    const sb = createClient()
    if (sb) {
      sb.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        setUserId(user.id)
        sb.from('profiles').select('username').eq('id', user.id).maybeSingle()
          .then(({ data }) => {
            if (data?.username) setCurrentUsername(data.username)
          })
      })
    }
  }, [])

  function startEdit() {
    setInput(currentUsername)
    setStatus(null)
    setEditing(true)
  }

  function handleInput(v) {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    setInput(cleaned)
    setStatus(null)
  }

  const checkAvailability = useCallback(async (val) => {
    if (!val || val.length < 3)          { setStatus('invalid'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) { setStatus('invalid'); return }
    if (val === currentUsername)          { setStatus('ok');      return } // own username
    setStatus('checking')
    const sb = createClient()
    if (!sb) { setStatus('ok'); return }
    const { data } = await sb.from('profiles').select('id').eq('username', val).maybeSingle()
    setStatus(data ? 'taken' : 'ok')
  }, [currentUsername])

  useEffect(() => {
    const timer = setTimeout(() => { if (input) checkAvailability(input) }, 480)
    return () => clearTimeout(timer)
  }, [input, checkAvailability])

  async function save() {
    if (status !== 'ok' || saving) return
    if (input === currentUsername) { setEditing(false); return }

    setSaving(true)
    const sb = createClient()

    try {
      if (sb && userId) {
        // Write to Supabase profiles
        const { error } = await sb.from('profiles')
          .update({ username: input })
          .eq('id', userId)
        if (error) throw error
      }

      // Always update localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('dw_user') || '{}')
        localStorage.setItem('dw_user', JSON.stringify({ ...stored, username: input }))
      } catch {}

      setCurrentUsername(input)
      setEditing(false)
      showToast('Username updated ✓')
    } catch (e) {
      if (e.message?.includes('unique')) {
        setStatus('taken')
        showToast('That username is already taken')
      } else {
        showToast('Failed to save: ' + e.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const STATUS_HINT = {
    checking: { color: '#E8A838', text: 'Checking…'                          },
    ok:       { color: '#4A7C5F', text: '✓ Available'                        },
    taken:    { color: '#EF4444', text: '✗ Already taken'                    },
    invalid:  { color: '#EF4444', text: '3–20 chars · letters, numbers, _'   },
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence mode="wait">
        {!editing ? (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2">
            <span className="font-mono text-[15px] font-semibold text-text-primary">
              @{currentUsername || 'set a username'}
            </span>
            <button onClick={startEdit}
              className="w-8 h-8 rounded-full bg-purple-light flex items-center justify-center active:scale-90 transition-all">
              <PenLine size={14} className="text-purple" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="edit" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {/* Input */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[14px] text-text-muted">
                  @
                </span>
                <input
                  autoFocus
                  value={input}
                  onChange={e => handleInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="username"
                  className="w-full pl-7 pr-3 py-2.5 rounded-[12px] border text-[14px] font-semibold focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
                  style={{ borderColor: status === 'taken' || status === 'invalid' ? '#EF4444' : undefined }}
                />
              </div>

              {/* Save */}
              <button onClick={save}
                disabled={status !== 'ok' || saving}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-90"
                style={{ background: '#5B4FCF' }}>
                {saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} strokeWidth={3} />
                }
              </button>

              {/* Cancel */}
              <button onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-full bg-warm-outer flex items-center justify-center active:scale-90 transition-all">
                <X size={14} className="text-text-muted" />
              </button>
            </div>

            {/* Status hint */}
            {status && STATUS_HINT[status] && (
              <p className="text-[12px] font-semibold px-1"
                style={{ color: STATUS_HINT[status].color }}>
                {STATUS_HINT[status].text}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}