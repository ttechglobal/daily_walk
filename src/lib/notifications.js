// ─────────────────────────────────────────────────────────────
//  lib/notifications.js — All notification logic (Part 3)
//  SSR-safe: every function guards typeof window !== 'undefined'
// ─────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  DAILY_REMINDER:         'daily_reminder',
  STREAK_ENCOURAGEMENT:   'streak_encouragement',
  CHALLENGE_NUDGE:        'challenge_nudge',
  MILESTONE:              'milestone',
}

/** Request browser notification permission. Returns true if granted. */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/** Show a notification via the service worker (works when page is backgrounded). */
export function sendLocalNotification(title, body, icon = '/icons/icon-192.png') {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(sw => {
        sw.showNotification(title, {
          body,
          icon,
          badge: '/icons/icon-96.png',
          vibrate: [100, 50, 100],
          tag: 'daily-walk',
          renotify: true,
        })
      })
      .catch(() => {
        // Fallback: direct Notification if SW not available
        new Notification(title, { body, icon })
      })
  } else {
    new Notification(title, { body, icon })
  }
}

/**
 * Schedule a daily reminder notification at the given hour:minute (24h).
 * Timer is stored in localStorage so it can be re-registered after reload.
 * Timers survive navigation but are lost on full page reload — call this
 * again on app mount if dailyReminder is enabled (handled in layout).
 */
export function scheduleDailyReminder(hour, minute) {
  if (typeof window === 'undefined') return

  // Clear any existing scheduled timer
  clearDailyReminder()

  const now  = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const delay = next.getTime() - now.getTime()

  const timerId = setTimeout(() => {
    sendLocalNotification(
      'Time with God',
      'Have you read your Bible today? Your streak is waiting.',
    )
    // Re-schedule for same time tomorrow
    scheduleDailyReminder(hour, minute)
  }, delay)

  try {
    localStorage.setItem('dw_reminder_timer_id', String(timerId))
  } catch {}
}

/** Clear any scheduled daily reminder timer. */
export function clearDailyReminder() {
  if (typeof window === 'undefined') return
  try {
    const id = localStorage.getItem('dw_reminder_timer_id')
    if (id) clearTimeout(Number(id))
    localStorage.removeItem('dw_reminder_timer_id')
  } catch {}
}

/**
 * Send a streak milestone notification.
 * Only fires at meaningful milestones — function handles the filtering.
 */
export function sendStreakNotification(streakCount) {
  const messages = {
    3:   "3 days in a row! You're building something beautiful.",
    7:   "One full week! Your consistency is inspiring.",
    14:  "Two weeks strong! Keep walking with God daily.",
    30:  "30 days! You've built a real habit. Well done.",
    100: "100 days! This is extraordinary faithfulness.",
  }
  const message = messages[streakCount]
  if (message) {
    sendLocalNotification(`${streakCount}-Day Streak`, message)
  }
}

/** Send a nudge for a specific challenge. */
export function sendChallengeNudge(challengeTitle) {
  sendLocalNotification(
    'Challenge reminder',
    `Don't forget your "${challengeTitle}" challenge today.`,
  )
}

/** Send a generic milestone notification. */
export function sendMilestoneNotification(message) {
  sendLocalNotification('Daily Walk', message)
}

/** Read notification settings from localStorage. */
export function getNotificationSettings() {
  try {
    const raw = localStorage.getItem('dw_notification_settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    dailyReminder:   false,
    hour:            7,
    minute:          0,
    streakAlerts:    true,
    challengeNudges: false,
  }
}

/** Write notification settings to localStorage. */
export function saveNotificationSettings(settings) {
  try {
    localStorage.setItem('dw_notification_settings', JSON.stringify(settings))
  } catch {}
}

// ─────────────────────────────────────────────────────────────
//  In-app notification store (dw_notifications in localStorage)
// ─────────────────────────────────────────────────────────────

function readNotifications() {
  try { const r = localStorage.getItem('dw_notifications'); return r ? JSON.parse(r) : [] } catch { return [] }
}
function writeNotifications(n) {
  try { localStorage.setItem('dw_notifications', JSON.stringify(n)) } catch {}
}

export function addAppNotification({ type, title, body, url = '/' }) {
  if (typeof window === 'undefined') return
  const n = {
    id:        `notif_${Date.now()}`,
    type,
    title,
    body,
    url,
    read:      false,
    createdAt: new Date().toISOString(),
  }
  writeNotifications([n, ...readNotifications().slice(0, 49)]) // keep max 50
}

export function getAppNotifications() {
  return readNotifications()
}

export function markAllRead() {
  writeNotifications(readNotifications().map(n => ({ ...n, read: true })))
}

export function markRead(id) {
  writeNotifications(readNotifications().map(n => n.id === id ? { ...n, read: true } : n))
}

export function getUnreadCount() {
  return readNotifications().filter(n => !n.read).length
}

// ─────────────────────────────────────────────────────────────
//  Push subscription registration
// ─────────────────────────────────────────────────────────────

export async function subscribeToPush() {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidKey     = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey || vapidKey === 'your_vapid_public_key') return false

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: vapidKey,
    })

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription }),
    })

    return true
  } catch { return false }
}