// ── src/app/sw.js — Daily Walk Service Worker ──
// This file is the SW *source* — Serwist compiles it into public/sw.js at build time,
// injecting the precache manifest automatically.
//
// What this SW does:
//   1. Precaches the complete app shell (all Next.js JS/CSS chunks + routes)
//   2. Runtime-caches fonts, images, and pages with appropriate strategies
//   3. Serves the /offline page when a navigation fails and no cache is available
//   4. Handles Background Sync for offline queue drain
//   5. Handles push notifications

import { defaultCache } from '@serwist/next/worker'
import { Serwist }      from 'serwist'

// ── BACKGROUND SYNC TAG ──
const SYNC_TAG = 'dw-offline-queue'

// ── Serwist instance ──
// self.__SW_MANIFEST is injected by the build pipeline (Serwist/Workbox precache manifest).
// It contains { url, revision } entries for every static asset Next.js emits.
const serwist = new Serwist({
  precacheEntries:    self.__SW_MANIFEST,
  skipWaiting:        true,      // Activate new SW immediately (no waiting for tabs to close)
  clientsClaim:       true,      // Take control of all open clients immediately
  navigationPreload:  false,     // Disabled — we use NetworkFirst with timeout instead

  // ── Offline fallback ──
  // When a navigation request fails (offline) and the page isn't cached,
  // serve /offline. This MUST be in the precache list (additionalPrecacheEntries in config).
  fallbacks: {
    entries: [
      {
        url:    '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },

  // ── Runtime caching strategies ──
  // Merged with the strategies defined in next.config.js runtimeCaching.
  // The defaultCache from @serwist/next adds sensible defaults for Next.js internals.
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// ── INSTALL event ──
// Force the new SW to take effect without waiting for all tabs to close.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

// ── ACTIVATE event ──
// Clean up old caches from previous SW versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()

      // Delete caches from old versions (anything not matching our current cache names)
      const CURRENT_CACHES = [
        'dw-pages',
        'dw-google-fonts-stylesheets',
        'dw-google-fonts-webfonts',
        'dw-static',
        'dw-images',
        'dw-icons',
        'dw-supabase-storage',
        'serwist-precache-v2',  // Serwist's own precache name
      ]
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(name => !CURRENT_CACHES.some(c => name.startsWith(c)))
          .map(name => caches.delete(name))
      )
    })()
  )
})

// ── SYNC event — Background Sync API ──
// When the browser gains connectivity, it fires a sync event for each registered tag.
// We use this to trigger the offline queue drain in the main thread.
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      // Post a message to all open clients — they'll run drainOfflineQueue()
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'DW_DRAIN_QUEUE' })
        })
      })
    )
  }
})

// ── PUSH event — Push Notifications ──
self.addEventListener('push', (event) => {
  try {
    const data    = event.data?.json() || {}
    const title   = data.title   || 'Daily Walk'
    const body    = data.body    || 'Time to read your Bible 📖'
    const url     = data.url     || '/'
    const tag     = data.type    || 'general'
    const icon    = '/icons/icon-192.png'
    const badge   = '/icons/icon-96.png'

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        data:    { url },
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open',    title: 'Open'    },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      })
    )
  } catch {}
})

// ── NOTIFICATIONCLICK event ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus an existing window if one is open at this origin
      const existing = clients.find(c => c.url.startsWith(self.registration.scope))
      if (existing) {
        existing.focus()
        existing.navigate(url)
      } else {
        self.clients.openWindow(url)
      }
    })
  )
})

// ── MESSAGE event ──
// Handle messages from the main thread (e.g., skip waiting on update).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})