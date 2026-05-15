// ── lib/notifications.js — Complete notification system ──
// Local notifications (Web Notifications API) + push (VAPID).
// Daily reminder, streaks, community activity, comments/likes.
// SSR-safe: all window/navigator access is guarded.

// ─────────────────────────────────────────────
//  Permission
// ─────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unavailable'
  return Notification.permission  // 'default' | 'granted' | 'denied'
}

// ─────────────────────────────────────────────
//  Core local notification sender
// ─────────────────────────────────────────────

export function sendLocalNotification(title, body, {
  icon    = '/icons/icon-192.png',
  badge   = '/icons/icon-96.png',
  tag     = 'daily-walk',
  url     = '/',
  vibrate = [100, 50, 100],
} = {}) {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      vibrate,
      data: { url },
    })
  }).catch(() => null)
}

// ─────────────────────────────────────────────
//  Daily reading reminder — scheduled via setTimeout chain
// ─────────────────────────────────────────────

let _reminderTimer = null

export function scheduleDailyReminder(hour = 8, minute = 0) {
  if (typeof window === 'undefined') return
  clearDailyReminder()

  try {
    localStorage.setItem('dw_reminder_hour',   String(hour))
    localStorage.setItem('dw_reminder_minute', String(minute))
    localStorage.setItem('dw_reminder_enabled','true')
  } catch {}

  function scheduleNext() {
    const now   = new Date()
    const next  = new Date()
    next.setHours(hour, minute, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)  // schedule for tomorrow if today's time passed

    const msUntil = next.getTime() - now.getTime()

    _reminderTimer = setTimeout(() => {
      const settings = getNotificationSettings()
      // Don't fire if user already checked in today
      const checkins = (() => { try { return JSON.parse(localStorage.getItem('dw_checkins') || '[]') } catch { return [] } })()
      const today    = new Date().toISOString().split('T')[0]
      const alreadyRead = checkins.some(c => c.date?.startsWith(today) || c.createdAt?.startsWith(today))

      if (!alreadyRead && settings.dailyReminder) {
        sendLocalNotification(
          '📖 Time to read your Bible',
          "Your daily walk is waiting. Even one verse changes your day.",
          { tag: 'daily-reminder', url: '/read' }
        )
      }

      scheduleNext()  // re-schedule for same time tomorrow
    }, msUntil)
  }

  scheduleNext()
}

export function clearDailyReminder() {
  if (_reminderTimer) { clearTimeout(_reminderTimer); _reminderTimer = null }
  try { localStorage.setItem('dw_reminder_enabled', 'false') } catch {}
}

// Re-register reminder on app open (survives page reload)
export function initDailyReminder() {
  if (typeof window === 'undefined') return
  try {
    const enabled = localStorage.getItem('dw_reminder_enabled') === 'true'
    const hour    = parseInt(localStorage.getItem('dw_reminder_hour')   || '8')
    const minute  = parseInt(localStorage.getItem('dw_reminder_minute') || '0')
    if (enabled && getPermissionStatus() === 'granted') {
      scheduleDailyReminder(hour, minute)
    }
  } catch {}
}

// ─────────────────────────────────────────────
//  Streak notifications
// ─────────────────────────────────────────────

export function sendStreakNotification(streakCount) {
  if (!getNotificationSettings().streakAlerts) return

  const messages = {
    1:  "Day 1 — a great start. See you tomorrow!",
    3:  "3 days in a row 🔥 You're building a habit.",
    7:  "One week streak! 🏆 God is pleased with your faithfulness.",
    14: "Two weeks strong 💪 Keep walking daily.",
    21: "21 days — that's a habit formed. Well done!",
    30: "30-day streak 🎉 A whole month of daily reading!",
    60: "60 days! You're in the top 1% of Bible readers.",
    100:"100-day streak 🙌 This is extraordinary. Keep going!",
  }

  const msg = messages[streakCount] ||
    (streakCount % 10 === 0 ? `${streakCount} day streak! Keep it up! 🔥` : null)

  if (msg) {
    sendLocalNotification(`🔥 ${streakCount} day streak!`, msg, { tag:'streak', url:'/' })
    addAppNotification({ type:'streak', title:`${streakCount} day streak!`, body: msg, url:'/' })
  }
}

// ─────────────────────────────────────────────
//  Community notifications
// ─────────────────────────────────────────────

export function sendNewPostNotification(communityName, authorName, postPreview) {
  if (!getNotificationSettings().communityActivity) return
  const body = `${authorName}: "${postPreview.slice(0, 80)}"`
  sendLocalNotification(`💬 ${communityName}`, body, { tag:`post-${Date.now()}`, url:'/communities' })
  addAppNotification({ type:'community_post', title: communityName, body, url:'/communities' })
}

export function sendCommentNotification(commenterName, postPreview) {
  if (!getNotificationSettings().commentsLikes) return
  const body = `${commenterName} commented on your post`
  sendLocalNotification('💬 New comment', body, { tag:`comment-${Date.now()}`, url:'/communities' })
  addAppNotification({ type:'comment', title:'New comment', body, url:'/communities' })
}

export function sendLikeNotification(likerName, postPreview) {
  if (!getNotificationSettings().commentsLikes) return
  const body = `${likerName} liked your post`
  sendLocalNotification('❤️ New like', body, { tag:`like-${Date.now()}`, url:'/communities' })
  addAppNotification({ type:'like', title:'New like', body, url:'/communities' })
}

export function sendNewMemberNotification(communityName, memberName) {
  if (!getNotificationSettings().communityActivity) return
  const body = `${memberName} joined ${communityName}`
  sendLocalNotification('👋 New member', body, { tag:`member-${Date.now()}`, url:'/communities' })
  addAppNotification({ type:'new_member', title:'New member', body, url:'/communities' })
}

// ─────────────────────────────────────────────
//  Weekly summary
// ─────────────────────────────────────────────

let _weeklyTimer = null

export function scheduleWeeklySummary() {
  if (typeof window === 'undefined') return
  if (_weeklyTimer) clearTimeout(_weeklyTimer)

  // Fire every Sunday at 9am
  function nextSunday9am() {
    const now  = new Date()
    const next = new Date()
    next.setHours(9, 0, 0, 0)
    const dayOfWeek = next.getDay()  // 0 = Sunday
    const daysUntil = (7 - dayOfWeek) % 7 || 7
    next.setDate(next.getDate() + daysUntil)
    return next.getTime() - now.getTime()
  }

  _weeklyTimer = setTimeout(() => {
    sendWeeklySummary()
    scheduleWeeklySummary()  // re-schedule
  }, nextSunday9am())
}

export function sendWeeklySummary() {
  if (!getNotificationSettings().weeklySummary) return
  try {
    const checkins = JSON.parse(localStorage.getItem('dw_checkins') || '[]')
    const streak   = JSON.parse(localStorage.getItem('dw_streak')   || '{}')
    const plans    = JSON.parse(localStorage.getItem('dw_plans')    || '[]')
    const active   = plans.filter(p => p.status === 'active').length

    const daysThisWeek = checkins.filter(c => {
      const d = new Date(c.date || c.createdAt)
      return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
    }).length

    const msg = daysThisWeek >= 7
      ? `Perfect week! 7/7 days read 🎉`
      : `You read ${daysThisWeek}/7 days this week. ${active ? `${active} plan${active>1?'s':''} active.` : ''} Let's do better!`

    sendLocalNotification('📊 Weekly summary', msg, { tag:'weekly', url:'/' })
    addAppNotification({ type:'weekly', title:'Weekly Summary', body: msg, url:'/' })
  } catch {}
}

// ─────────────────────────────────────────────
//  Push subscription (VAPID)
// ─────────────────────────────────────────────

export async function subscribeToPush() {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  try {
    const reg    = await navigator.serviceWorker.ready
    const vapid  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) return null

    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    })

    // Save subscription to server with user_id
    const uid = (() => { try { const u=localStorage.getItem('dw_user'); return u?JSON.parse(u)?.id||null:null } catch { return null } })()
    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription: sub, userId: uid }),
    }).catch(() => null)

    return sub
  } catch (e) {
    console.warn('[Push] subscribe failed:', e.message)
    return null
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  const array   = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i)
  return array
}

// ─────────────────────────────────────────────
//  In-app notification bell
// ─────────────────────────────────────────────

function readNotifications() {
  try { return JSON.parse(localStorage.getItem('dw_app_notifications') || '[]') } catch { return [] }
}
function writeNotifications(n) {
  try { localStorage.setItem('dw_app_notifications', JSON.stringify(n.slice(0, 50))) } catch {}
}

export function addAppNotification({ type, title, body, url = '/' }) {
  const n = readNotifications()
  writeNotifications([{
    id:        `n_${Date.now()}`,
    type,
    title,
    body,
    url,
    read:      false,
    createdAt: new Date().toISOString(),
  }, ...n])
}

export const getAppNotifications = () => readNotifications()
export const markAllRead         = () => writeNotifications(readNotifications().map(n => ({ ...n, read: true })))
export const markRead            = (id) => writeNotifications(readNotifications().map(n => n.id === id ? { ...n, read: true } : n))
export const getUnreadCount      = () => readNotifications().filter(n => !n.read).length

// ─────────────────────────────────────────────
//  Notification settings
// ─────────────────────────────────────────────

export function getNotificationSettings() {
  try {
    const s = localStorage.getItem('dw_notification_settings')
    return s ? JSON.parse(s) : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

export function saveNotificationSettings(settings) {
  try { localStorage.setItem('dw_notification_settings', JSON.stringify(settings)) } catch {}
}

const DEFAULT_SETTINGS = {
  dailyReminder:     true,
  reminderHour:      8,
  reminderMinute:    0,
  streakAlerts:      true,
  communityActivity: true,
  commentsLikes:     true,
  weeklySummary:     true,
}


// ─────────────────────────────────────────────
//  Server-side push — fires even when app is closed
//  Calls /api/push/send which delegates to Supabase Edge Function
// ─────────────────────────────────────────────

export async function serverPush(payload) {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
  } catch { /* non-blocking */ }
}

// Fire server-side push to all community members
export async function notifyCommunityPost(communityId, communityName, authorName, postContent, excludeUserId) {
  await serverPush({
    type:        'community_post',
    communityId,
    excludeUser: excludeUserId,
    title:       `${communityName}`,
    body:        `${authorName}: "${postContent.slice(0, 80)}"`,
    url:         `/communities/${communityId}`,
  })
}

// Fire server-side push to post author
export async function notifyComment(postAuthorId, commenterName, postPreview) {
  await serverPush({
    type:   'comment',
    userId: postAuthorId,
    title:  '💬 New comment on your post',
    body:   `${commenterName} commented: "${postPreview.slice(0, 60)}"`,
    url:    '/communities',
  })
}

export async function notifyLike(postAuthorId, likerName, postPreview) {
  await serverPush({
    type:   'like',
    userId: postAuthorId,
    title:  '❤️ Someone liked your post',
    body:   `${likerName} liked: "${postPreview.slice(0, 60)}"`,
    url:    '/communities',
  })
}

// ─────────────────────────────────────────────
//  Init — call once on app load
// ─────────────────────────────────────────────

export function initNotifications() {
  if (typeof window === 'undefined') return
  initDailyReminder()
  scheduleWeeklySummary()
}

// Shortcuts
export const sendChallengeNudge        = (title) => sendLocalNotification('Challenge', `Don't forget: "${title}"`, { tag:'challenge' })
export const sendMilestoneNotification = (msg)   => sendLocalNotification('Daily Walk', msg, { tag:'milestone' })

export const NOTIFICATION_TYPES = {
  STREAK:           'streak',
  DAILY_REMINDER:   'daily_reminder',
  COMMUNITY_POST:   'community_post',
  COMMENT:          'comment',
  LIKE:             'like',
  NEW_MEMBER:       'new_member',
  WEEKLY:           'weekly',
}