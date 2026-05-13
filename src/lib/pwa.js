// ── lib/pwa.js — PWA install prompt management ──
// deferredPrompt stored at module level so it survives re-renders.
// Register listeners at module load time — not inside React components.

let deferredPrompt = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // CRITICAL — must preventDefault or Chrome swallows it
    deferredPrompt = e
    window.dispatchEvent(new CustomEvent('pwa-installable'))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    try { localStorage.setItem('dw_pwa_installed', 'true') } catch {}
    window.dispatchEvent(new CustomEvent('pwa-installed'))
  })
}

export function getInstallPrompt() { return deferredPrompt }
export function clearInstallPrompt() { deferredPrompt = null }
export function isInstalled() {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem('dw_pwa_installed') === 'true' } catch { return false }
}