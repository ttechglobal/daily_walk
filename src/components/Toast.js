'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Simple toast notification.
 * Usage: import and call window.__showToast?.('message')
 */
export function useToast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    window.__showToast = (msg) => {
      setToast(msg)
      setTimeout(() => setToast(null), 2600)
    }
    return () => { delete window.__showToast }
  }, [])

  return toast
}

export function showToast(msg) {
  window.__showToast?.(msg)
}

export function ToastContainer() {
  const toast = useToast()

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="
            fixed bottom-28 left-1/2 -translate-x-1/2
            bg-text-primary text-white
            px-5 py-3 rounded-pill
            text-sm font-semibold
            shadow-lg z-[200]
            whitespace-nowrap
            pointer-events-none
          "
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
