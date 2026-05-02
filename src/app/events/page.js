'use client'

// ── /events — Events list (Update 3) ──

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, Plus, Calendar, Wifi } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../components/Toast'
import { SEED_EVENTS, EVENT_CATEGORIES, formatEventDate } from '../../lib/constants'

const CAT_STYLES = {
  'Conference':   'bg-purple-light text-purple',
  'Revival':      'bg-amber-light text-amber-700',
  'Prayer Night': 'bg-blue-50 text-blue-600',
  'Bible Study':  'bg-sage-light text-sage',
  'Concert':      'bg-pink-50 text-pink-600',
  'Other':        'bg-gray-100 text-text-muted',
}

const FILTERS = ['Upcoming', 'This Week', 'Online', 'Near Me']

function EventCard({ event, onToggleInterest }) {
  const router = useRouter()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden">
      {/* Tap body → detail */}
      <button className="w-full text-left p-4 flex flex-col gap-2"
        onClick={() => router.push(`/events/${event.id}`)}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-semibold text-text-primary text-[16px] leading-snug flex-1">
            {event.title}
          </p>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${CAT_STYLES[event.category] || CAT_STYLES.Other}`}>
            {event.category}
          </span>
        </div>

        <p className="text-text-muted text-[12px] font-semibold">{event.organiser}</p>

        <div className="flex items-center gap-3 text-[12px] text-text-muted">
          <span className="font-semibold" style={{ color: '#5B4FCF' }}>{formatEventDate(event.date)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
          {event.online
            ? <><Wifi size={12} /><span>Online</span></>
            : <><MapPin size={12} /><span>{event.location}</span></>}
        </div>

        <p className="text-text-primary text-[13px] leading-relaxed line-clamp-2">{event.description}</p>
      </button>

      {/* Interest toggle — separate from navigation */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onToggleInterest(event.id)}
          className={`w-full rounded-pill py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] border-2 ${
            event.interested
              ? 'border-sage bg-sage-light text-sage'
              : 'border-gray-200 bg-white text-text-muted hover:border-purple hover:text-purple'
          }`}
        >
          {event.interested ? (
            <span className="flex items-center justify-center gap-1.5">
              <Calendar size={14} /> Interested ✓
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Calendar size={14} /> I'm interested
            </span>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useLocalStorage('dw_events', SEED_EVENTS)
  const [filter, setFilter] = useState('Upcoming')
  const [, , hydrated]      = useLocalStorage('dw_events', SEED_EVENTS)

  function toggleInterest(id) {
    setEvents(prev => (prev || []).map(e =>
      e.id === id ? { ...e, interested: !e.interested } : e
    ))
  }

  // Basic filtering
  const filtered = (events || []).filter(ev => {
    if (filter === 'Online') return ev.online
    if (filter === 'This Week') {
      const evDate = new Date(ev.date)
      const now    = new Date()
      const end    = new Date(now)
      end.setDate(now.getDate() + 7)
      return evDate >= now && evDate <= end
    }
    return true // Upcoming + Near Me show all for now
  })

  if (!hydrated) return null

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      {/* Header */}
      <div className="px-4 pt-6 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={20} style={{ color: '#5B4FCF' }} />
          <h1 className="font-display text-[24px] font-bold text-text-primary">Events</h1>
        </div>
        <Link href="/events/create"
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded-pill text-[13px] font-bold shadow-purple hover:opacity-90 transition-all"
          style={{ background: '#5B4FCF' }}>
          <Plus size={14} /> Add Event
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto scroll-hide pb-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-all ${
              filter === f
                ? 'text-white border-purple'
                : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'
            }`}
            style={filter === f ? { background: '#5B4FCF', borderColor: '#5B4FCF' } : {}}>
            {f}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-3 px-4 py-4 pb-10">
        {filtered.length === 0 ? (
          <div className="card p-10 flex flex-col items-center gap-3 text-center">
            <MapPin size={36} style={{ color: '#EDE9FF' }} />
            <p className="font-display text-[17px] font-semibold text-text-primary">No events here</p>
            <p className="text-text-muted text-[13px]">Try a different filter or add your own event.</p>
          </div>
        ) : (
          filtered.map((ev, idx) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <EventCard event={ev} onToggleInterest={toggleInterest} />
            </motion.div>
          ))
        )}
      </div>

      <ToastContainer />
    </div>
  )
}