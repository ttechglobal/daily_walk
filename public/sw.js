// Daily Walk — Service Worker
// Handles offline caching with a NetworkFirst strategy.
// Registered manually via public/sw-register.js (loaded in layout).

const CACHE_NAME = 'daily-walk-v1'
const OFFLINE_URL = '/offline'

// On install: cache the offline fallback page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([OFFLINE_URL, '/', '/manifest.json', '/icons/icon-192.png'])
    )
  )
  self.skipWaiting()
})

// On activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: NetworkFirst — serve from network, fall back to cache, then offline page
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or Unsplash images
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached
          // For navigation requests, return the offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
          }
        })
      )
  )
})

// Show notifications (triggered by lib/notifications.js)
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})