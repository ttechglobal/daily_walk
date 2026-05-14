// ── Service worker registration ──
// Loaded via <Script strategy="afterInteractive"> in layout.js

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        console.log('[SW] Registered:', reg.scope)
      })
      .catch(function (err) {
        console.log('[SW] Registration failed:', err)
      })
  })
}