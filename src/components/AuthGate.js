'use client'

// ── src/components/AuthGate.js ──
//
// FIX: handleSignIn now sanitises window.location.pathname before
// using it as the `next` redirect param.
// Previously, if the user was on a page like `/read?book=John 3:1`
// or any route where pathname parsing went wrong, the raw string
// (including colon-separated refs like "1:1") would be passed as `next`.
// After sign-in, router.push('1:1') would 404.
//
// Fix: only use pathname if it starts with '/' and doesn't look like
// a Bible ref (no colons in the path segment). Otherwise default to '/'.

import { useState, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useAuthContext } from '../contexts/AuthContext'

const AuthGateCtx = createContext({ requireAuth: () => {} })

export function useAuthGate() {
  return useContext(AuthGateCtx)
}

// Sanitise a pathname for use as a redirect target
function safeNext() {
  if (typeof window === 'undefined') return '/'
  const path = window.location.pathname
  // Must start with '/', must not contain ':' (Bible ref guard), must not be '//'
  if (path && path.startsWith('/') && !path.startsWith('//') && !path.includes(':')) {
    return path
  }
  return '/'
}

const COPY = {
  post:      { title: 'Join to post',        body: 'Share what God is teaching you with the Daily Walk community.' },
  like:      { title: 'Join to like posts',  body: 'Encourage other believers by reacting to their posts.'        },
  comment:   { title: 'Join to comment',     body: 'Jump into the conversation and grow together.'                },
  join:      { title: 'Join to connect',     body: 'Become a member of this community and share in the journey.' },
  save:      { title: 'Join to save posts',  body: 'Save posts to revisit them from your profile anytime.'       },
  plan:      { title: 'Join to save plans',  body: 'Create an account to track your reading progress.'           },
  community: { title: 'Create a community',  body: 'Sign in to create and lead your own Daily Walk community.'   },
  default:   { title: 'Join Daily Walk',     body: 'Sign in to post, connect, and grow with other believers.'    },
}

function AuthGateSheet({ open, reason, onClose }) {
  const router = useRouter()
  const { t }  = useTheme()
  const copy   = COPY[reason] || COPY.default

  function handleSignIn() {
    const next = safeNext()
    router.push(`/auth?next=${encodeURIComponent(next)}&reason=${reason || 'default'}`)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/50 z-[80]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />

          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[90] flex flex-col"
            style={{ background: t.bgCard, paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: t.border }} />
            </div>

            <div className="flex items-start justify-between px-6 pt-4 pb-2">
              <div className="flex-1 pr-4">
                <p className="font-display font-bold text-[22px] leading-tight" style={{ color: t.text }}>
                  {copy.title}
                </p>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: t.textMuted }}>
                  {copy.body}
                </p>
              </div>
              <button onClick={onClose} className="mt-1 flex-shrink-0">
                <X size={20} style={{ color: t.textFaint }} />
              </button>
            </div>

            <div className="px-6 pb-2 pt-3 flex flex-col gap-3">
              {/* Google — coming soon */}
              <div style={{ position: 'relative' }}>
                <button type="button"
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full font-bold text-[14px] border-2"
                  style={{ background: 'white', color: '#1A1A2E', borderColor: '#E5E7EB', opacity: 0.4, pointerEvents: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="absolute inset-0 flex items-end justify-center pb-1.5" style={{ pointerEvents: 'none' }}>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.10)', color: '#6B7280' }}>Coming soon</span>
                </div>
              </div>

              <button onClick={handleSignIn}
                className="w-full py-3.5 rounded-full font-semibold text-[14px] border-2 active:scale-[0.97] transition-all"
                style={{ borderColor: t.borderInput, color: t.textMuted, background: 'transparent' }}>
                Sign up with email
              </button>

              <button onClick={onClose}
                className="text-center text-[13px] font-semibold py-1"
                style={{ color: t.textFaint }}>
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function AuthGateProvider({ children }) {
  const [open,   setOpen]   = useState(false)
  const [reason, setReason] = useState('default')
  const { user } = useAuthContext()

  const requireAuth = useCallback((reasonKey, onAuthenticated) => {
    if (user) {
      if (typeof onAuthenticated === 'function') onAuthenticated()
      return
    }
    setReason(reasonKey || 'default')
    setOpen(true)
  }, [user])

  return (
    <AuthGateCtx.Provider value={{ requireAuth }}>
      {children}
      <AuthGateSheet open={open} reason={reason} onClose={() => setOpen(false)} />
    </AuthGateCtx.Provider>
  )
}