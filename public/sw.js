// ── Daily Walk Service Worker v3 ──
// Strategy: pre-cache all app routes on install, CacheFirst for Bible,
// NetworkFirst with offline fallback for pages.

const APP_VERSION   = 'v3'
const SHELL_CACHE   = `shell-${APP_VERSION}`
const BIBLE_CACHE   = 'bible-passages'   // never versioned — permanent
const STATIC_CACHE  = `static-${APP_VERSION}`
const IMAGE_CACHE   = `images-${APP_VERSION}`

// App shell — pre-cached on install so app loads offline immediately
const SHELL_URLS = [
  '/',
  '/checkin',
  '/plans',
  '/communities',
  '/profile',
  '/manifest.json',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install: pre-cache app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(err => {
        // Don't fail install if some shell URLs 404 (e.g. /offline page not yet built)
        console.log('[SW] Shell pre-cache partial:', err)
      }))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  const KEEP = [SHELL_CACHE, BIBLE_CACHE, STATIC_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Bible API — CacheFirst, permanent (passages never change)
  if (url.hostname === 'bible-api.com') {
    event.respondWith(cacheFirst(event.request, BIBLE_CACHE, 365))
    return
  }

  // Static assets — CacheFirst
  if (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/characters/') ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/app-icon.png') {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE, 30))
    return
  }

  // Fonts & images — CacheFirst
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('images.unsplash.com')) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE, 7))
    return
  }

  // App pages — NetworkFirst with 3s timeout, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(event.request))
    return
  }
})

// ── Strategies ──

async function cacheFirst(request, cacheName, maxAgeDays) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const clone = response.clone()
      cache.put(request, clone)
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

async function networkFirstWithFallback(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // Try root as fallback (SPA routing)
    const root = await cache.match('/')
    if (root) return root
    return new Response('<h1>You are offline</h1>', {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// ── Push notifications ──
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus()
      return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})

self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body:    data.body,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-96.png',
        vibrate: [100, 50, 100],
        tag:     'daily-walk',
        data:    { url: data.url || '/' }
      })
    )
  } catch {}
})