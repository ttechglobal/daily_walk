'use client'

// ── NotificationPanel — slides in from right when bell tapped ──
// Reads from dw_notifications in localStorage.
// Shows unread count badge on bell in home screen header.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, BookOpen, Users, Flame, Map, MessageCircle } from 'lucide-react'
import {
  getAppNotifications, markAllRead, markRead, getUnreadCount
} from '../lib/notifications'

const TYPE_ICONS = {
  community_post: Users,
  checkin:        BookOpen,
  streak:         Flame,
  plan:           Map,
  nudge:          MessageCircle,
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'Just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  if (h < 48)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function NotifItem({ notif, onTap }) {
  const Icon = TYPE_ICONS[notif.type] || Bell
  return (
    <button
      onClick={() => onTap(notif)}
      className="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
      style={{ background: notif.read ? 'transparent' : '#EDE9FF18' }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: notif.read ? '#F5F5F5' : '#EDE9FF' }}>
        <Icon size={16} style={{ color: notif.read ? '#9CA3AF' : '#5B4FCF' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px] leading-snug"
          style={{ color: '#1A1A2E' }}>{notif.title}</p>
        <p className="text-[12px] mt-0.5 line-clamp-2"
          style={{ color: '#6B7280' }}>{notif.body}</p>
        <p className="text-[11px] mt-1"
          style={{ color: '#9CA3AF' }}>{timeAgo(notif.createdAt)}</p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: '#5B4FCF' }} />
      )}
    </button>
  )
}

export function NotificationBell({ onClick, className }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(getUnreadCount())
    // Poll every 10s for new notifications
    const t = setInterval(() => setCount(getUnreadCount()), 10_000)
    return () => clearInterval(t)
  }, [])

  return (
    <button
      onClick={onClick}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors ${className || ''}`}
      style={{ color: '#6B7280' }}
      aria-label="Notifications"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
          style={{ background: '#EF4444' }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

export function NotificationPanel({ onClose }) {
  const router   = useRouter()
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    setNotifs(getAppNotifications())
  }, [])

  function handleMarkAll() {
    markAllRead()
    setNotifs(getAppNotifications())
  }

  function handleTap(notif) {
    markRead(notif.id)
    setNotifs(getAppNotifications())
    onClose()
    if (notif.url) router.push(notif.url)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/30 z-[90]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel slides in from right */}
      <motion.div
        className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-[340px] bg-white z-[100] flex flex-col shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 38 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <p className="font-display font-bold text-[18px]" style={{ color: '#1A1A2E' }}>
            Notifications
          </p>
          <div className="flex items-center gap-2">
            {notifs.some(n => !n.read) && (
              <button onClick={handleMarkAll}
                className="text-[12px] font-semibold"
                style={{ color: '#5B4FCF' }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto scroll-hide divide-y divide-gray-50">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: '#EDE9FF' }}>
                <Bell size={24} style={{ color: '#5B4FCF' }} />
              </div>
              <p className="font-display text-[16px] font-semibold"
                style={{ color: '#1A1A2E' }}>No notifications yet</p>
              <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
                Activity from your communities and plans will appear here.
              </p>
            </div>
          ) : (
            notifs.map(n => (
              <NotifItem key={n.id} notif={n} onTap={handleTap} />
            ))
          )}
        </div>
      </motion.div>
    </>
  )
}