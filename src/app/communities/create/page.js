'use client'

// ── /communities/create — Updated form with visibility + invite code ──

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Globe, Lock, Copy, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../../components/Toast'
import { COMMUNITY_CATEGORIES, SEED_COMMUNITIES, todayStr } from '../../../lib/constants'

function readCommunities() {
  try {
    const r = localStorage.getItem('dw_communities')
    return r ? JSON.parse(r) : SEED_COMMUNITIES
  } catch { return SEED_COMMUNITIES }
}
function writeCommunities(d) {
  try { localStorage.setItem('dw_communities', JSON.stringify(d)) } catch {}
}

// ── Share invite code screen ──
function InviteScreen({ community, onDone }) {
  const code = community.inviteCode

  async function handleCopy() {
    await navigator.clipboard.writeText(`Join my Daily Walk community "${community.name}" with code: ${code}`).catch(() => {})
    showToast('Copied!')
  }

  async function handleShare() {
    const text = `Join my Daily Walk community "${community.name}" · Code: ${code}`
    if (navigator.share) {
      try { await navigator.share({ text, title: 'Daily Walk Community' }) } catch {}
    } else {
      handleCopy()
    }
  }

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className="flex flex-col items-center gap-6 py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:'#EDE9FF' }}>
        <Lock size={28} style={{ color:'#5B4FCF' }} />
      </div>
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color:'#1A1A2E' }}>Share your invite</h2>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color:'#6B7280' }}>
          Your community is private. Share this code so people can find and join it.
        </p>
      </div>

      {/* Invite code display */}
      <div className="w-full p-5 rounded-[20px] flex flex-col items-center gap-2"
        style={{ background:'#EDE9FF', border:'2px solid #5B4FCF' }}>
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color:'#7C6FCD' }}>Invite Code</p>
        <p className="font-display font-bold text-[32px] tracking-widest" style={{ color:'#5B4FCF' }}>{code}</p>
        <p className="text-[12px]" style={{ color:'#9CA3AF' }}>{community.name}</p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 border-2 rounded-pill py-3.5 text-[14px] font-bold transition-all"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
          <Copy size={16} /> Copy invite code
        </button>
        <button onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 text-white rounded-pill py-3.5 text-[14px] font-bold hover:opacity-90 transition-all"
          style={{ background:'#5B4FCF' }}>
          <Share2 size={16} /> Share link
        </button>
        <button onClick={onDone} className="text-[13px] font-semibold" style={{ color:'#9CA3AF' }}>
          Done
        </button>
      </div>
      <ToastContainer />
    </motion.div>
  )
}

export default function CreateCommunityPage() {
  const router = useRouter()

  const [name,       setName]       = useState('')
  const [owner,      setOwner]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [category,   setCategory]   = useState('Bible Study')
  const [visibility, setVisibility] = useState('public')
  const [errors,     setErrors]     = useState({})
  const [newComm,    setNewComm]    = useState(null) // after save, for private invite screen

  const inputClass = "w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted"
    .split(' ').join(' ')

  function validate() {
    const e = {}
    if (!name.trim())  e.name  = 'Community name is required'
    if (!owner.trim()) e.owner = 'Creator name is required'
    if (!desc.trim())  e.desc  = 'Description is required'
    return e
  }

  function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    const community  = {
      id:          `cm_${Date.now()}`,
      name:        name.trim(),
      createdBy:   owner.trim(),
      category,
      description: desc.trim(),
      visibility,
      memberCount: 0,
      joined:      true,
      inviteCode,
      posts:       [],
      createdAt:   new Date().toISOString(),
    }

    const existing = readCommunities()
    writeCommunities([community, ...existing])

    if (visibility === 'private') {
      setNewComm(community)
    } else {
      showToast('Community created!')
      router.push(`/communities/${community.id}`)
    }
  }

  // Show invite screen for private communities
  if (newComm) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-2">
          <button onClick={() => router.push(`/communities/${newComm.id}`)}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
            style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.07)', color:'#1A1A2E' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Community Created</h1>
        </div>
        <InviteScreen community={newComm} onDone={() => router.push(`/communities/${newComm.id}`)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background:'#FAF8F5' }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
          style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.07)', color:'#1A1A2E' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Create a Community</h1>
      </div>

      <div className="px-4 flex flex-col gap-5 pb-12">

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold" style={{ color:'#1A1A2E' }}>
            Community name <span style={{ color:'#EF4444' }}>*</span>
          </label>
          <input type="text" value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({...p, name:''})) }}
            placeholder="e.g. Morning Readers, Dominion City, John's Group"
            className={inputClass} style={{ color:'#1A1A2E' }} />
          {errors.name && <p className="text-[12px]" style={{ color:'#EF4444' }}>{errors.name}</p>}
        </div>

        {/* Created by */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold" style={{ color:'#1A1A2E' }}>
            Created by <span style={{ color:'#EF4444' }}>*</span>
          </label>
          <input type="text" value={owner}
            onChange={e => { setOwner(e.target.value); setErrors(p => ({...p, owner:''})) }}
            placeholder="e.g. Dominion City, John's Bible Group, or your name"
            className={inputClass} style={{ color:'#1A1A2E' }} />
          {errors.owner && <p className="text-[12px]" style={{ color:'#EF4444' }}>{errors.owner}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold" style={{ color:'#1A1A2E' }}>
            Description <span style={{ color:'#EF4444' }}>*</span>
          </label>
          <textarea value={desc}
            onChange={e => { setDesc(e.target.value); setErrors(p => ({...p, desc:''})) }}
            placeholder="What is this community about?"
            rows={3}
            className={`${inputClass} resize-none`} style={{ color:'#1A1A2E' }} />
          {errors.desc && <p className="text-[12px]" style={{ color:'#EF4444' }}>{errors.desc}</p>}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold" style={{ color:'#1A1A2E' }}>Category</label>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_CATEGORIES.filter(c => c !== 'All').map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={category === cat
                  ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                  : { background:'white', borderColor:'#E5E7EB', color:'#6B7280' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold" style={{ color:'#1A1A2E' }}>Visibility</label>
          <div className="flex flex-col gap-2">
            {[
              {
                key: 'public', icon: Globe,
                title: 'Public', desc: 'Anyone can find and join this community',
              },
              {
                key: 'private', icon: Lock,
                title: 'Private', desc: 'Invite link only — not shown in Explore',
              },
            ].map(opt => (
              <button key={opt.key} onClick={() => setVisibility(opt.key)}
                className="flex items-center gap-4 p-4 rounded-[16px] text-left transition-all"
                style={{
                  background: visibility === opt.key ? '#EDE9FF' : 'white',
                  border: `2px solid ${visibility === opt.key ? '#5B4FCF' : '#F0EDE8'}`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: visibility === opt.key ? '#5B4FCF' : '#F0EDE8' }}>
                  <opt.icon size={18} style={{ color: visibility === opt.key ? 'white' : '#9CA3AF' }} />
                </div>
                <div>
                  <p className="font-bold text-[14px]" style={{ color: visibility === opt.key ? '#5B4FCF' : '#1A1A2E' }}>
                    {opt.title}
                  </p>
                  <p className="text-[12px]" style={{ color:'#6B7280' }}>{opt.desc}</p>
                </div>
                {/* Selected indicator */}
                <div className="ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: visibility === opt.key ? '#5B4FCF' : '#E5E7EB' }}>
                  {visibility === opt.key && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#5B4FCF' }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={submit}
          className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
          style={{ background:'#5B4FCF' }}>
          Create Community
        </button>
      </div>

      <ToastContainer />
    </div>
  )
}