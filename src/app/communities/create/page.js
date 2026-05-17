'use client'

// ── src/app/communities/create/page.js ──
// Uses create_community_and_join() RPC — atomic insert + auto-join.
// Navigates to /community/{actual-slug-from-db} after creation.
// Never uses a client-generated slug for routing.
// Full dark mode via useTheme().

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Lock, Loader2 } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import { getAuthUser } from '../../../lib/supabase/communities'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'

const CATEGORIES = [
  'Bible Study','Prayer','Mental Health','Youth','Worship','General',
]

function makeSlug(name) {
  return (name || 'community')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export default function CreateCommunityPage() {
  const router = useRouter()
  const { t }  = useTheme()

  const [name,       setName]       = useState('')
  const [desc,       setDesc]       = useState('')
  const [category,   setCategory]   = useState('General')
  const [visibility, setVisibility] = useState('public')
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)

  function validate() {
    const e = {}
    if (!name.trim())        e.name = 'Community name is required'
    if (!desc.trim())        e.desc = 'Please add a short description'
    if (name.trim().length < 3) e.name = 'Name must be at least 3 characters'
    return e
  }

  async function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)

    const sb   = createClient()
    const user = await getAuthUser()

    if (!sb) {
      showToast('Supabase not configured')
      setSaving(false)
      return
    }
    if (!user) {
      showToast('Please sign in to create a community')
      router.push('/auth?next=/communities/create&reason=community')
      setSaving(false)
      return
    }

    const slug = makeSlug(name.trim())

    console.log('[create-community] calling RPC with:', {
      p_name:        name.trim(),
      p_slug:        slug,
      p_description: desc.trim(),
      p_category:    category,
      p_visibility:  visibility,
      p_created_by:  user.id,
    })

    const { data, error } = await sb.rpc('create_community_and_join', {
      p_name:        name.trim(),
      p_slug:        slug,
      p_description: desc.trim(),
      p_category:    category,
      p_visibility:  visibility,
      p_created_by:  user.id,
    })

    console.log('[create-community] RPC result — data:', data, 'error:', error)

    if (error) {
      console.error('[create-community] insert error:', error)
      showToast(`Failed to create community: ${error.message}`)
      setSaving(false)
      return
    }

    if (!data || !data.slug) {
      console.error('[create-community] no data returned from RPC:', data)
      showToast('Community created but could not load it — check your communities page.')
      router.push('/communities')
      setSaving(false)
      return
    }

    console.log('[create-community] success — navigating to /community/' + data.slug)
    showToast(`${data.name} created! 🙌`)
    router.push(`/community/${data.slug}`)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b flex-shrink-0"
        style={{ background: t.bgCard, borderColor: t.border }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.bgMuted }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <h1 className="font-bold text-[17px]" style={{ color: t.text }}>Create a Community</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5" style={{ paddingBottom: 100 }}>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-[13px]" style={{ color: t.text }}>
            Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ''})) }}
            placeholder="e.g. Morning Prayer Circle"
            maxLength={60}
            className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
            style={{
              background:   t.bgInput,
              color:        t.text,
              borderColor:  errors.name ? '#EF4444' : t.borderInput,
            }}
          />
          {errors.name && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.name}</p>}
          {name.trim() && !errors.name && (
            <p className="text-[12px]" style={{ color: t.textFaint }}>
              URL: /community/{makeSlug(name.trim())}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-[13px]" style={{ color: t.text }}>
            Description <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={desc}
            onChange={e => { setDesc(e.target.value); setErrors(p => ({...p, desc: ''})) }}
            placeholder="What is this community about? Who is it for?"
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 rounded-[14px] border text-[14px] resize-none focus:outline-none"
            style={{
              background:  t.bgInput,
              color:       t.text,
              borderColor: errors.desc ? '#EF4444' : t.borderInput,
            }}
          />
          {errors.desc && <p className="text-[12px]" style={{ color: '#EF4444' }}>{errors.desc}</p>}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-[13px]" style={{ color: t.text }}>Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3.5 py-2 rounded-full text-[13px] font-semibold border-2 transition-all min-h-[36px]"
                style={category === cat
                  ? { background: '#5B4FCF', borderColor: '#5B4FCF', color: 'white' }
                  : { background: t.bgCard, borderColor: t.borderInput, color: t.textMuted }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-[13px]" style={{ color: t.text }}>Visibility</label>
          <div className="flex gap-3">
            {[
              { key: 'public',  icon: Globe, label: 'Public',  sub: 'Anyone can find and join' },
              { key: 'private', icon: Lock,  label: 'Private', sub: 'Invite only' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setVisibility(opt.key)}
                className="flex-1 flex items-center gap-3 p-4 rounded-[16px] border-2 text-left transition-all"
                style={visibility === opt.key
                  ? { background: t.purpleBg || '#EDE9FF', borderColor: '#5B4FCF' }
                  : { background: t.bgCard, borderColor: t.borderInput }
                }
              >
                <opt.icon size={18} style={{ color: visibility === opt.key ? '#5B4FCF' : t.textMuted, flexShrink: 0 }} />
                <div>
                  <p className="font-bold text-[13px]"
                    style={{ color: visibility === opt.key ? '#5B4FCF' : t.text }}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed footer CTA */}
      <div className="flex-shrink-0 px-4 py-4 border-t"
        style={{ background: t.bg, borderColor: t.border, paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={submit}
          disabled={saving || !name.trim() || !desc.trim()}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
        >
          {saving
            ? <><Loader2 size={18} className="animate-spin" /> Creating…</>
            : 'Create Community →'
          }
        </button>
      </div>
    </div>
  )
}