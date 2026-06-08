// ── public/sw.js ──
// Daily Walk service worker — offline-first PWA
//
// Strategy per resource type:
//   App shell (JS, CSS, fonts, icons) → Cache First (install-time)
//   Pages (/, /bible, /plans, etc.)   → Stale While Revalidate
//   Supabase API                       → Network First, 5s timeout
//   Bible JSON files (storage)        → Cache First (IndexedDB handles this too)
//   Everything else                   → Network First
//
// On install: pre-caches all critical app shell assets
// On activate: clears old caches
// On fetch: routes by strategy

const CACHE_VERSION   = 'dw-v4'
const SHELL_CACHE     = `${CACHE_VERSION}-shell`
const PAGES_CACHE     = `${CACHE_VERSION}-pages`
const BIBLE_CACHE     = `${CACHE_VERSION}-bible`

// Critical assets to pre-cache on install
// These make the app work offline from the very first visit
const SHELL_ASSETS = [
  '/',
  '/bible',
  '/plans',
  '/communities',
  '/profile',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon-32.png',
]

// ─────────────────────────────────────────────
//  Install — pre-cache app shell
// ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      // Pre-cache shell assets (best-effort — don't fail install if one is missing)
      const results = await Promise.allSettled(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn(`[sw] pre-cache miss: ${url}`, e.message))
        )
      )
      console.log('[sw] install: shell cached')
      return results
    }).catch(e => console.warn('[sw] install error:', e.message))
  )
  self.skipWaiting()  // activate immediately
})

// ─────────────────────────────────────────────
//  Activate — clean up old caches
// ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('dw-') && !key.startsWith(CACHE_VERSION))
          .map(key => {
            console.log('[sw] deleting old cache:', key)
            return caches.delete(key)
          })
      )
    ).then(() => {
      console.log('[sw] activated, claiming clients')
      return self.clients.claim()
    })
  )
})

// ─────────────────────────────────────────────
//  Fetch — route by strategy
// ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http
  if (!url.protocol.startsWith('http')) return

  // ── Supabase API: Network first, 5s timeout, no cache ──
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    event.respondWith(networkFirstWithTimeout(request, 5000))
    return
  }

  // ── Bible JSON files from Supabase Storage: Cache first ──
  if (url.pathname.includes('/storage/v1/object/public/bible')) {
    event.respondWith(cacheFirstBible(request))
    return
  }

  // ── Next.js static assets (_next/static): Cache first (immutable) ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(request))
    return
  }

  // ── App pages: Stale while revalidate ──
  if (
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // ── Everything else: Network first ──
  event.respondWith(networkFirstWithTimeout(request, 8000))
})

// ─────────────────────────────────────────────
//  Strategies
// ─────────────────────────────────────────────

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function cacheFirstBible(request) {
  const cached = await caches.match(request, { cacheName: BIBLE_CACHE })
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(BIBLE_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(PAGES_CACHE)
  const cached = await cache.match(request)

  // Start a background revalidation (don't await)
  const networkPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  // Return cached immediately if we have it, otherwise wait for network
  if (cached) {
    networkPromise.catch(() => null)  // fire-and-forget
    return cached
  }

  try {
    const response = await networkPromise
    if (response) return response
  } catch {}

  // Both cache and network failed — show offline page
  const offlinePage = await caches.match('/offline')
  return offlinePage || new Response('Offline', { status: 503 })
}

async function networkFirstWithTimeout(request, timeoutMs) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    return response
  } catch {
    // Network failed or timed out — check cache
    const cached = await caches.match(request)
    if (cached) return cached

    const offlinePage = await caches.match('/offline')
    return offlinePage || new Response('Offline', { status: 503 })
  }
}

// ─────────────────────────────────────────────
//  Push notifications (existing handler — preserved)
// ─────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data  = event.data.json()
    const title = data.title || 'Daily Walk'
    const opts  = {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data:  { url: data.url || '/' },
      tag:   data.type || 'general',
    }
    event.waitUntil(self.registration.showNotification(title, opts))
  } catch {}
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})