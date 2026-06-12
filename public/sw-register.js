// ── public/sw-register.js ──
// Registers the Daily Walk service worker.
// Loaded via <Script src="/sw-register.js" strategy="afterInteractive" /> in layout.js.
// NO { type: 'module' } needed — sw.js has zero import statements.

(function () {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (registration) {

        // ── Detect new SW version waiting ──
        registration.addEventListener('updatefound', function () {
          var newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', function () {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version is ready — notify SwUpdateBanner
              window.dispatchEvent(
                new CustomEvent('dw-sw-update-ready', {
                  detail: { registration: registration },
                })
              )
            }
          })
        })

        // ── Reload page after new SW takes over ──
        var refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!refreshing) {
            refreshing = true
            window.location.reload()
          }
        })

        // ── Fire dw-back-online when connection returns ──
        window.addEventListener('online', function () {
          window.dispatchEvent(new Event('dw-back-online'))
        })

      })
      .catch(function (err) {
        // Non-fatal — app works fine without SW, just no offline/push
        console.warn('[SW] Registration failed:', err.message)
      })
  })
})()