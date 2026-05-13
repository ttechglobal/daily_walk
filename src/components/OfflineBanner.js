'use client'

// ── OfflineBanner ──
// Must only render client-side — navigator.onLine doesn't exist on server.
// Uses suppressHydrationWarning + mounted guard to avoid hydration mismatch.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, X } from 'lucide-react'

export default function OfflineBanner() {
  const [mounted,   setMounted]   = useState(false)
  const [isOnline,  setIsOnline]  = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsOnline(navigator.onLine)

    const on  = () => { setIsOnline(true);  setDismissed(false) }
    const off = () =>   setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Render nothing until mounted — avoids server/client mismatch
  if (!mounted) return null

  return (
    <AnimatePresence>
      {!isOnline && !dismissed && (
        <motion.div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[200]"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <div className="flex items-center justify-between px-4"
            style={{ background: '#E8A838', height: 36 }}>
            <div className="flex items-center gap-2">
              <WifiOff size={14} className="text-white" />
              <p className="text-white text-[12px] font-semibold">
                You're offline — reading and check-ins still work
              </p>
            </div>
            <button onClick={() => setDismissed(true)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}