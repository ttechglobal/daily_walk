// Registers the service worker. Loaded as a <script> in layout.js.
// Only runs in production (SW is skipped in development).
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}