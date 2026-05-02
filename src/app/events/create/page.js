'use client'

// ── /events/create — Create event (Update 3) ──

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ToastContainer, showToast } from '../../../components/Toast'
import { EVENT_CATEGORIES, SEED_EVENTS } from '../../../lib/constants'

function readEvents() {
  try { const r = localStorage.getItem('dw_events'); return r ? JSON.parse(r) : SEED_EVENTS } catch { return SEED_EVENTS }
}
function writeEvents(d) { try { localStorage.setItem('dw_events', JSON.stringify(d)) } catch {} }

export default function CreateEventPage() {
  const router = useRouter()
  const [title,    setTitle]    = useState('')
  const [org,      setOrg]      = useState('')
  const [datetime, setDatetime] = useState('')
  const [location, setLocation] = useState('')
  const [online,   setOnline]   = useState(false)
  const [cat,      setCat]      = useState('Conference')
  const [desc,     setDesc]     = useState('')
  const [errors,   setErrors]   = useState({})

  const inputClass = "w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"

  function submit() {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!datetime)     e.date  = 'Date and time are required'
    if (!desc.trim())  e.desc  = 'Description is required'
    if (Object.keys(e).length) { setErrors(e); return }

    const newEvent = {
      id: `ev_${Date.now()}`,
      title: title.trim(),
      organiser: org.trim() || 'Anonymous',
      date: datetime,
      location: online ? 'Online' : (location.trim() || 'TBA'),
      category: cat,
      description: desc.trim(),
      online,
      interested: false,
    }
    writeEvents([newEvent, ...readEvents()])
    showToast('Event created!')
    router.push('/events')
  }

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-text-primary text-[16px]">Add an Event</h1>
      </div>

      <div className="px-4 flex flex-col gap-5 pb-12">

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Event title <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={e => { setTitle(e.target.value); setErrors(p=>({...p, title:''})) }}
            placeholder="e.g. Kingdom Culture Conference" className={inputClass} />
          {errors.title && <p className="text-red-500 text-[12px]">{errors.title}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Organiser</label>
          <input type="text" value={org} onChange={e => setOrg(e.target.value)}
            placeholder="Church or organisation name" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Date & time <span className="text-red-400">*</span></label>
          <input type="datetime-local" value={datetime} onChange={e => { setDatetime(e.target.value); setErrors(p=>({...p, date:''})) }}
            className={inputClass} />
          {errors.date && <p className="text-red-500 text-[12px]">{errors.date}</p>}
        </div>

        {/* Online toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-card">
          <div>
            <p className="font-bold text-text-primary text-[14px]">Online event</p>
            <p className="text-text-muted text-[12px]">No physical location needed</p>
          </div>
          <button onClick={() => setOnline(v => !v)} role="switch" aria-checked={online}
            className={`relative w-11 h-6 rounded-full transition-colors ${online ? '' : 'bg-gray-200'}`}
            style={online ? { background: '#5B4FCF' } : {}}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${online ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {!online && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="City, country or venue" className={inputClass} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Category</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all ${
                  cat === c ? 'text-white border-purple' : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'
                }`}
                style={cat === c ? { background: '#5B4FCF', borderColor: '#5B4FCF' } : {}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Description <span className="text-red-400">*</span></label>
          <textarea value={desc} onChange={e => { setDesc(e.target.value); setErrors(p=>({...p, desc:''})) }}
            placeholder="Tell people what to expect..." rows={4} className={`${inputClass} resize-none`} />
          {errors.desc && <p className="text-red-500 text-[12px]">{errors.desc}</p>}
        </div>

        <button onClick={submit}
          className="w-full text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:opacity-90 active:scale-[0.97] transition-all"
          style={{ background: '#5B4FCF' }}>
          Create Event
        </button>
      </div>

      <ToastContainer />
    </div>
  )
}