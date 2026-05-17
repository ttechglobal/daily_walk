'use client'

// ── src/components/communities/PostCard.js ──
// Used in: For You feed, community post list, profile saved posts.
// Identical spec in every context.
// Dark mode via t (theme token object).
// Optimistic like — count updates instantly, confirms in background.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from 'lucide-react'
import { toggleLike, savePost, unsavePost, isPostSaved } from '../../lib/supabase/communities'
import { showToast } from '../Toast'

// ── Helpers ──
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 172800) return 'yesterday'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtCount(n) {
  const v = n || 0
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}

// ── Avatar ──
function Avatar({ name, avatar, size = 40, t }) {
  const ini = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const color  = colors[(ini.charCodeAt(0) || 0) % colors.length]

  if (avatar) {
    return (
      <img src={avatar} alt={name}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display='none' }}
      />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.36) }}>
      {ini}
    </div>
  )
}

// ── Main PostCard ──
export default function PostCard({
  post,
  t,
  authUser,
  requireAuth,
  showCommunity = false,
  onLikeOptimistic,    // (nowLiked: boolean) => void — parent updates its list
  onCommentTap,        // (post) => void — parent opens comment sheet
  onDelete,            // (postId) => void — optional
}) {
  const router = useRouter()

  const [liked,      setLiked]      = useState(post.liked || false)
  const [likeCount,  setLikeCount]  = useState(post.like_count || 0)
  const [likeAnim,   setLikeAnim]   = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveAnim,   setSaveAnim]   = useState(false)
  const [expanded,   setExpanded]   = useState(false)

  const authorName    = post.authorName || post.authorUsername || 'Anonymous'
  const isLong        = (post.content || '').length > 280
  const isOwn         = authUser?.id === post.authorId

  // ── Like ──
  async function handleLike() {
    if (!authUser) { requireAuth?.('like'); return }
    const nowLiked = !liked
    setLiked(nowLiked)
    setLikeCount(c => Math.max(0, c + (nowLiked ? 1 : -1)))
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 400)
    if (onLikeOptimistic) onLikeOptimistic(nowLiked)
    try {
      await toggleLike(post.id)
    } catch {
      // Revert on error
      setLiked(!nowLiked)
      setLikeCount(c => Math.max(0, c + (nowLiked ? -1 : 1)))
    }
  }

  // ── Save ──
  async function handleSave() {
    if (!authUser) { requireAuth?.('save'); return }
    const nowSaved = !saved
    setSaved(nowSaved)
    setSaveAnim(true)
    setTimeout(() => setSaveAnim(false), 400)
    try {
      if (nowSaved) { await savePost(post.id); showToast('Post saved') }
      else          { await unsavePost(post.id); showToast('Removed from saved') }
    } catch {
      setSaved(!nowSaved)
    }
  }

  // ── Share ──
  async function handleShare() {
    const communitySlug = post.communitySlug || post.communityId || ''
    const url = `${window.location.origin}/community/${communitySlug}`
    const text = `"${(post.content||'').slice(0,80)}" — Daily Walk`
    try {
      if (navigator.share) await navigator.share({ title: 'Daily Walk', text, url })
      else { await navigator.clipboard.writeText(url); showToast('Link copied!') }
    } catch {}
  }

  // ── Comment ──
  function handleComment() {
    if (!authUser) { requireAuth?.('comment'); return }
    if (onCommentTap) onCommentTap(post)
  }

  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: t.bgCard, boxShadow: t.shadow }}>
      {/* Top row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <Avatar name={authorName} avatar={post.authorAvatar} size={40} t={t}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[14px]" style={{ color: t.text }}>{authorName}</p>
            {post.authorUsername && post.authorUsername !== authorName && (
              <p className="text-[12px]" style={{ color: t.textFaint }}>@{post.authorUsername}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {showCommunity && post.communityName && (
              <button
                onClick={() => post.communitySlug && router.push(`/community/${post.communitySlug}`)}
                className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
                {post.communityName}
              </button>
            )}
            {showCommunity && post.communityName && (
              <span style={{ color: t.textFaint, fontSize: 12 }}>·</span>
            )}
            <p className="text-[12px]" style={{ color: t.textFaint }}>{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {isOwn && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: t.bgMuted }}>
            <MoreHorizontal size={15} style={{ color: t.textMuted }}/>
          </button>
        )}
      </div>

      {/* Scripture badge */}
      {post.passage && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-[12px]"
          style={{ background: t.bgCardAlt || t.bgMuted, borderLeft: '3px solid #5B4FCF' }}>
          <p className="text-[12px] font-bold" style={{ color: '#5B4FCF' }}>{post.passage}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-[1.6]" style={{ color: t.text }}>
          {isLong && !expanded ? post.content.slice(0, 280) : post.content}
          {isLong && !expanded && (
            <button onClick={() => setExpanded(true)}
              className="ml-1 font-bold" style={{ color: '#5B4FCF' }}>
              Read more
            </button>
          )}
        </p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-0.5 px-2 pb-3 pt-1 border-t" style={{ borderColor: t.border }}>
        {/* Like */}
        <button onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px]"
          style={{ color: liked ? '#E84060' : t.textMuted, background: liked ? '#FF006610' : 'transparent' }}>
          <motion.div animate={likeAnim ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.35 }}>
            <Heart size={18} fill={liked ? '#E84060' : 'none'} />
          </motion.div>
          <span className="text-[13px] font-semibold">{fmtCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={handleComment}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px]"
          style={{ color: t.textMuted }}>
          <MessageCircle size={18} />
          <span className="text-[13px] font-semibold">{fmtCount(post.comment_count)}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px]"
          style={{ color: t.textMuted }}>
          <Share2 size={18} />
        </button>

        {/* Save — pushed right */}
        <button onClick={handleSave}
          className="ml-auto flex items-center px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px]"
          style={{ color: saved ? '#5B4FCF' : t.textMuted, background: saved ? t.purpleBg : 'transparent' }}>
          <motion.div animate={saveAnim ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>
            <Bookmark size={18} fill={saved ? '#5B4FCF' : 'none'} />
          </motion.div>
        </button>
      </div>
    </div>
  )
}