'use client'

// ── /communities/[id] ──
// Update 3: WhatsApp/Telegram invite, three-dot menu, no-account posting.

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, PenLine, X, Users, Trash2, MoreVertical,
  Heart, MessageCircle, Share2, Send, ChevronDown, ChevronUp,
  UserPlus, LogOut, Copy, Settings2
} from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { useCheckin } from '../../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  SEED_COMMUNITIES, SEED_CHALLENGES, CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_STYLES,
  avatarColor, initials, todayStr
} from '../../../lib/constants'

const CATEGORY_COLORS = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}
const POST_TYPES = [
  { key:'general',       label:'General',       color:'#888780' },
  { key:'reading',       label:'Reading',       color:'#5B4FCF' },
  { key:'prayer',        label:'Prayer',        color:'#4A7C5F' },
  { key:'encouragement', label:'Encouragement', color:'#E8A838' },
]

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  if (h < 48)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

// ── Invite share sheet ──
function InviteSheet({ community, onClose }) {
  const catColor  = CATEGORY_COLORS[community.category] || '#5B4FCF'
  const inviteUrl = `https://dailywalk.app/join/${community.inviteCode || 'INVITE'}`
  const shareText = `Join me on Daily Walk in "${community.name}"! ${inviteUrl}`

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl).catch(() => {})
    showToast('Link copied!')
  }
  async function handleShare() {
    if (navigator.share) { try { await navigator.share({ text:shareText, url:inviteUrl }) } catch {} }
    else handleCopy()
  }
  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }
  function handleTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join me in "${community.name}" on Daily Walk`)}`, '_blank')
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'85dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-[17px]" style={{ color:'#1A1A2E' }}>Invite to {community.name}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4 scroll-hide">
          {/* Community info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[20px] flex-shrink-0"
              style={{ background:catColor }}>{community.name[0].toUpperCase()}</div>
            <div>
              <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{community.name}</p>
              <div className="flex items-center gap-1 text-[12px]" style={{ color:'#6B7280' }}>
                <Users size={11} /><span>{community.memberCount+1} members</span>
              </div>
            </div>
          </div>

          {/* Link */}
          <div className="flex items-center gap-2 p-3 rounded-[14px] border" style={{ borderColor:'#E8E5E0', background:'#FAF8F5' }}>
            <p className="text-[12px] flex-1 truncate font-mono" style={{ color:'#6B7280' }}>
              dailywalk.app/join/{community.inviteCode||'INVITE'}
            </p>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white flex-shrink-0"
              style={{ background:'#5B4FCF' }}>
              <Copy size={12} /> Copy
            </button>
          </div>

          <button onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 text-white rounded-pill py-3.5 text-[14px] font-bold hover:opacity-90 active:scale-[0.97]"
            style={{ background:'#5B4FCF' }}>
            <Share2 size={16} /> Share via...
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background:'#E8E5E0' }} />
            <p className="text-[12px] font-semibold" style={{ color:'#9CA3AF' }}>Or share directly</p>
            <div className="flex-1 h-px" style={{ background:'#E8E5E0' }} />
          </div>

          <div className="flex gap-3">
            <button onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold border-2 hover:bg-green-50 transition-colors"
              style={{ borderColor:'#25D366', color:'#25D366' }}>
              WhatsApp
            </button>
            <button onClick={handleTelegram}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold border-2 hover:bg-blue-50 transition-colors"
              style={{ borderColor:'#0088cc', color:'#0088cc' }}>
              Telegram
            </button>
            <button onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold border-2 hover:bg-gray-50 transition-colors"
              style={{ borderColor:'#E5E7EB', color:'#6B7280' }}>
              <Copy size={14} /> Copy
            </button>
          </div>

          <p className="text-[12px] text-center" style={{ color:'#9CA3AF' }}>
            {community.visibility==='private' ? '🔒 Only people with this link can join' : 'ⓘ Anyone with this link can join'}
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ── Three-dot menu (Settings | Invite | Share | Leave) ──
function ThreeDotMenu({ community, onInvite, onLeave }) {
  const [open, setOpen] = useState(false)

  function handleLeave() {
    setOpen(false)
    if (confirm(`Leave ${community.name}? You can always rejoin.`)) onLeave()
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center"
        style={{ color:'#1A1A2E' }}>
        <MoreVertical size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity:0, y:-8, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, scale:0.95 }}
              className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[55] overflow-hidden min-w-[180px]">
              {[
                { icon:UserPlus, label:'Invite members', onClick:() => { setOpen(false); onInvite() }, red:false },
                { icon:Share2,   label:'Share community', onClick:() => { setOpen(false); onInvite() }, red:false },
                { icon:Settings2,label:'Settings',        onClick:() => { setOpen(false); showToast('Coming soon') }, red:false },
                { icon:LogOut,   label:'Leave community', onClick:handleLeave, red:true },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${i<3?'border-b border-gray-50':''}`}>
                  <item.icon size={15} style={{ color:item.red?'#EF4444':'#6B7280', flexShrink:0 }} />
                  <span className="text-[13px] font-semibold" style={{ color:item.red?'#EF4444':'#1A1A2E' }}>{item.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Post composer ──
function ComposeSheet({ community, onClose, onPost }) {
  const [postType, setPostType] = useState('general')
  const [content,  setContent]  = useState('')
  const [passage,  setPassage]  = useState('')
  const [user]                  = useLocalStorage('dw_user', null)
  const [anonymous, setAnon]    = useState(!user?.name)
  const { performCheckin, isCheckedInToday } = useCheckin()
  const MAX = 500

  function submit() {
    if (!content.trim()) { showToast('Write something first'); return }
    const name     = anonymous ? 'Anonymous' : (user?.name?.trim() || 'Anonymous')
    const post = {
      id: `p_${Date.now()}`,
      authorId:       anonymous ? 'anonymous' : 'local_user',
      authorName:     name,
      authorInitials: initials(name),
      content:        content.trim(),
      passage:        passage.trim() || undefined,
      type:           postType,
      communityId:    community.id,
      likedBy:        [],
      comments:       [],
      createdAt:      new Date().toISOString(),
    }
    onPost(post)
    if (postType === 'reading' && !isCheckedInToday) {
      performCheckin({ passage: passage.trim(), reflection: content.trim() })
    }
    showToast('Posted!')
    onClose()
  }

  const typeColor = POST_TYPES.find(t => t.key === postType)?.color || '#888780'

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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:'#6B7280' }}>Sharing to</p>
            <p className="font-bold text-[15px] truncate" style={{ color:'#1A1A2E' }}>{community.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-3"><X size={15} /></button>
        </div>

        {/* No-account notice */}
        {!user?.name && (
          <div className="mx-5 px-3 py-2 rounded-[10px] mb-1" style={{ background:'#FFF4DC' }}>
            <p className="text-[12px]" style={{ color:'#B07000' }}>
              Posting as Anonymous. Create an account to post with your name.
            </p>
          </div>
        )}

        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-3 scroll-hide">
          {/* Type pills */}
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {POST_TYPES.map(t => (
              <button key={t.key} onClick={() => setPostType(t.key)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                style={postType===t.key?{background:t.color,borderColor:t.color,color:'white'}:{background:'white',borderColor:'#E5E7EB',color:'#6B7280'}}>
                {t.label}
              </button>
            ))}
          </div>

          {postType === 'reading' && (
            <input type="text" value={passage} onChange={e => setPassage(e.target.value)}
              placeholder="Passage e.g. John 3:16"
              className="w-full border border-gray-200 rounded-input px-4 py-2.5 text-[13px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
              style={{ color:'#1A1A2E' }} />
          )}

          <div className="relative">
            <textarea value={content} onChange={e => setContent(e.target.value.slice(0,MAX))}
              placeholder={{ general:'Share something with the community...', reading:'What stood out to you?', prayer:'Share a prayer request or praise...', encouragement:'Encourage someone today...' }[postType]}
              autoFocus rows={5}
              className="w-full border border-gray-200 rounded-[16px] resize-none px-4 py-3 text-[15px] focus:outline-none transition-all"
              style={{ color:'#1A1A2E', lineHeight:1.7, borderColor:content?typeColor:'#E5E7EB' }}
            />
            <span className="absolute bottom-3 right-3 text-[11px]" style={{ color:content.length>MAX*0.9?'#EF4444':'#9CA3AF' }}>
              {content.length}/{MAX}
            </span>
          </div>

          {/* Anonymous toggle */}
          {user?.name && (
            <div className="flex items-center justify-between py-1">
              <p className="text-[13px]" style={{ color:'#6B7280' }}>
                As: <span className="font-bold" style={{ color:'#1A1A2E' }}>{anonymous?'Anonymous':user.name}</span>
              </p>
              <button onClick={() => setAnon(v=>!v)}
                className="text-[12px] font-semibold"
                style={{ color:anonymous?'#5B4FCF':'#9CA3AF' }}>
                {anonymous?'Post anonymously':'Post with name'}
              </button>
            </div>
          )}

          <button onClick={submit} disabled={!content.trim()}
            className="w-full text-white rounded-pill py-4 text-[15px] font-bold disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:typeColor }}>
            Post to Community
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ── Comment sheet ──
function CommentSheet({ post, onClose, onAddComment }) {
  const [input, setInput] = useState('')
  const [user]            = useLocalStorage('dw_user', null)

  function submit() {
    const text = input.trim()
    if (!text) return
    const name = user?.name?.trim() || 'Anonymous'
    onAddComment(post.id, { id:`cmt_${Date.now()}`, authorId:'local_user', authorName:name, authorInitials:initials(name), content:text, createdAt:new Date().toISOString() })
    setInput('')
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col" style={{ maxHeight:'80dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Comments</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 scroll-hide">
          {(!post.comments||post.comments.length===0) ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle size={28} style={{ color:'#E8E5E0' }} />
              <p className="text-[14px] font-semibold" style={{ color:'#9CA3AF' }}>No comments yet</p>
            </div>
          ) : post.comments.map(cmt => (
            <div key={cmt.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background:avatarColor(cmt.authorName) }}>
                {cmt.authorInitials||initials(cmt.authorName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-[13px]" style={{ color:'#1A1A2E' }}>{cmt.authorName}</span>
                  <span className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(cmt.createdAt)}</span>
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color:'#1A1A2E' }}>{cmt.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 pb-8 border-t border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background:avatarColor(user?.name||'A') }}>
            {initials(user?.name||'A')}
          </div>
          <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
            placeholder="Write a comment..."
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
            style={{ color:'#1A1A2E' }} />
          <button onClick={submit} disabled={!input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40"
            style={{ background:'#5B4FCF' }}>
            <Send size={15} />
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ── Post card ──
function PostCard({ post, onDelete, onLike, onComment }) {
  const [expanded, setExpanded] = useState(false)
  const isLiked  = post.likedBy?.includes('local_user')
  const isLong   = post.content.length > 200
  const typeInfo = POST_TYPES.find(t=>t.key===post.type)||POST_TYPES[0]
  const isOwn    = post.authorId === 'local_user'

  async function handleShare() {
    const text = `${post.authorName} on Daily Walk: "${post.content.slice(0,100)}"`
    if(navigator.share){try{await navigator.share({text})}catch{}}
    else{await navigator.clipboard.writeText(text).catch(()=>{});showToast('Copied!')}
  }

  return (
    <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
              style={{ background:avatarColor(post.authorName) }}>
              {post.authorInitials||initials(post.authorName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[14px]" style={{ color:'#1A1A2E' }}>{post.authorName}</p>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background:`${typeInfo.color}18`, color:typeInfo.color }}>{typeInfo.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px]" style={{ color:'#9CA3AF' }}>{timeAgo(post.createdAt)}</span>
            {isOwn && (
              <button onClick={()=>onDelete(post.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                style={{ color:'#9CA3AF' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {post.passage && (
          <span className="self-start text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background:'#EDE9FF', color:'#5B4FCF' }}>{post.passage}</span>
        )}

        <div>
          <p className="text-[15px] leading-[1.7]" style={{ color:'#1A1A2E' }}>
            {isLong && !expanded ? `${post.content.slice(0,200)}…` : post.content}
          </p>
          {isLong && (
            <button onClick={()=>setExpanded(v=>!v)} className="flex items-center gap-1 mt-1 text-[13px] font-semibold"
              style={{ color:'#5B4FCF' }}>
              {expanded ? <><ChevronUp size={13}/>Less</> : <><ChevronDown size={13}/>Read more</>}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
          <button onClick={()=>onLike(post.id)} className="flex items-center gap-1.5">
            <motion.div animate={isLiked?{scale:[1,1.35,1]}:{}} transition={{duration:0.22}}>
              <Heart size={17} style={{ color:isLiked?'#EF4444':'#9CA3AF', fill:isLiked?'#EF4444':'none' }} />
            </motion.div>
            {(post.likedBy?.length||0)>0 && <span className="text-[13px] font-semibold" style={{ color:isLiked?'#EF4444':'#9CA3AF' }}>{post.likedBy.length}</span>}
          </button>
          <button onClick={()=>onComment(post)} className="flex items-center gap-1.5">
            <MessageCircle size={17} style={{ color:'#9CA3AF' }} />
            {(post.comments?.length||0)>0 && <span className="text-[13px] font-semibold" style={{ color:'#9CA3AF' }}>{post.comments.length}</span>}
          </button>
          <button onClick={handleShare} className="ml-auto">
            <Share2 size={15} style={{ color:'#9CA3AF' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
export default function CommunityDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [compose,   setCompose]   = useState(false)
  const [inviteOpen,setInvite]    = useState(false)
  const [cmtPost,   setCmtPost]   = useState(null)

  const [communities, setCommunities] = useLocalStorage('dw_communities', SEED_COMMUNITIES)
  const [challenges,  setChallenges]  = useLocalStorage('dw_challenges',  SEED_CHALLENGES)
  const [user]                        = useLocalStorage('dw_user', null)
  const [, , hydrated]                = useLocalStorage('dw_communities', SEED_COMMUNITIES)

  const community = (communities||[]).find(c=>c.id===id)
  const catColor  = community ? (CATEGORY_COLORS[community.category]||'#5B4FCF') : '#5B4FCF'

  function updateCommunity(updater) {
    setCommunities(prev=>(prev||[]).map(c=>c.id===id?updater(c):c))
  }
  function toggleJoin() {
    if(!community) return
    updateCommunity(c=>({...c,joined:!c.joined,memberCount:Math.max(0,c.memberCount+(c.joined?-1:1))}))
    showToast(community.joined?'Left community':'Joined!')
  }
  function handlePost(post) { updateCommunity(c=>({...c,posts:[post,...(c.posts||[])]})) }
  function deletePost(postId) { updateCommunity(c=>({...c,posts:(c.posts||[]).filter(p=>p.id!==postId)}));showToast('Deleted') }
  function toggleLike(postId) {
    updateCommunity(c=>({...c,posts:(c.posts||[]).map(p=>{
      if(p.id!==postId) return p
      const liked=p.likedBy?.includes('local_user')
      return {...p,likedBy:liked?(p.likedBy||[]).filter(x=>x!=='local_user'):[...(p.likedBy||[]),'local_user']}
    })}))
  }
  function addComment(postId, comment) {
    updateCommunity(c=>({...c,posts:(c.posts||[]).map(p=>p.id!==postId?p:{...p,comments:[...(p.comments||[]),comment]})}))
    setCmtPost(prev=>prev?{...prev,comments:[...(prev.comments||[]),comment]}:null)
  }
  function handleLeave() { toggleJoin() }

  if (!hydrated) return null
  if (!community) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p style={{ color:'#6B7280' }}>Community not found.</p>
      <button onClick={()=>router.push('/communities')} className="font-semibold underline" style={{ color:'#5B4FCF' }}>Back</button>
    </div>
  )

  const posts = community.posts || []

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden" style={{ background:'#FAF8F5' }}>
      {/* Hero */}
      <div className="relative flex flex-col" style={{ minHeight:160, background:`linear-gradient(135deg,${catColor}22,${catColor}55)` }}>
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <button onClick={()=>router.back()}
            className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center"
            style={{ color:'#1A1A2E' }}>
            <ArrowLeft size={18} />
          </button>
          {community.joined && (
            <ThreeDotMenu community={community} onInvite={()=>setInvite(true)} onLeave={handleLeave} />
          )}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 pb-4 px-4">
          <p className="font-display font-bold" style={{ fontSize:64, lineHeight:1, color:catColor, opacity:0.9 }}>
            {community.name[0].toUpperCase()}
          </p>
          <p className="font-display font-bold text-[22px] mt-1 text-center" style={{ color:'#1A1A2E' }}>{community.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:`${catColor}22`, color:catColor }}>
              {community.category}
            </span>
            <div className="flex items-center gap-1 text-[12px]" style={{ color:'#6B7280' }}>
              <Users size={12}/><span>{community.memberCount+(community.joined?1:0)} members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="px-4 py-4" style={{ borderBottom:'1px solid #F0EDE8' }}>
        {community.joined ? (
          <button onClick={()=>setInvite(true)}
            className="w-full flex items-center justify-center gap-2 rounded-pill py-3 text-[14px] font-bold border-2 hover:bg-purple-light transition-all"
            style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
            <UserPlus size={15} /> Invite Friends
          </button>
        ) : (
          <button onClick={toggleJoin}
            className="w-full text-white rounded-pill py-3.5 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'#5B4FCF' }}>
            Join Community
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 px-4 py-4 pb-28">
        {posts.length===0 ? (
          <div className="bg-white rounded-[20px] p-10 flex flex-col items-center gap-3 text-center"
            style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:`${catColor}15` }}>
              <PenLine size={24} style={{ color:catColor }} />
            </div>
            <p className="font-display text-[16px] font-semibold" style={{ color:'#1A1A2E' }}>No posts yet</p>
            <p className="text-[13px]" style={{ color:'#6B7280' }}>
              {community.joined ? 'Be the first to share something.' : 'Join to see and create posts.'}
            </p>
          </div>
        ) : posts.map((post, i) => (
          <motion.div key={post.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
            <PostCard post={post} onDelete={deletePost} onLike={toggleLike} onComment={p=>setCmtPost(p)} />
          </motion.div>
        ))}
      </div>

      {/* FAB */}
      {community.joined && (
        <button onClick={()=>setCompose(true)}
          className="fixed bottom-28 right-4 w-14 h-14 rounded-full text-white flex items-center justify-center active:scale-95 transition-all z-40"
          style={{ background:'#5B4FCF', boxShadow:'0 4px 20px rgba(91,79,207,0.45)' }}
          aria-label="Post">
          <PenLine size={20}/>
        </button>
      )}

      <AnimatePresence>
        {compose    && <ComposeSheet community={community} onClose={()=>setCompose(false)} onPost={handlePost} />}
        {inviteOpen && <InviteSheet  community={community} onClose={()=>setInvite(false)} />}
        {cmtPost    && <CommentSheet post={cmtPost} onClose={()=>setCmtPost(null)} onAddComment={addComment} />}
      </AnimatePresence>
      <ToastContainer/>
    </div>
  )
}