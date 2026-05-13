'use client'

// ── PostComposer — Global post composer + shareable link builder ──
// Accessible from home screen, For You feed, community pages.
// Anonymous posting — no account required.
// Builds shareable OG links for each post.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Globe, Users, Eye, EyeOff, BookOpen, Send, Copy, Link2
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { showToast } from './Toast'
import { SEED_COMMUNITIES, initials, todayStr } from '../lib/constants'
import { createShareUrl } from '../lib/config'
import { fetchLinkPreview, extractUrl } from '../lib/link-preview'
import { useCheckin } from '../hooks/useCheckin'

const POST_TYPES = [
  { key:'general',       label:'General',       color:'#888780' },
  { key:'reading',       label:'Reading',       color:'#5B4FCF' },
  { key:'prayer',        label:'Prayer',        color:'#4A7C5F' },
  { key:'encouragement', label:'Encourage',     color:'#E8A838' },
]
const TYPE_PLACEHOLDERS = {
  general:       "What's on your heart?",
  reading:       'What did you read and what stood out to you?',
  prayer:        'Share a prayer request or praise report...',
  encouragement: 'Encourage someone in the community today...',
}

function LinkPreviewCard({ preview, onDismiss }) {
  if (!preview) return null
  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className="relative rounded-[12px] overflow-hidden border"
      style={{ borderColor:'#E8E5E0' }}>
      {preview.image && <img src={preview.image} alt="" className="w-full h-24 object-cover" />}
      <div className="px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:'#9CA3AF' }}>{preview.domain}</p>
        {preview.title && <p className="font-bold text-[12px] mt-0.5 line-clamp-1" style={{ color:'#1A1A2E' }}>{preview.title}</p>}
      </div>
      <button onClick={onDismiss} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white">
        <X size={11} />
      </button>
    </motion.div>
  )
}

export default function PostComposer({ onClose, defaultCommunityId = null }) {
  const [user]                        = useLocalStorage('dw_user', null)
  const [communities]                 = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [globalPosts, setGlobalPosts] = useLocalStorage('dw_global_posts', [])
  const [comms, setComms]             = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const { performCheckin, isCheckedInToday } = useCheckin()

  const [postType,    setPostType]    = useState('general')
  const [content,     setContent]     = useState('')
  const [passage,     setPassage]     = useState('')
  const [showPassage, setShowPassage] = useState(false)
  const [visibility,  setVisibility]  = useState(defaultCommunityId ? 'community' : 'global')
  const [communityId, setCommunityId] = useState(defaultCommunityId)
  const [anonymous,   setAnonymous]   = useState(!user?.name)
  const [preview,     setPreview]     = useState(null)
  const [previewLoading, setPLoading] = useState(false)
  const [posted, setPosted]           = useState(null) // { shareUrl } after posting
  const debounceRef = useRef(null)

  const joined      = (communities || []).filter(c => c.joined)
  const displayName = anonymous ? 'Anonymous' : (user?.name?.trim() || 'Anonymous')
  const typeColor   = POST_TYPES.find(t => t.key === postType)?.color || '#888780'
  const MAX = 500

  // URL detection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const url = extractUrl(content)
      if (url) {
        setPLoading(true)
        setPreview(await fetchLinkPreview(url))
        setPLoading(false)
      } else {
        setPreview(null)
      }
    }, 800)
    return () => clearTimeout(debounceRef.current)
  }, [content])

  function buildShareUrl(post) {
    const base   = createShareUrl(`/post/${post.id}`)
    const params = new URLSearchParams({
      content: content.slice(0, 200),
      author:  displayName,
      type:    postType,
    })
    if (passage) params.set('passage', passage)
    return `${base}?${params}`
  }

  function submit() {
    if (!content.trim()) { showToast('Write something first'); return }
    if (visibility === 'community' && !communityId) { showToast('Select a community'); return }

    const id   = `post_${Date.now()}`
    const post = {
      id,
      authorId:       anonymous ? 'anonymous' : 'local_user',
      authorName:     displayName,
      authorInitials: initials(displayName),
      content:        content.trim(),
      passage:        showPassage ? passage.trim() : undefined,
      type:           postType,
      visibility,
      communityId:    visibility === 'community' ? communityId : undefined,
      communityName:  visibility === 'community' ? (joined.find(c => c.id === communityId)?.name) : undefined,
      likedBy:        [],
      comments:       [],
      linkPreview:    preview || undefined,
      shareUrl:       buildShareUrl({ id }),
      createdAt:      new Date().toISOString(),
    }

    if (visibility === 'global') {
      setGlobalPosts(prev => [post, ...(prev || [])])
    } else {
      setComms(prev => (prev || []).map(c =>
        c.id !== communityId ? c : { ...c, posts: [post, ...(c.posts || [])] }
      ))
      // Also add to global feed if "Both" — we post to global always for profile tracking
      setGlobalPosts(prev => [{ ...post, visibility:'global', _alsoInCommunity:communityId }, ...(prev || [])])
    }

    if (postType === 'reading' && !isCheckedInToday) {
      performCheckin({ passage: passage.trim(), reflection: content.trim() })
    }

    setPosted({ shareUrl: buildShareUrl(post) })
  }

  async function copyShareUrl() {
    if (!posted?.shareUrl) return
    await navigator.clipboard.writeText(posted.shareUrl).catch(() => {})
    showToast('Share link copied!')
  }

  async function sharePost() {
    if (!posted?.shareUrl) return
    if (navigator.share) {
      try { await navigator.share({ text: `"${content.slice(0,100)}" — ${displayName} on Daily Walk`, url: posted.shareUrl }) } catch {}
    } else {
      copyShareUrl()
    }
  }

  // ── Success state ──
  if (posted) {
    return (
      <>
        <motion.div className="fixed inset-0 bg-black/40 z-[60]"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
        <motion.div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-6 pb-10"
          initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
          transition={{ type:'spring', stiffness:340, damping:36 }}>
          <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'#E8F4ED' }}>
              <span style={{ fontSize:28 }}>🙏</span>
            </div>
            <div>
              <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Posted!</p>
              <p className="text-[13px] mt-1" style={{ color:'#6B7280' }}>Share it so others can be encouraged too</p>
            </div>
            {/* Shareable link display */}
            <div className="w-full p-3 rounded-[14px] border flex items-center gap-2"
              style={{ borderColor:'#E8E5E0', background:'#FAF8F5' }}>
              <Link2 size={14} style={{ color:'#9CA3AF', flexShrink:0 }} />
              <p className="text-[12px] truncate flex-1 font-mono" style={{ color:'#6B7280' }}>
                {posted.shareUrl.replace('https://', '')}
              </p>
              <button onClick={copyShareUrl}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-white flex-shrink-0"
                style={{ background:'#5B4FCF' }}>
                <Copy size={10} /> Copy
              </button>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={sharePost}
                className="flex-1 text-white rounded-pill py-3 text-[14px] font-bold hover:opacity-90"
                style={{ background:'#5B4FCF' }}>
                Share post
              </button>
              <button onClick={onClose}
                className="flex-1 border-2 rounded-pill py-3 text-[14px] font-semibold hover:bg-gray-50"
                style={{ borderColor:'#E5E7EB', color:'#6B7280' }}>
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )
  }

  // ── Compose state ──
  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'92dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>

        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>New Post</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4 scroll-hide">

          {/* Type pills */}
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {POST_TYPES.map(t => (
              <button key={t.key} onClick={() => setPostType(t.key)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                style={postType===t.key
                  ? {background:t.color,borderColor:t.color,color:'white'}
                  : {background:'white',borderColor:'#E5E7EB',color:'#6B7280'}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea value={content} onChange={e => setContent(e.target.value.slice(0,MAX))}
              placeholder={TYPE_PLACEHOLDERS[postType]} autoFocus rows={5}
              className="w-full border border-gray-200 rounded-[16px] resize-none px-4 py-3 text-[15px] focus:outline-none transition-all placeholder:text-text-muted"
              style={{ color:'#1A1A2E', lineHeight:1.7, borderColor:content?typeColor:'#E5E7EB' }} />
            <span className="absolute bottom-3 right-3 text-[11px]"
              style={{ color:content.length>MAX*0.9?'#EF4444':'#9CA3AF' }}>
              {content.length}/{MAX}
            </span>
          </div>

          {previewLoading && <p className="text-[12px]" style={{ color:'#9CA3AF' }}>Fetching preview...</p>}
          {preview && <LinkPreviewCard preview={preview} onDismiss={() => setPreview(null)} />}

          {/* Passage */}
          <button onClick={() => setShowPassage(v => !v)}
            className="flex items-center gap-2 text-[13px] font-semibold"
            style={{ color:showPassage?'#5B4FCF':'#9CA3AF' }}>
            <BookOpen size={14} />
            {showPassage ? 'Remove passage' : 'Add passage (optional)'}
          </button>
          {showPassage && (
            <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
              placeholder="e.g. Romans 8:28"
              className="w-full border border-gray-200 rounded-input px-4 py-2.5 text-[13px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
              style={{ color:'#1A1A2E' }} />
          )}

          {/* Audience */}
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-bold" style={{ color:'#6B7280' }}>Share with</p>
            {[
              { key:'global',    icon:Globe, label:'Everyone on Daily Walk'  },
              { key:'community', icon:Users, label:'Specific community'       },
            ].map(opt => (
              <button key={opt.key} onClick={() => setVisibility(opt.key)}
                className="flex items-center gap-3 p-3 rounded-[14px] text-left transition-all"
                style={{
                  background: visibility===opt.key?'#EDE9FF':'white',
                  border:`2px solid ${visibility===opt.key?'#5B4FCF':'#F0EDE8'}`,
                }}>
                <opt.icon size={16} style={{ color:visibility===opt.key?'#5B4FCF':'#9CA3AF' }} />
                <span className="text-[13px] font-semibold flex-1"
                  style={{ color:visibility===opt.key?'#5B4FCF':'#1A1A2E' }}>{opt.label}</span>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor:visibility===opt.key?'#5B4FCF':'#E5E7EB' }}>
                  {visibility===opt.key && <div className="w-2 h-2 rounded-full" style={{ background:'#5B4FCF' }} />}
                </div>
              </button>
            ))}
            {visibility==='community' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}>
                {joined.length===0 ? (
                  <p className="text-[13px] px-1" style={{ color:'#9CA3AF' }}>Join a community first.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
                    {joined.map(c => (
                      <button key={c.id} onClick={() => setCommunityId(c.id)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                        style={communityId===c.id
                          ? {background:'#5B4FCF',borderColor:'#5B4FCF',color:'white'}
                          : {background:'white',borderColor:'#E5E7EB',color:'#6B7280'}}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between py-1">
            <p className="text-[13px]" style={{ color:'#6B7280' }}>
              As: <span className="font-bold" style={{ color:'#1A1A2E' }}>{displayName}</span>
            </p>
            {user?.name && (
              <button onClick={() => setAnonymous(v => !v)}
                className="flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color:anonymous?'#5B4FCF':'#9CA3AF' }}>
                {anonymous ? <EyeOff size={13} /> : <Eye size={13} />}
                {anonymous?'Post anonymously':'Public name'}
              </button>
            )}
          </div>

          {!user?.name && (
            <p className="text-[12px]" style={{ color:'#9CA3AF' }}>
              No account needed. Posting as Anonymous.
            </p>
          )}

          <button onClick={submit} disabled={!content.trim()}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:typeColor }}>
            Post
          </button>
        </div>
      </motion.div>
    </>
  )
}