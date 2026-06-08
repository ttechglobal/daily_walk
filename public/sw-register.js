// ── public/sw-register.js ──
// Service worker registration — loaded via next/script afterInteractive.
// Registers sw.js from root scope so it controls all pages.
// Handles updates silently.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',  // always check for updated SW
      })

      console.log('[sw-register] registered, scope:', registration.scope)

      // Check for updates on every page load (silent)
      registration.update().catch(() => null)

      // When a new SW is waiting, activate it on next navigation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate on next page load
            console.log('[sw-register] new version available')
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })

      // When SW activates, reload to get fresh assets
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

    } catch (e) {
      console.warn('[sw-register] registration failed:', e.message)
    }
  })
}