// ── public/sw.js ──
// Daily Walk service worker — v2 clean
//
// NO import statements — this file is served as a plain static file
// from /public and must be self-contained. Using import here requires
// { type: 'module' } registration AND has poor support on older iPhones.
//
// What this SW does:
//   1. Caches the app shell on install (makes iPhone "Add to Home Screen" work offline)
//   2. Serves cached shell while revalidating in background (stale-while-revalidate)
//   3. Handles push notifications (VAPID)
//   4. Opens the right URL on notification click
//   5. Tells the app when a background sync should drain the offline queue
//   6. Handles SKIP_WAITING from SwUpdateBanner

const CACHE_VERSION = 'dw-v2'

// App shell — pages and assets that should always be cached
const SHELL_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install: cache app shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] install cache partial failure:', err.message)
        return self.skipWaiting()
      })
  )
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch: serve from cache, update in background ──
self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  const url = new URL(request.url)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com')
  ) return

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => null)

        return cached || networkFetch || caches.match('/offline')
      })
    )
  )
})

// ── Push: show notification ──
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Daily Walk',
    body:  'Time for your daily reading 📖',
    url:   '/',
    type:  'general',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
  }

  try {
    if (event.data) Object.assign(payload, event.data.json())
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon  || '/icons/icon-192.png',
      badge:   payload.badge || '/icons/icon-96.png',
      tag:     payload.type  || 'daily-walk',
      vibrate: [100, 50, 100],
      data:    { url: payload.url || '/' },
    })
  )
})

// ── Notification click: navigate to URL ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (c) => new URL(c.url).pathname === new URL(targetUrl, self.location.origin).pathname
        )
        if (existing) return existing.focus()
        return clients.openWindow(targetUrl)
      })
  )
})

// ── Background Sync: drain offline queue ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'dw-offline-queue') {
    event.waitUntil(
      clients.matchAll({ includeUncontrolled: true }).then((allClients) => {
        allClients.forEach((c) => c.postMessage({ type: 'DW_DRAIN_QUEUE' }))
      })
    )
  }
})

// ── Message: SKIP_WAITING from SwUpdateBanner ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})