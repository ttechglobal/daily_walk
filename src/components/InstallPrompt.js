'use client'

// ── InstallPrompt — rebuilt from scratch ──
// Listens for custom 'pwa-installable' event (set by lib/pwa.js at module level).
// Shows after 10s on Android/Chrome, 15s on iOS.
// Never shows if already installed or previously dismissed.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share, X } from 'lucide-react'
import { BibleIcon } from './icons/BibleIcon'

export default function InstallPrompt() {
  const [show,  setShow]  = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Already installed or dismissed — never show
    try {
      if (localStorage.getItem('dw_pwa_installed') === 'true') return
      if (localStorage.getItem('dw_install_dismissed') === 'true') return
    } catch {}

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // iOS doesn't fire beforeinstallprompt — show instructions after 15s
      const t = setTimeout(() => setShow(true), 15_000)
      return () => clearTimeout(t)
    }

    // Android/Chrome — wait for our custom pwa-installable event
    let timer = null
    const onInstallable = () => {
      timer = setTimeout(() => setShow(true), 10_000)
    }
    window.addEventListener('pwa-installable', onInstallable)
    return () => {
      window.removeEventListener('pwa-installable', onInstallable)
      if (timer) clearTimeout(timer)
    }
  }, [])

  async function handleInstall() {
    try {
      const { getInstallPrompt, clearInstallPrompt } = await import('../lib/pwa')
      const prompt = getInstallPrompt()
      if (!prompt) return
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        try { localStorage.setItem('dw_pwa_installed', 'true') } catch {}
      }
      clearInstallPrompt()
    } catch {}
    setShow(false)
  }

  function handleDismiss() {
    try { localStorage.setItem('dw_install_dismissed', 'true') } catch {}
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 z-[80]"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={handleDismiss}
          />
          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[90]"
            initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', stiffness:340, damping:36 }}>
            <div className="bg-white rounded-t-[28px] shadow-2xl px-5 pt-5 pb-10">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <button onClick={handleDismiss}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200">
                <X size={15} />
              </button>

              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background:'#5B4FCF' }}>
                  <BibleIcon size={28} />
                </div>
                <div>
                  <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Add Daily Walk to your home screen</p>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color:'#6B7280' }}>
                    {isIOS
                      ? 'Tap the Share button below, then "Add to Home Screen"'
                      : 'Read offline, get reminders, feel at home'}
                  </p>
                </div>
              </div>

              {isIOS ? (
                <button onClick={handleDismiss}
                  className="w-full border-2 border-gray-200 rounded-pill py-3.5 text-[14px] font-semibold"
                  style={{ color:'#6B7280' }}>
                  Got it
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={handleInstall}
                    className="w-full text-white rounded-pill py-4 text-[15px] font-bold active:scale-[0.97] transition-all"
                    style={{ background:'#5B4FCF', boxShadow:'0 4px 16px rgba(91,79,207,0.35)' }}>
                    Add to Home Screen
                  </button>
                  <button onClick={handleDismiss}
                    className="w-full border-2 border-gray-200 rounded-pill py-3.5 text-[14px] font-semibold"
                    style={{ color:'#6B7280' }}>
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