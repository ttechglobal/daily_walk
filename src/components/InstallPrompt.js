'use client'

// ── InstallPrompt — shows after first check-in (feels earned) ──
// iOS: shows Share → Add to Home Screen instructions
// Android/Chrome: native install prompt via beforeinstallprompt

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { BibleIcon } from './icons/BibleIcon'

export default function InstallPrompt() {
  const [show,  setShow]  = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Never show if already installed or dismissed
    try {
      if (localStorage.getItem('dw_pwa_installed')   === 'true') return
      if (localStorage.getItem('dw_install_dismissed') === 'true') return
    } catch {}

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
                !/crios|fxios/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // On iOS, show after first check-in via custom event
      const onCheckin = () => setTimeout(() => setShow(true), 3000)
      window.addEventListener('dw-first-checkin', onCheckin)
      return () => window.removeEventListener('dw-first-checkin', onCheckin)
    }

    // Android/Chrome — wait for installable + first check-in
    let ready = false
    const onInstallable = () => { ready = true }
    const onCheckin     = () => { if (ready) setTimeout(() => setShow(true), 3000) }
    window.addEventListener('pwa-installable',  onInstallable)
    window.addEventListener('dw-first-checkin', onCheckin)
    return () => {
      window.removeEventListener('pwa-installable',  onInstallable)
      window.removeEventListener('dw-first-checkin', onCheckin)
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
          <motion.div className="fixed inset-0 bg-black/25 z-[80]"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={handleDismiss} />
          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[90]"
            initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', stiffness:340, damping:36 }}>
            <div className="bg-white rounded-t-[28px] px-5 pt-5 pb-10 shadow-2xl">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <button onClick={handleDismiss}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                style={{ color:'#6B7280' }}>
                <X size={15} />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                  style={{ background:'#5B4FCF' }}>
                  <img src="/icons/icon-192.png" alt="Daily Walk" width={56} height={56} />
                </div>
                <div>
                  <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>
                    Add Daily Walk to your home screen
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>
                    {isIOS
                      ? 'Tap the share icon below, then "Add to Home Screen"'
                      : 'Read offline · Get reminders · Feel at home'}
                  </p>
                </div>
              </div>

              {isIOS ? (
                // iOS instructions
                <div className="flex flex-col gap-3 mb-4 p-4 rounded-[16px]"
                  style={{ background:'#F5F5F5' }}>
                  {[
                    { step:'1', text:'Tap the Share button at the bottom of your browser' },
                    { step:'2', text:'Scroll down and tap "Add to Home Screen"' },
                    { step:'3', text:'Tap "Add" in the top right corner' },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ background:'#5B4FCF' }}>{s.step}</div>
                      <p className="text-[13px]" style={{ color:'#1A1A2E' }}>{s.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2 text-white rounded-full py-4 text-[15px] font-bold mb-3 hover:opacity-90 active:scale-[0.97] transition-all"
                  style={{ background:'#5B4FCF', boxShadow:'0 4px 16px rgba(91,79,207,0.35)' }}>
                  <Download size={18} /> Add to Home Screen
                </button>
              )}

              <button onClick={handleDismiss}
                className="w-full border-2 rounded-full py-3 text-[14px] font-semibold"
                style={{ borderColor:'#E5E7EB', color:'#9CA3AF' }}>
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}