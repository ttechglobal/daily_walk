// ── lib/config.js — App URL configuration ──
// All share links and deep links use this — never hardcoded domains.

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

export function createShareUrl(path) {
  return `${APP_URL}${path}`
}