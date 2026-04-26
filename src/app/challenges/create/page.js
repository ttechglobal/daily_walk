'use client'

// ── /challenges/create — Update 2: fixed creation bug ──
// Bug was: setChallenges from useLocalStorage sometimes doesn't hydrate
// before submit. Fix: read directly from localStorage, merge, write back.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ToastContainer, showToast } from '../../../components/Toast'
import { CHALLENGE_TYPE_LABELS, SEED_CHALLENGES, todayStr } from '../../../lib/constants'

function readChallenges() {
  try {
    const raw = localStorage.getItem('dw_challenges')
    if (raw) return JSON.parse(raw)
  } catch {}
  return SEED_CHALLENGES
}

function writeChallenges(data) {
  try { localStorage.setItem('dw_challenges', JSON.stringify(data)) } catch {}
}

export default function CreateChallengePage() {
  const router = useRouter()

  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [type,     setType]     = useState('verse-a-day')
  const [start,    setStart]    = useState(todayStr())
  const [days,     setDays]     = useState('30')
  const [creator,  setCreator]  = useState('')
  const [errors,   setErrors]   = useState({})

  function validate() {
    const e = {}
    if (!title.trim())        e.title = 'Title is required'
    if (!desc.trim())         e.desc  = 'Description is required'
    const d = parseInt(days, 10)
    if (!d || d < 1 || d > 365) e.days = 'Duration must be 1–365 days'
    return e
  }

  function submit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    const startDate = new Date(start)
    const endDate   = new Date(startDate)
    endDate.setDate(startDate.getDate() + parseInt(days, 10) - 1)

    const newChallenge = {
      id:          `c_${Date.now()}`,
      title:       title.trim(),
      description: desc.trim(),
      createdBy:   creator.trim() || 'Anonymous',
      type,
      startDate:   start,
      endDate:     endDate.toISOString().split('T')[0],
      joinCount:   0,
      joined:      false,
      posts:       [],
    }

    // Update 2: read → prepend → write directly to avoid stale state bug
    const current = readChallenges()
    writeChallenges([newChallenge, ...current])

    showToast('Challenge created!')
    router.push('/challenges')
  }

  const inputClass = "w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"
  const errClass   = "text-red-500 text-[12px] mt-1"

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-text-primary text-[16px]">Create a Challenge</h1>
      </div>

      <div className="px-4 flex flex-col gap-5 pb-12">

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Title <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({...p, title: ''})) }}
            placeholder="e.g. Psalms in 30 Days" className={inputClass} />
          {errors.title && <p className={errClass}>{errors.title}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Description <span className="text-red-400">*</span></label>
          <textarea value={desc} onChange={e => { setDesc(e.target.value); setErrors(p => ({...p, desc: ''})) }}
            placeholder="What is this challenge about?" rows={3} className={`${inputClass} resize-none`} />
          {errors.desc && <p className={errClass}>{errors.desc}</p>}
        </div>

        {/* Type */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Type</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CHALLENGE_TYPE_LABELS).map(([val, label]) => (
              <button key={val} onClick={() => setType(val)}
                className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-all ${
                  type === val ? 'bg-purple text-white border-purple' : 'bg-white text-text-muted border-gray-200 hover:border-purple hover:text-purple'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Start date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Start date</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Duration (days) <span className="text-red-400">*</span></label>
          <input type="number" value={days} onChange={e => { setDays(e.target.value); setErrors(p => ({...p, days: ''})) }}
            min="1" max="365" className={inputClass} />
          {errors.days && <p className={errClass}>{errors.days}</p>}
        </div>

        {/* Creator name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-primary">Your name <span className="text-text-muted font-normal">(optional)</span></label>
          <input type="text" value={creator} onChange={e => setCreator(e.target.value)}
            placeholder="Anonymous" className={inputClass} />
        </div>

        <button onClick={submit}
          className="w-full bg-purple text-white rounded-pill py-4 text-[15px] font-bold shadow-purple hover:bg-purple-dark active:scale-[0.97] transition-all">
          Create challenge
        </button>
      </div>

      <ToastContainer />
    </div>
  )
}