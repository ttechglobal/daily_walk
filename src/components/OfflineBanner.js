'use client'

// ── OfflineBanner — Update 3c ──
// Slides down from top when offline. Amber background. Dismissible per session.
// Reappears on next visit if still offline.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, X } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const isOnline    = useOnlineStatus()
  const [dismissed, setDismiss] = useState(false)

  // Reset dismissal when connection is restored
  if (isOnline && dismissed) setDismiss(false)

  return (
    <AnimatePresence>
      {!isOnline && !dismissed && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[200]"
        >
          <div
            className="flex items-center justify-between px-4"
            style={{ background: '#E8A838', height: 36 }}
          >
            <div className="flex items-center gap-2">
              <WifiOff size={14} className="text-white" />
              <p className="text-white text-[12px] font-semibold">
                You're offline — reading and check-ins still work
              </p>
            </div>
            <button
              onClick={() => setDismiss(true)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}