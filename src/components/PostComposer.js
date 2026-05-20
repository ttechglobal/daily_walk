'use client'

// ── src/components/PostComposer.js ──
//
// NEW FEATURES:
//
// 1. GLOBAL NETWORK DESTINATION
//    The "Post to" section now has a "Global Network" toggle at the top.
//    Selecting it sets is_global=true on the post, making it visible in a
//    network-wide feed (not scoped to any community).
//    The user can select Global + one or more communities simultaneously,
//    or any combination.
//    If they select neither, the Post button stays disabled with a clear message.
//
// 2. CONTENT MODERATION
//    Before submitting, content is run through moderateContent() from lib/scripture.js.
//    Flagged posts show a clear inline error message — never silently dropped.
//
// 3. CORRECT USER ATTRIBUTION
//    createPostToMultiple() calls getAuthUser() internally which reads the live
//    Supabase session — posts are always attributed to the authenticated user.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Check, Loader2, Globe, Users } from 'lucide-react'
import { createPostToMultiple, getJoinedCommunities } from '../lib/supabase/communities'
import { moderateContent } from '../lib/scripture'
import { showToast } from './Toast'

const MAX_CHARS = 1000

export default function PostComposer({ onClose, defaultCommunityId = null, onPost }) {
  const [content,     setContent]     = useState('')
  const [passage,     setPassage]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [communities, setCommunities] = useState([])
  const [selected,    setSelected]    = useState(new Set(defaultCommunityId ? [defaultCommunityId] : []))
  const [isGlobal,    setIsGlobal]    = useState(false)
  const [contentError,setContentError]= useState(null)
  const textRef = useRef(null)

  useEffect(() => {
    getJoinedCommunities().then(list => {
      setCommunities(list || [])
      if (defaultCommunityId) setSelected(new Set([defaultCommunityId]))
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

  // Destination summary for header
  const destinationCount = selected.size + (isGlobal ? 1 : 0)
  const hasDestination   = destinationCount > 0

  // Content change — clear inline error
  function handleContentChange(val) {
    setContent(val.slice(0, MAX_CHARS))
    if (contentError) setContentError(null)
  }

  async function submit() {
    // 1. Moderation check
    const mod = moderateContent(content)
    if (!mod.ok) { setContentError(mod.reason); return }

    // 2. Destination check
    if (!hasDestination) { showToast('Choose at least one destination'); return }

    setSending(true)
    try {
      const communityIds = [...selected]
      const posts = await createPostToMultiple(
        communityIds.length > 0 ? communityIds : [null],
        {
          content:   content.trim(),
          passage:   passage.trim() || null,
          type:      'general',
          is_global: isGlobal,
        },
        isGlobal,
      )

      const destLabel = [
        isGlobal            ? 'Global Network'        : null,
        selected.size > 0   ? `${selected.size} ${selected.size === 1 ? 'community' : 'communities'}` : null,
      ].filter(Boolean).join(' + ')

      showToast(`Posted to ${destLabel} 🙌`)
      if (onPost) posts.forEach(p => onPost(p))
      onClose()
    } catch (e) {
      if (e.message === 'not_authenticated') {
        showToast('Please sign in to post')
      } else {
        showToast('Post failed — please try again')
        console.error('[PostComposer]', e)
      }
    } finally {
      setSending(false)
    }
  }

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
            <button
              onClick={submit}
              disabled={!content.trim() || !hasDestination || sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple text-white text-[13px] font-bold disabled:opacity-40 active:scale-95 transition-all min-h-[36px]"
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
            placeholder='Scripture reference — e.g. "John 3:16"'
            className="w-full border border-gray-200 rounded-[12px] px-4 py-2.5 text-[13px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
          />

          {/* Post body */}
          <div className="flex flex-col gap-1">
            <textarea
              ref={textRef}
              autoFocus
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="What's on your heart? Share a reflection, prayer, or encouragement…"
              className="w-full text-[16px] leading-[1.7] text-text-primary placeholder:text-text-muted resize-none focus:outline-none bg-transparent"
              style={{ minHeight: 120 }}
            />
            {/* Inline content error */}
            <AnimatePresence>
              {contentError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-[12px] font-semibold text-red-500 leading-relaxed">
                  {contentError}
                </motion.p>
              )}
            </AnimatePresence>
            <p className={`text-right text-[12px] font-semibold ${remaining < 100 ? 'text-red-500' : 'text-text-muted'}`}>
              {remaining} left
            </p>
          </div>

          {/* ── Destination selector ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Share to</p>
              <p className="text-[12px] text-text-muted">
                {destinationCount === 0 ? 'None selected' : `${destinationCount} selected`}
              </p>
            </div>

            {/* Global Network toggle — always shown at top */}
            <button
              onClick={() => setIsGlobal(v => !v)}
              className={`flex items-center gap-3 px-4 py-3 rounded-[16px] border-2 text-left transition-all active:scale-[0.98] min-h-[52px] ${
                isGlobal ? 'bg-purple-light border-purple' : 'bg-white border-gray-200'
              }`}>
              {/* Globe icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isGlobal ? 'bg-purple' : 'bg-warm-outer'
              }`}>
                <Globe size={17} className={isGlobal ? 'text-white' : 'text-text-muted'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-[14px] ${isGlobal ? 'text-purple' : 'text-text-primary'}`}>
                  Global Network
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">Visible to all Daily Walk users</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isGlobal ? 'border-purple bg-purple' : 'border-gray-300'
              }`}>
                {isGlobal && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>

            {/* Divider */}
            {communities.length > 0 && (
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-100" />
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Communities</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            )}

            {/* Joined communities */}
            {communities.length === 0 ? (
              <p className="text-[13px] text-text-muted py-2">
                Join a community to post there.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {communities.map(c => {
                  const isSelected = selected.has(c.id)
                  return (
                    <button key={c.id} onClick={() => toggleCommunity(c.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[16px] border-2 text-left transition-all active:scale-[0.98] min-h-[52px] ${
                        isSelected ? 'bg-purple-light border-purple' : 'bg-white border-gray-200'
                      }`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0 ${
                        isSelected ? 'bg-purple' : 'bg-warm-outer'
                      }`}
                        style={{ color: isSelected ? 'white' : '#5B4FCF' }}>
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

          {/* No destination warning */}
          <AnimatePresence>
            {content.trim() && !hasDestination && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[12px] text-amber-600 font-semibold text-center">
                Select Global Network or at least one community to post.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}