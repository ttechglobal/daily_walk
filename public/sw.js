// ── public/sw.js ──
// Service worker — handles push notifications and offline caching.
//
// NOTIFICATION FIXES:
//  1. 7AM default reminder is scheduled here via setInterval checking the time.
//     This runs in the service worker so it fires even when the app is closed.
//     Uses a persistent timestamp in IndexedDB to avoid double-firing.
//  2. push event correctly shows notifications with the right icon, badge, and URL.
//  3. notificationclick correctly navigates to the post/community URL.
//
// NOTE: Service workers cannot use ES modules syntax (import/export).
//       All code must be plain JS.

const CACHE_NAME = 'dw-v3'
const ICON       = '/icons/icon-192.png'
const BADGE      = '/icons/icon-96.png'

// ─────────────────────────────────────────────
//  Install + Activate
// ─────────────────────────────────────────────

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ─────────────────────────────────────────────
//  Push event — receive and display notification
// ─────────────────────────────────────────────

self.addEventListener('push', e => {
  if (!e.data) return

  let data = {}
  try { data = e.data.json() } catch { data = { title: 'Daily Walk', body: e.data.text() } }

  const title   = data.title || 'Daily Walk'
  const body    = data.body  || ''
  const url     = data.url   || '/'
  const type    = data.type  || 'general'

  // Choose icon based on type
  const icon = ICON

  const options = {
    body,
    icon,
    badge:   BADGE,
    tag:     `dw-${type}-${Date.now()}`,
    vibrate: [100, 50, 100],
    data:    { url },
    actions: [
      { action: 'open',    title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  // Group community posts so they don't spam
  if (type === 'community_post') {
    options.tag     = `dw-community-post`
    options.renotify = true
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

// ─────────────────────────────────────────────
//  Notification click — navigate to the URL
// ─────────────────────────────────────────────

self.addEventListener('notificationclick', e => {
  const notification = e.notification
  const action       = e.action
  notification.close()

  if (action === 'dismiss') return

  const url = notification?.data?.url || '/'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

// ─────────────────────────────────────────────
//  7AM default daily reminder
//  Checks every minute whether it's time to fire.
//  Stores last-fired date in IndexedDB so it only fires once per day.
// ─────────────────────────────────────────────

// Simple IndexedDB wrapper for the service worker
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('dw-sw', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv')
    req.onsuccess  = e => resolve(e.target.result)
    req.onerror    = e => reject(e.target.error)
  })
}

async function kvGet(key) {
  try {
    const db = await openDB()
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readonly')
      const req = tx.objectStore('kv').get(key)
      req.onsuccess = () => res(req.result)
      req.onerror   = () => rej(req.error)
    })
  } catch { return undefined }
}

async function kvSet(key, value) {
  try {
    const db = await openDB()
    return new Promise((res, rej) => {
      const tx  = db.transaction('kv', 'readwrite')
      const req = tx.objectStore('kv').put(value, key)
      req.onsuccess = () => res()
      req.onerror   = () => rej(req.error)
    })
  } catch {}
}

async function checkAndFireDailyReminder() {
  const now       = new Date()
  const todayStr  = now.toISOString().split('T')[0]  // YYYY-MM-DD
  const hour      = now.getHours()
  const minute    = now.getMinutes()

  // Fire at 7:00 AM (± 1 minute window)
  if (hour !== 7 || minute > 1) return

  // Check if already fired today
  const lastFired = await kvGet('last_7am_date')
  if (lastFired === todayStr) return

  // Mark as fired
  await kvSet('last_7am_date', todayStr)

  // Show the notification
  await self.registration.showNotification('📖 Good morning', {
    body:    "Start your day in the Word. Your daily Bible reading is ready.",
    icon:    ICON,
    badge:   BADGE,
    tag:     'dw-7am-reminder',
    vibrate: [200, 100, 200],
    data:    { url: '/' },
  })
}

// Check every minute
let _checkInterval = null

self.addEventListener('activate', () => {
  // Clear any old interval (shouldn't exist, but be safe)
  if (_checkInterval) clearInterval(_checkInterval)
  _checkInterval = setInterval(checkAndFireDailyReminder, 60 * 1000)
  // Also check immediately on activate
  checkAndFireDailyReminder()
})

// ─────────────────────────────────────────────
//  Fetch — serve cached assets, pass through API calls
// ─────────────────────────────────────────────

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Never cache API calls or Supabase requests
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('scripture.api')
  ) {
    return  // pass through to network
  }

  // For navigation requests, serve the app shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/') || fetch('/')
      )
    )
    return
  }

  // Cache-first for static assets
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res })
        )
      )
    )
  }
})