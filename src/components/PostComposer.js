'use client'

// ── src/components/PostComposer.js ──
// Multi-community post composer.
// User writes post, selects which communities to post to (can select multiple),
// submits — posts appear in all selected communities and on the user's profile.
// Uses the app's Tailwind class system (bg-white, rounded-[20px], shadow-card etc.)

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Check, Loader2, ChevronDown } from 'lucide-react'
import { createPostToMultiple, getJoinedCommunities } from '../lib/supabase/communities'
import { showToast } from './Toast'

const MAX_CHARS = 1000

export default function PostComposer({ onClose, defaultCommunityId = null, onPost }) {
  const [content,    setContent]    = useState('')
  const [passage,    setPassage]    = useState('')
  const [sending,    setSending]    = useState(false)
  const [communities,setCommunities]= useState([])
  const [selected,   setSelected]   = useState(new Set(defaultCommunityId ? [defaultCommunityId] : []))
  const [showPicker, setShowPicker] = useState(false)
  const textRef = useRef(null)

  // Load the communities the user has joined
  useEffect(() => {
    getJoinedCommunities().then(list => {
      setCommunities(list || [])
      // Auto-select defaultCommunityId if provided
      if (defaultCommunityId) setSelected(new Set([defaultCommunityId]))
      // If only one community, auto-select it
      else if (list?.length === 1) setSelected(new Set([list[0].id]))
    })
  }, [defaultCommunityId])

  function toggleCommunity(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function submit() {
    if (!content.trim()) return
    if (selected.size === 0) { showToast('Select at least one community to post to'); return }
    setSending(true)
    try {
      const posts = await createPostToMultiple([...selected], {
        content: content.trim(),
        passage: passage.trim() || null,
        type:    'general',
      })
      showToast(`Posted to ${selected.size} ${selected.size === 1 ? 'community' : 'communities'} 🙌`)
      if (onPost) posts.forEach(p => onPost(p))
      onClose()
    } catch (e) {
      showToast(e.message === 'not_authenticated'
        ? 'Please sign in to post'
        : 'Post failed — please try again'
      )
    } finally {
      setSending(false)
    }
  }

  const selectedNames = communities
    .filter(c => selected.has(c.id))
    .map(c => c.name)

  const remaining = MAX_CHARS - content.length

  return (
    <>
      {/* Backdrop */}
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight: '90dvh', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-warm-outer" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-[16px] text-text-primary">New Post</p>
          <div className="flex items-center gap-2">
            {/* Post button — top right, disabled until content + community */}
            <button
              onClick={submit}
              disabled={!content.trim() || selected.size === 0 || sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-pill bg-purple text-white text-[13px] font-bold disabled:opacity-40 active:scale-95 transition-all min-h-[36px]"
            >
              {sending
                ? <><Loader2 size={14} className="animate-spin" /> Posting…</>
                : <><Send size={13} /> Post</>
              }
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-warm-outer flex items-center justify-center">
              <X size={14} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Scripture reference (optional) */}
          <input
            value={passage}
            onChange={e => setPassage(e.target.value)}
            placeholder="Scripture reference (optional) — e.g. John 3:16"
            className="w-full border border-gray-200 rounded-input px-4 py-2.5 text-[13px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
          />

          {/* Post body */}
          <textarea
            ref={textRef}
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="What's on your heart? Share a reflection, prayer, or encouragement…"
            className="w-full text-[16px] leading-[1.7] text-text-primary placeholder:text-text-muted resize-none focus:outline-none bg-transparent"
            style={{ minHeight: 140 }}
          />

          {/* Character count */}
          <p className={`text-right text-[12px] font-semibold ${remaining < 100 ? 'text-red-500' : 'text-text-muted'}`}>
            {remaining} left
          </p>

          {/* Community selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted">
                Post to
              </p>
              <p className="text-[12px] text-text-muted">
                {selected.size === 0 ? 'None selected' : `${selected.size} selected`}
              </p>
            </div>

            {communities.length === 0 ? (
              <p className="text-[13px] text-text-muted py-2">
                Join a community first to post there.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {communities.map(c => {
                  const isSelected = selected.has(c.id)
                  return (
                    <button key={c.id} onClick={() => toggleCommunity(c.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[16px] border-2 text-left transition-all active:scale-[0.98] min-h-[52px] ${
                        isSelected
                          ? 'bg-purple-light border-purple'
                          : 'bg-white border-gray-200'
                      }`}>
                      {/* Community avatar */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0 bg-purple">
                        {(c.name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-[14px] truncate ${isSelected ? 'text-purple' : 'text-text-primary'}`}>
                          {c.name}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {(c.member_count || 0).toLocaleString()} members
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'border-purple bg-purple' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}