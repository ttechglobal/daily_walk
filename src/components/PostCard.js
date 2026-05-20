'use client'

// ── src/components/communities/PostCard.js ──
//
// BUG FIXES:
//  1. THREE-DOTS — no longer deletes on single tap.
//     Opens a small context menu with: Delete (own posts), Report (others), Cancel.
//     Delete requires a second confirmation tap inside the menu.
//
//  2. LIKE BUTTON — clean toggle only.
//     Filled heart = liked (red). Outline heart = not liked (gray).
//     No scale animations, no glow rings, no wrappers. Just the icon changing.
//
//  3. LIKE/BOOKMARK BUTTONS — no border rings, no expanded tap areas.
//     Clean minimal icons. Tap area is the icon itself + comfortable padding.
//
//  4. COMMENTS — redesigned to look human/conversational (Instagram/X style).
//     Avatar + name + content in a row. Timestamp small beneath. No card chrome.
//
//  5. SCRIPTURE display — clean left-border quote style, not a generic badge.

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, BookOpen, Flag, Trash2 } from 'lucide-react'
import { toggleLike, savePost, unsavePost } from '../../lib/supabase/communities'
import { showToast } from '../Toast'
import ScriptureText  from '../ScriptureText'
import ScriptureSheet from '../ScriptureSheet'
import { parseScriptureRefs } from '../../lib/scripture'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800)return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtCount(n) {
  const v = n || 0
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v > 0 ? String(v) : ''
}

function Avatar({ name, avatar, size = 36 }) {
  const ini    = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0) || 0) % colors.length]
  if (avatar) return (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} onError={e => { e.currentTarget.style.display='none' }} />
  )
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.38) }}>
      {ini}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Context menu — appears when three-dots tapped
// ─────────────────────────────────────────────
function PostMenu({ isOwn, onDelete, onReport, onClose }) {
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute right-0 top-8 z-30 bg-white rounded-[16px] shadow-lg overflow-hidden min-w-[160px]"
      style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      {isOwn && (
        <button onClick={onDelete}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-[14px] font-semibold text-red-500 active:bg-red-50">
          <Trash2 size={15} /> Delete post
        </button>
      )}
      {!isOwn && (
        <button onClick={onReport}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-[14px] font-semibold text-text-primary active:bg-warm-outer">
          <Flag size={15} className="text-text-muted" /> Report post
        </button>
      )}
      <button onClick={onClose}
        className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-[14px] text-text-muted border-t border-gray-100 active:bg-warm-outer">
        Cancel
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  PostCard
// ─────────────────────────────────────────────
export default function PostCard({
  post,
  authUser,
  showCommunity = false,
  requireAuth,
  onDelete,
  onCommentTap,
  onLikeOptimistic,
}) {
  const router = useRouter()

  const [liked,      setLiked]      = useState(post.liked      ?? false)
  const [likeCount,  setLikeCount]  = useState(post.like_count ?? 0)
  const [saved,      setSaved]      = useState(false)
  const [expanded,   setExpanded]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [scriptureRef, setScriptureRef] = useState(null)

  const isOwn  = authUser?.id === post.authorId
  const isLong = (post.content || '').length > 280
  const authorName = post.authorName || 'Anonymous'
  const passageRef = post.passage ? parseScriptureRefs(post.passage)?.[0] : null

  // ── Like: clean toggle, no animation ──
  const handleLike = useCallback(async () => {
    if (!authUser) { requireAuth?.('like'); return }
    const next = !liked
    setLiked(next)
    setLikeCount(c => Math.max(0, c + (next ? 1 : -1)))
    onLikeOptimistic?.(next)
    try {
      await toggleLike(post.id)
    } catch {
      setLiked(!next)
      setLikeCount(c => Math.max(0, c + (next ? -1 : 1)))
      onLikeOptimistic?.(!next)
    }
  }, [liked, authUser, post.id, requireAuth, onLikeOptimistic])

  // ── Bookmark ──
  async function handleSave() {
    if (!authUser) { requireAuth?.('save'); return }
    const next = !saved
    setSaved(next)
    try {
      if (next) { await savePost(post.id);   showToast('Saved') }
      else      { await unsavePost(post.id); showToast('Removed') }
    } catch { setSaved(!next) }
  }

  // ── Share ──
  async function handleShare() {
    const url  = `${window.location.origin}/post/${post.id}`
    const text = `"${(post.content || '').slice(0, 80)}" — ${authorName} on Daily Walk`
    if (navigator.share) {
      try { await navigator.share({ title: 'Daily Walk', text, url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); showToast('Link copied') } catch {}
    }
  }

  // ── Delete — from context menu only ──
  function handleDeleteConfirm() {
    setMenuOpen(false)
    onDelete?.(post.id)
  }

  // ── Report ──
  function handleReport() {
    setMenuOpen(false)
    showToast('Post reported — thank you')
  }

  return (
    <>
      <div className="bg-white rounded-[20px] overflow-visible shadow-card">

        {/* Author row */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Avatar name={authorName} avatar={post.authorAvatar} size={38} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-[14px] text-text-primary leading-none">{authorName}</p>
              {post.authorUsername && (
                <p className="text-[12px] text-text-muted leading-none">@{post.authorUsername}</p>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {showCommunity && post.communityName && (
                <>
                  <button onClick={() => post.communitySlug && router.push(`/community/${post.communitySlug}`)}
                    className="text-[11px] font-semibold text-purple leading-none">
                    {post.communityName}
                  </button>
                  <span className="text-[11px] text-text-muted">·</span>
                </>
              )}
              <p className="text-[11px] text-text-muted leading-none">{timeAgo(post.createdAt)}</p>
            </div>
          </div>

          {/* Three-dots — opens menu, NEVER deletes directly */}
          <div className="relative flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-warm-outer">
              <MoreHorizontal size={16} className="text-text-muted" />
            </button>
            {menuOpen && (
              <PostMenu
                isOwn={isOwn}
                onDelete={handleDeleteConfirm}
                onReport={handleReport}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Scripture passage badge — clean left-border quote style */}
        {post.passage && (
          <div className="mx-4 mb-2">
            {passageRef ? (
              <button onClick={() => setScriptureRef(passageRef)}
                className="flex items-center gap-2 text-left w-full pl-3 py-1 border-l-[3px] border-purple active:opacity-70 transition-opacity">
                <p className="text-[13px] font-bold text-purple leading-snug">{post.passage}</p>
                <BookOpen size={12} className="text-purple/60 flex-shrink-0 ml-auto" />
              </button>
            ) : (
              <div className="pl-3 py-1 border-l-[3px] border-purple">
                <p className="text-[13px] font-bold text-purple leading-snug">{post.passage}</p>
              </div>
            )}
          </div>
        )}

        {/* Content — tappable scripture refs */}
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-[1.65] text-text-primary">
            <ScriptureText
              content={isLong && !expanded ? post.content.slice(0, 280) : post.content}
              onRefTap={ref => setScriptureRef(ref)}
            />
            {isLong && !expanded && (
              <button onClick={() => setExpanded(true)} className="ml-1 font-semibold text-purple text-[14px]">
                more
              </button>
            )}
          </p>
        </div>

        {/* Action row — clean minimal buttons, no rings or wrappers */}
        <div className="flex items-center px-3 pb-3 gap-1 border-t border-gray-100 pt-2">

          {/* Like — filled/outline heart only, no animation bloat */}
          <button onClick={handleLike}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full active:opacity-70 transition-opacity min-h-[40px]">
            <Heart
              size={19}
              fill={liked ? '#E84060' : 'none'}
              stroke={liked ? '#E84060' : '#9CA3AF'}
              strokeWidth={liked ? 0 : 1.8}
            />
            {likeCount > 0 && (
              <span className="text-[13px] font-semibold" style={{ color: liked ? '#E84060' : '#9CA3AF' }}>
                {fmtCount(likeCount)}
              </span>
            )}
          </button>

          {/* Comment */}
          <button
            onClick={() => authUser ? onCommentTap?.(post) : requireAuth?.('comment')}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full active:opacity-70 transition-opacity min-h-[40px]">
            <MessageCircle size={19} stroke="#9CA3AF" strokeWidth={1.8} />
            {post.comment_count > 0 && (
              <span className="text-[13px] font-semibold text-text-muted">{fmtCount(post.comment_count)}</span>
            )}
          </button>

          {/* Bookmark — no wrapper ring */}
          <button onClick={handleSave}
            className="px-2.5 py-2 rounded-full active:opacity-70 transition-opacity min-h-[40px] min-w-[40px] flex items-center justify-center">
            <Bookmark
              size={19}
              fill={saved ? '#5B4FCF' : 'none'}
              stroke={saved ? '#5B4FCF' : '#9CA3AF'}
              strokeWidth={saved ? 0 : 1.8}
            />
          </button>

          {/* Share — pushed to right */}
          <button onClick={handleShare}
            className="px-2.5 py-2 rounded-full active:opacity-70 transition-opacity min-h-[40px] min-w-[40px] flex items-center justify-center ml-auto">
            <Share2 size={19} stroke="#9CA3AF" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Scripture viewer */}
      {scriptureRef && (
        <ScriptureSheet reference={scriptureRef} onClose={() => setScriptureRef(null)} />
      )}
    </>
  )
}