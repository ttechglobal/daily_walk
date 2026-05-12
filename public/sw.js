// ── Daily Walk — Service Worker ──
// NetworkFirst for pages, CacheFirst for Bible passages and static assets.
// Push notifications and offline fallback supported.

const CACHE_NAME   = 'daily-walk-v2'
const OFFLINE_URL  = '/offline'
const BIBLE_CACHE  = 'bible-passages-v1'
const STATIC_CACHE = 'static-assets-v1'
const IMAGE_CACHE  = 'hero-images-v1'

// Pre-cache on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([OFFLINE_URL, '/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-96.png'])
    )
  )
  self.skipWaiting()
})

// Clear stale caches on activate
self.addEventListener('activate', event => {
  const KEEP = [CACHE_NAME, BIBLE_CACHE, STATIC_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = event.request.url

  // Bible API — CacheFirst, 365 days (passages never change)
  if (url.includes('bible-api.com')) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch {
          return new Response(JSON.stringify({ error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }
      })
    )
    return
  }

  // Static assets — CacheFirst
  if (url.includes('/_next/static/') || url.includes('/icons/') || url.includes('/manifest.json')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // Hero images — CacheFirst, 7 days
  if (url.includes('images.unsplash.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch { return cached || new Response('', { status: 503 }) }
      })
    )
    return
  }

  // Pages — NetworkFirst with 3s timeout, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()))
          }
          return response
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]).catch(async () => {
        const cached = await caches.match(event.request)
        return cached || caches.match(OFFLINE_URL)
      })
    )
    return
  }
})

// Notification click — focus or open app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})

// Push events — for future Supabase integration
self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body:     data.body,
        icon:     '/icons/icon-192.png',
        badge:    '/icons/icon-96.png',
        vibrate:  [100, 50, 100],
        tag:      'daily-walk',
        renotify: true,
        data:     { url: data.url || '/' }
      })
    )
  } catch {}
})