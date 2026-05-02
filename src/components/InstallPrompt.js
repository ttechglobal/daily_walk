'use client'

// ── InstallPrompt — Part 2 ──
// Shows a custom "Add to Home Screen" banner.
// Triggers after 30s on first visit OR after 3 check-ins (whichever first).
// iOS gets manual instructions (no beforeinstallprompt on Safari).

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share, X } from 'lucide-react'

function readLocalBool(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'false') } catch { return false }
}
function writeLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export default function InstallPrompt() {
  const [show,   setShow]   = useState(false)
  const [isIOS,  setIsIOS]  = useState(false)
  const deferredRef         = useRef(null)  // stores the beforeinstallprompt event

  useEffect(() => {
    // Already prompted — never show again
    if (readLocalBool('dw_install_prompted')) return

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (!ios) {
      // Listen for Chrome/Android install event
      const handler = (e) => {
        e.preventDefault()
        deferredRef.current = e
      }
      window.addEventListener('beforeinstallprompt', handler)

      // Auto-show after 30 seconds on first visit
      const timer = setTimeout(() => {
        if (!readLocalBool('dw_install_prompted')) setShow(true)
      }, 30_000)

      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    } else {
      // iOS — show after 30s too (manual instructions)
      const timer = setTimeout(() => {
        if (!readLocalBool('dw_install_prompted')) setShow(true)
      }, 30_000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Also watch check-in count — show after 3 check-ins
  useEffect(() => {
    if (readLocalBool('dw_install_prompted')) return

    function checkCount() {
      try {
        const checkins = JSON.parse(localStorage.getItem('dw_checkins') || '[]')
        if (checkins.length >= 3) setShow(true)
      } catch {}
    }

    // Poll every 5s (lightweight — only runs until prompted)
    const interval = setInterval(checkCount, 5_000)
    return () => clearInterval(interval)
  }, [])

  function handleInstall() {
    if (deferredRef.current) {
      deferredRef.current.prompt()
      deferredRef.current.userChoice.then(() => {
        deferredRef.current = null
      })
    }
    dismiss()
  }

  function dismiss() {
    writeLocal('dw_install_prompted', true)
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-[80]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Banner slides up */}
          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[90]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            <div className="bg-white rounded-t-[28px] shadow-2xl px-5 pt-5 pb-10">
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Dismiss button */}
              <button
                onClick={dismiss}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200 transition-colors"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>

              {/* Icon + text */}
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#5B4FCF' }}>
                  {isIOS
                    ? <Share size={26} className="text-white" />
                    : <Download size={26} className="text-white" />}
                </div>
                <div>
                  <p className="font-bold text-text-primary text-[16px] leading-snug">
                    Add Daily Walk to your home screen
                  </p>
                  <p className="text-text-muted text-[13px] mt-1 leading-relaxed">
                    {isIOS
                      ? 'Tap the Share button below, then "Add to Home Screen"'
                      : 'Get reminders and read offline'}
                  </p>
                </div>
              </div>

              {isIOS ? (
                /* iOS: just a dismiss button — user follows manual steps */
                <button
                  onClick={dismiss}
                  className="w-full border-2 border-gray-200 text-text-muted rounded-pill py-3.5 text-[14px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Got it
                </button>
              ) : (
                /* Android/Chrome: trigger native prompt */
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleInstall}
                    className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark active:scale-[0.97] transition-all"
                    style={{ background: '#5B4FCF' }}
                  >
                    Add to Home Screen
                  </button>
                  <button
                    onClick={dismiss}
                    className="w-full border-2 border-gray-200 text-text-muted rounded-pill py-3.5 text-[14px] font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}