'use client'

// ── /events/[id] — Event detail (Update 3) ──

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Wifi, Calendar, Share2, ExternalLink } from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../../components/Toast'
import { SEED_EVENTS, EVENT_CATEGORIES, formatEventDate } from '../../../lib/constants'

const CAT_STYLES = {
  'Conference':   'bg-purple-light text-purple',
  'Revival':      'bg-amber-light text-amber-700',
  'Prayer Night': 'bg-blue-50 text-blue-600',
  'Bible Study':  'bg-sage-light text-sage',
  'Concert':      'bg-pink-50 text-pink-600',
  'Other':        'bg-gray-100 text-text-muted',
}

export default function EventDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [events, setEvents] = useLocalStorage('dw_events', SEED_EVENTS)
  const [, , hydrated]      = useLocalStorage('dw_events', SEED_EVENTS)

  const event = (events || []).find(e => e.id === id)

  function toggleInterest() {
    setEvents(prev => (prev || []).map(e =>
      e.id === id ? { ...e, interested: !e.interested } : e
    ))
  }

  async function handleShare() {
    const url  = window.location.href
    const text = `${event.title} — ${formatEventDate(event.date)}`
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copied!')
    }
  }

  if (!hydrated) return null
  if (!event) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p className="text-text-muted">Event not found.</p>
      <button onClick={() => router.push('/events')} className="text-purple font-semibold underline">Back to events</button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg overflow-x-hidden">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #5B4FCF 0%, #3D3190 100%)' }}>
        <div className="px-4 pt-5 pb-2 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${CAT_STYLES[event.category] || CAT_STYLES.Other}`}>
            {event.category}
          </span>
        </div>

        <div className="px-5 pb-6">
          <h1 className="font-display text-[26px] font-bold text-white leading-snug mb-2">
            {event.title}
          </h1>
          <p className="text-white/70 text-[13px] font-semibold mb-1">by {event.organiser}</p>

          <div className="flex items-center gap-2 text-white/80 text-[13px] mb-4">
            <Calendar size={13} />
            <span>{formatEventDate(event.date)}</span>
          </div>

          {/* Interest button in hero */}
          <button onClick={toggleInterest}
            className={`w-full rounded-pill py-3.5 text-[15px] font-bold transition-all active:scale-[0.97] ${
              event.interested
                ? 'bg-white/20 text-white border-2 border-white/30 hover:bg-white/10'
                : 'bg-white text-purple hover:bg-white/90'
            }`}
            style={!event.interested ? { color: '#5B4FCF' } : {}}>
            {event.interested ? 'Interested ✓' : 'I\'m interested'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 py-5 pb-24">

        {/* Details card */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Details</p>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-light flex items-center justify-center flex-shrink-0">
              <Calendar size={14} style={{ color: '#5B4FCF' }} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-[14px]">{formatEventDate(event.date)}</p>
              <p className="text-text-muted text-[12px]">Date & time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sage-light flex items-center justify-center flex-shrink-0">
              {event.online ? <Wifi size={14} style={{ color: '#4A7C5F' }} /> : <MapPin size={14} style={{ color: '#4A7C5F' }} />}
            </div>
            <div>
              <p className="font-bold text-text-primary text-[14px]">{event.location}</p>
              <p className="text-text-muted text-[12px]">{event.online ? 'Online event' : 'In-person venue'}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-4">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">About</p>
          <p className="text-text-primary text-[14px] leading-relaxed">{event.description}</p>
        </div>

        {/* Location card */}
        {event.online ? (
          <div className="card p-4 flex flex-col gap-3">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Join Link</p>
            <p className="text-text-muted text-[13px]">The link will be shared closer to the event date.</p>
            <button
              onClick={() => showToast('Link will be available closer to the event')}
              className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-text-muted rounded-pill py-3 text-[13px] font-bold hover:border-purple hover:text-purple transition-colors">
              <ExternalLink size={14} /> Join Event
            </button>
          </div>
        ) : (
          <div className="card p-4 flex flex-col gap-3">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Location</p>
            {/* Map placeholder */}
            <div className="w-full h-28 rounded-2xl flex items-center justify-center gap-2"
              style={{ background: '#EDE9FF' }}>
              <MapPin size={20} style={{ color: '#5B4FCF' }} />
              <span className="font-semibold text-[14px]" style={{ color: '#5B4FCF' }}>{event.location}</span>
            </div>
          </div>
        )}

        {/* Share */}
        <button onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-text-muted rounded-pill py-3 text-[13px] font-semibold hover:border-purple hover:text-purple transition-colors">
          <Share2 size={14} /> Share Event
        </button>
      </div>

      <ToastContainer />
    </div>
  )
}