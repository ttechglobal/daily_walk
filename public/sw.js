// ── public/sw.js ──
// Daily Walk service worker — v3
// NO import statements — fully self-contained.

const CACHE_VERSION = 'dw-v3'

// Static assets that definitely exist in /public
// Do NOT include Next.js routes like /offline here — those are
// server-rendered and can't be cached with cache.addAll at install time.
// They get cached automatically on first visit via the fetch handler below.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-96.png',
]

// ── Install: cache static assets individually (never fail install) ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cache each asset independently — one failure won't block the SW
      var promises = STATIC_ASSETS.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[SW] Could not cache ' + url + ':', err.message)
        })
      })
      return Promise.all(promises)
    }).then(function () {
      return self.skipWaiting()
    })
  )
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== CACHE_VERSION })
            .map(function (key) { return caches.delete(key) })
        )
      })
      .then(function () { return self.clients.claim() })
  )
})

// ── Fetch: network first for navigations, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  var request = event.request

  // Only handle GET from our own origin
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  var url = new URL(request.url)

  // Never intercept: API routes, Next.js internals, auth
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/admin')
  ) return

  // For page navigations: network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Cache successful navigations for offline fallback
          if (response.ok) {
            var clone = response.clone()
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(function () {
          // Offline — try cache first, then cached home page
          return caches.match(request)
            .then(function (cached) {
              return cached || caches.match('/')
            })
        })
    )
    return
  }

  // For static assets: cache first, update in background
  event.respondWith(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.match(request).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          if (response.ok) cache.put(request, response.clone())
          return response
        }).catch(function () { return null })

        return cached || networkFetch
      })
    })
  )
})

// ── Push: show notification ──
self.addEventListener('push', (event) => {
  var payload = {
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
  var targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i]
          if (new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname) {
            return client.focus()
          }
        }
        return clients.openWindow(targetUrl)
      })
  )
})

// ── Background Sync: drain offline queue ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'dw-offline-queue') {
    event.waitUntil(
      clients.matchAll({ includeUncontrolled: true }).then(function (allClients) {
        allClients.forEach(function (c) {
          c.postMessage({ type: 'DW_DRAIN_QUEUE' })
        })
      })
    )
  }
})

// ── Message: SKIP_WAITING from SwUpdateBanner ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})