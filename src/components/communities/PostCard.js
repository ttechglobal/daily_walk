'use client'

// ── src/components/communities/PostCard.js ──
// Uses exact same visual language as Profile/Home:
//   bg-white rounded-[20px] shadow-card
//   Icons 18px — matches app-wide icon sizing
//   Dark mode: Tailwind-based, globals.css handles it

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from 'lucide-react'
import { toggleLike, savePost, unsavePost } from '../../lib/supabase/communities'
import { showToast } from '../Toast'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s/60)}m ago`
  if (s < 86400)  return `${Math.floor(s/3600)}h ago`
  if (s < 172800) return 'yesterday'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}
function fmtCount(n) {
  const v = n||0; return v>=1000?`${(v/1000).toFixed(1)}k`:String(v)
}

function Avatar({ name, avatar, size = 40 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
  )
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.36)}}>
      {ini}
    </div>
  )
}

export default function PostCard({
  post, t, authUser, requireAuth,
  showCommunity=false, onLikeOptimistic, onCommentTap, onDelete,
}) {
  const router = useRouter()
  const [liked,     setLiked]     = useState(post.liked||false)
  const [likeCount, setLikeCount] = useState(post.like_count||0)
  const [likeAnim,  setLikeAnim]  = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [expanded,  setExpanded]  = useState(false)

  const authorName = post.authorName||post.authorUsername||'Anonymous'
  const isLong     = (post.content||'').length > 280
  const isOwn      = authUser?.id === post.authorId

  async function handleLike() {
    if (!authUser) { requireAuth?.('like'); return }
    const nowLiked = !liked
    setLiked(nowLiked); setLikeCount(c=>Math.max(0,c+(nowLiked?1:-1)))
    setLikeAnim(true); setTimeout(()=>setLikeAnim(false),400)
    if (onLikeOptimistic) onLikeOptimistic(nowLiked)
    try { await toggleLike(post.id) }
    catch { setLiked(!nowLiked); setLikeCount(c=>Math.max(0,c+(nowLiked?-1:1))) }
  }

  async function handleSave() {
    if (!authUser) { requireAuth?.('save'); return }
    const nowSaved = !saved; setSaved(nowSaved)
    try {
      if (nowSaved) { await savePost(post.id); showToast('Post saved') }
      else          { await unsavePost(post.id); showToast('Removed') }
    } catch { setSaved(!nowSaved) }
  }

  async function handleShare() {
    const url = `${window.location.origin}/community/${post.communitySlug||post.communityId||''}`
    try {
      if (navigator.share) await navigator.share({title:'Daily Walk',text:`"${(post.content||'').slice(0,80)}"`,url})
      else { await navigator.clipboard.writeText(url); showToast('Link copied!') }
    } catch {}
  }

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card">
      {/* Top row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <Avatar name={authorName} avatar={post.authorAvatar} size={40}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[14px] text-text-primary">{authorName}</p>
            {post.authorUsername && post.authorUsername!==authorName && (
              <p className="text-[12px] text-text-muted">@{post.authorUsername}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {showCommunity&&post.communityName&&(
              <button onClick={()=>post.communitySlug&&router.push(`/community/${post.communitySlug}`)}
                className="text-[12px] font-semibold text-purple">{post.communityName}</button>
            )}
            {showCommunity&&post.communityName&&<span className="text-text-muted text-[12px]">·</span>}
            <p className="text-[12px] text-text-muted">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {isOwn&&onDelete&&(
          <button onClick={()=>onDelete(post.id)}
            className="w-8 h-8 rounded-full bg-warm-outer flex items-center justify-center flex-shrink-0">
            <MoreHorizontal size={15} className="text-text-muted"/>
          </button>
        )}
      </div>

      {/* Scripture badge */}
      {post.passage&&(
        <div className="mx-4 mb-2 px-3 py-2 rounded-[12px] bg-purple-light border-l-[3px] border-purple">
          <p className="text-[12px] font-bold text-purple">{post.passage}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-[1.7] text-text-primary">
          {isLong&&!expanded?post.content.slice(0,280):post.content}
          {isLong&&!expanded&&(
            <button onClick={()=>setExpanded(true)} className="ml-1 font-bold text-purple">Read more</button>
          )}
        </p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-0.5 px-2 pb-3 pt-1 border-t border-gray-100">
        <button onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px]"
          style={{color:liked?'#E84060':'#6B7280',background:liked?'#FFF0F3':'transparent'}}>
          <motion.div animate={likeAnim?{scale:[1,1.5,1]}:{}} transition={{duration:0.35}}>
            <Heart size={18} fill={liked?'#E84060':'none'} color={liked?'#E84060':'#6B7280'}/>
          </motion.div>
          <span className="text-[13px] font-semibold">{fmtCount(likeCount)}</span>
        </button>

        <button onClick={()=>authUser?onCommentTap?.(post):requireAuth?.('comment')}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px] text-text-muted">
          <MessageCircle size={18}/>
          <span className="text-[13px] font-semibold">{fmtCount(post.comment_count)}</span>
        </button>

        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px] text-text-muted">
          <Share2 size={18}/>
        </button>

        <button onClick={handleSave}
          className={`ml-auto flex items-center px-3 py-2.5 rounded-full transition-all active:scale-90 min-h-[44px] ${saved?'text-purple bg-purple-light':'text-text-muted'}`}>
          <motion.div animate={saved?{scale:[1,1.35,1]}:{}} transition={{duration:0.3}}>
            <Bookmark size={18} fill={saved?'#5B4FCF':'none'}/>
          </motion.div>
        </button>
      </div>
    </div>
  )
}