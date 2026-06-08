// ── public/sw-register.js ──
// Service Worker registration — loaded via <Script strategy="afterInteractive">.
// Handles:
//   1. SW registration (points to /sw.js compiled by Serwist)
//   2. Background Sync registration for offline queue drain
//   3. Listening for DW_DRAIN_QUEUE messages from SW
//   4. Prompting on SW update (new version available)

;(function () {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  // ── Register SW ──
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {

    // ── Background Sync: register whenever we go online ──
    // This ensures the SW fires a sync event and drains the offline queue.
    function registerSync() {
      if (!('SyncManager' in window)) return
      registration.sync.register('dw-offline-queue').catch(() => null)
    }

    window.addEventListener('online', () => {
      registerSync()
      // Also fire immediately for any action queued in this session
      window.dispatchEvent(new CustomEvent('dw-back-online'))
    })

    // Register on load in case we just came back online between page loads
    if (navigator.onLine) registerSync()

    // ── Handle SW update (new version deployed) ──
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // A new SW is installed but waiting — dispatch event so UI can show update banner
          window.dispatchEvent(new CustomEvent('dw-sw-update-ready', {
            detail: { registration },
          }))
        }
      })
    })

  }).catch(() => null)

  // ── Listen for messages from SW ──
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'DW_DRAIN_QUEUE') {
      // SW Background Sync told us to drain — import and run
      import('/sw-drain.js').catch(() => {
        // Fallback: dispatch event for AppInit to pick up
        window.dispatchEvent(new CustomEvent('dw-drain-queue'))
      })
    }
  })

})()