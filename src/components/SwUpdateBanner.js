'use client'

// ── src/components/SwUpdateBanner.js ──
// Shows a gentle banner when a new version of the app is available (new SW installed).
// Lets the user refresh to get the update without disrupting their session.
// Listens for the 'dw-sw-update-ready' event dispatched by sw-register.js.

import { useState, useEffect } from 'react'
import { RefreshCw, X }        from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SwUpdateBanner() {
  const [registration, setRegistration] = useState(null)
  const [dismissed,    setDismissed]    = useState(false)

  useEffect(() => {
    const handleUpdate = (e) => {
      setRegistration(e.detail?.registration || null)
      setDismissed(false)
    }
    window.addEventListener('dw-sw-update-ready', handleUpdate)
    return () => window.removeEventListener('dw-sw-update-ready', handleUpdate)
  }, [])

  function handleRefresh() {
    if (registration?.waiting) {
      // Tell the waiting SW to take over
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    // Reload after a tick so the new SW activates
    setTimeout(() => window.location.reload(), 200)
  }

  const visible = !!registration && !dismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-3 text-white"
          style={{ background: '#5B4FCF', maxWidth: 430, margin: '0 auto' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <RefreshCw size={15} />
            <p className="text-[13px] font-semibold truncate">
              A new version of Daily Walk is ready
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="text-[12px] font-bold bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors"
            >
              Update
            </button>
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}