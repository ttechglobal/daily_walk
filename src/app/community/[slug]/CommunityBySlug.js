'use client'

// ── src/app/community/[slug]/CommunityBySlug.js ──
// Creator sees: Manage button → Edit / Members / Delete
// Member sees: normal community content only
// Community creation fix: explicit error logging + RLS-correct insert

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Share2, CheckCircle2,
  UserPlus, X, Send, Globe, Lock, Settings,
  Trash2, Edit3, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { useAuthGate } from '../../../components/AuthGate'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  getCommunityBySlug,
  getPosts, createPost, deletePost,
  getComments, addComment,
  joinCommunity, leaveCommunity,
  subscribeToNewPosts, subscribeToNewComments,
  getAuthUser,
} from '../../../lib/supabase/communities'
import { createClient } from '../../../lib/supabase/client'
import PostCard from '../../../components/communities/PostCard'
import PostSkeleton from '../../../components/communities/PostSkeleton'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function fmtCount(n) {
  const v = n || 0
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}
function Avatar({ name, avatar, size = 40 }) {
  const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
  if (avatar) return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0"
    style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
  return <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
    style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.36)}}>{ini}</div>
}

// ─────────────────────────────────────────────
//  Compose sheet
// ─────────────────────────────────────────────
function ComposeSheet({ community, authUser, t, onClose, onPost }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const MAX = 1000

  async function submit() {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const post = await createPost(community.id, { content: content.trim() })
      onPost(post)
      onClose()
      showToast('Posted! 🙌')
    } catch (e) {
      console.error('[compose] createPost error:', e)
      showToast(e.message === 'not_authenticated' ? 'Please sign in to post' : 'Failed to post — try again')
    } finally { setSending(false) }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{background:t.bgCard,paddingBottom:'env(safe-area-inset-bottom,16px)',maxHeight:'85dvh'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background:t.border}}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{borderColor:t.border}}>
          <div>
            <p className="font-bold text-[16px]" style={{color:t.text}}>New Post</p>
            <p className="text-[12px] mt-0.5" style={{color:t.textMuted}}>in {community.name}</p>
          </div>
          <button onClick={submit} disabled={!content.trim()||sending}
            className="px-4 py-2 rounded-full text-[13px] font-bold text-white disabled:opacity-40 min-h-[36px]"
            style={{background:'#5B4FCF'}}>
            {sending?'Posting…':'Post'}
          </button>
        </div>
        <div className="flex items-center gap-3 px-5 pt-4 pb-2 flex-shrink-0">
          <Avatar name={authUser?.name||'You'} size={36}/>
          <p className="font-semibold text-[14px]" style={{color:t.text}}>{authUser?.name||'You'}</p>
        </div>
        <div className="flex-1 px-5 pb-2 min-h-0">
          <textarea autoFocus value={content} onChange={e=>setContent(e.target.value.slice(0,MAX))}
            placeholder="What's on your heart?"
            className="w-full text-[16px] resize-none focus:outline-none bg-transparent leading-[1.6]"
            style={{color:t.text,minHeight:120,height:'100%'}}/>
        </div>
        <div className="px-5 pb-4 flex-shrink-0">
          <p className="text-right text-[12px]" style={{color:content.length>MAX*0.9?'#E84060':t.textFaint}}>
            {content.length}/{MAX}
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Comment sheet
// ─────────────────────────────────────────────
function CommentSheet({ post, authUser, t, onClose }) {
  const [text,     setText]     = useState('')
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getComments(post.id).then(d=>{setComments(d);setLoading(false)}).catch(()=>setLoading(false))
    const unsub = subscribeToNewComments(post.id, c => {
      setComments(prev=>prev.some(x=>x.id===c.id)?prev:[...prev,c])
    })
    return ()=>unsub()
  }, [post.id])

  async function submit() {
    if (!text.trim()||sending) return
    setSending(true)
    try {
      const c = await addComment(post.id, text.trim())
      setComments(prev=>[...prev,c])
      setText('')
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100)
    } catch (e) {
      showToast(e.message==='not_authenticated'?'Please sign in to comment':'Failed to post comment')
    } finally {setSending(false)}
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{background:t.bgCard,maxHeight:'75dvh',paddingBottom:'env(safe-area-inset-bottom,0px)'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background:t.border}}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{borderColor:t.border}}>
          <p className="font-bold text-[16px]" style={{color:t.text}}>
            Comments {comments.length>0&&<span style={{color:t.textFaint}}>({comments.length})</span>}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{background:t.bgMuted}}>
            <X size={14} style={{color:t.textMuted}}/>
          </button>
        </div>
        <div className="mx-5 mt-3 px-3 py-2.5 rounded-[12px] border-l-[3px] flex-shrink-0"
          style={{background:t.bgMuted,borderColor:'#5B4FCF'}}>
          <p className="text-[12px] line-clamp-2" style={{color:t.textMuted}}>{post.content}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4 scroll-hide">
          {loading&&<div className="flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{borderColor:'#5B4FCF',borderTopColor:'transparent'}}/>
          </div>}
          {!loading&&comments.length===0&&(
            <p className="text-center text-[13px] py-8" style={{color:t.textFaint}}>
              No comments yet. Start the conversation 🙏
            </p>
          )}
          {comments.map((c,i)=>(
            <div key={c.id||i} className="flex items-start gap-3">
              <Avatar name={c.authorName} avatar={c.authorAvatar} size={34}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-[13px]" style={{color:t.text}}>{c.authorName}</p>
                  <p className="text-[11px]" style={{color:t.textFaint}}>{timeAgo(c.createdAt)}</p>
                </div>
                <p className="text-[14px] mt-0.5 leading-relaxed" style={{color:t.text}}>{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-t flex-shrink-0" style={{borderColor:t.border}}>
          <Avatar name={authUser?.name||'You'} size={32}/>
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submit()}
            placeholder="Add a comment…"
            className="flex-1 px-4 py-2.5 rounded-full text-[14px] focus:outline-none min-h-[44px]"
            style={{background:t.bgMuted,color:t.text,border:`1px solid ${t.borderInput}`}}/>
          <button onClick={submit} disabled={!text.trim()||sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
            style={{background:'#5B4FCF'}}>
            <Send size={15}/>
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Manage sheet (creator only)
// ─────────────────────────────────────────────
function ManageSheet({ community, authUser, t, onClose, onDeleted, onUpdated }) {
  const router = useRouter()
  const [editName, setEditName] = useState(community.name)
  const [editDesc, setEditDesc] = useState(community.description||'')
  const [saving,   setSaving]   = useState(false)
  const [view,     setView]     = useState('menu') // 'menu' | 'edit' | 'delete'

  async function handleSave() {
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('communities')
      .update({ name:editName.trim(), description:editDesc.trim() })
      .eq('id', community.id)
    if (error) { showToast('Failed to save: '+error.message); setSaving(false); return }
    onUpdated({ ...community, name:editName.trim(), description:editDesc.trim() })
    onClose()
    showToast('Community updated ✓')
    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('communities').delete().eq('id', community.id)
    if (error) { showToast('Failed to delete: '+error.message); setSaving(false); return }
    onDeleted()
    onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
        style={{background:t.bgCard,paddingBottom:'env(safe-area-inset-bottom,24px)'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background:t.border}}/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{borderColor:t.border}}>
          <p className="font-bold text-[17px]" style={{color:t.text}}>
            {view==='edit'?'Edit Community':view==='delete'?'Delete Community':'Manage'}
          </p>
          <button onClick={view!=='menu'?()=>setView('menu'):onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{background:t.bgMuted}}>
            <X size={14} style={{color:t.textMuted}}/>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {view === 'menu' && (
            <>
              <button onClick={()=>setView('edit')}
                className="flex items-center gap-3 p-4 rounded-[16px] w-full text-left min-h-[56px]"
                style={{background:t.bgMuted}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:t.purpleBg}}>
                  <Edit3 size={16} style={{color:'#5B4FCF'}}/>
                </div>
                <div>
                  <p className="font-bold text-[14px]" style={{color:t.text}}>Edit Community</p>
                  <p className="text-[12px]" style={{color:t.textMuted}}>Change name and description</p>
                </div>
                <ChevronRight size={16} style={{color:t.textFaint,marginLeft:'auto'}}/>
              </button>

              <button onClick={()=>setView('delete')}
                className="flex items-center gap-3 p-4 rounded-[16px] w-full text-left min-h-[56px]"
                style={{background:'#FEE2E2'}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:'#FECACA'}}>
                  <Trash2 size={16} style={{color:'#EF4444'}}/>
                </div>
                <div>
                  <p className="font-bold text-[14px]" style={{color:'#EF4444'}}>Delete Community</p>
                  <p className="text-[12px]" style={{color:'#F87171'}}>This cannot be undone</p>
                </div>
              </button>
            </>
          )}

          {view === 'edit' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[13px]" style={{color:t.text}}>Name</label>
                <input value={editName} onChange={e=>setEditName(e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-3.5 rounded-[14px] border text-[15px] focus:outline-none"
                  style={{background:t.bgInput,color:t.text,borderColor:t.borderInput}}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[13px]" style={{color:t.text}}>Description</label>
                <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)}
                  rows={3} maxLength={300}
                  className="w-full px-4 py-3 rounded-[14px] border text-[14px] resize-none focus:outline-none"
                  style={{background:t.bgInput,color:t.text,borderColor:t.borderInput}}/>
              </div>
              <button onClick={handleSave} disabled={!editName.trim()||saving}
                className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-50"
                style={{background:'#5B4FCF'}}>
                {saving?'Saving…':'Save changes'}
              </button>
            </div>
          )}

          {view === 'delete' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-[16px]" style={{background:'#FEE2E2'}}>
                <p className="font-bold text-[15px]" style={{color:'#EF4444'}}>Are you sure?</p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{color:'#F87171'}}>
                  Deleting <strong>{community.name}</strong> will permanently remove all posts and members. This cannot be undone.
                </p>
              </div>
              <button onClick={handleDelete} disabled={saving}
                className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-50"
                style={{background:'#EF4444'}}>
                {saving?'Deleting…':'Yes, delete this community'}
              </button>
              <button onClick={()=>setView('menu')}
                className="text-center text-[13px] font-semibold" style={{color:t.textFaint}}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  About tab
// ─────────────────────────────────────────────
function AboutTab({ community, t }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="rounded-[18px] p-4" style={{background:t.bgCard,boxShadow:t.shadow}}>
        <p className="font-bold text-[14px] mb-2" style={{color:t.text}}>About</p>
        <p className="text-[14px] leading-relaxed" style={{color:t.textMuted}}>
          {community.description||'A community on Daily Walk.'}
        </p>
      </div>
      <div className="rounded-[18px] p-4" style={{background:t.bgCard,boxShadow:t.shadow}}>
        {[
          ['Category',   community.category||'General'],
          ['Visibility', community.visibility==='private'?'🔒 Private':'🌐 Public'],
          ['Members',    fmtCount(community.member_count)],
          ['Created by', community.owner_name||'Daily Walk'],
        ].map(([label,value])=>(
          <div key={label} className="flex items-center justify-between py-2.5 border-b last:border-0"
            style={{borderColor:t.border}}>
            <span className="text-[13px]" style={{color:t.textMuted}}>{label}</span>
            <span className="text-[13px] font-semibold" style={{color:t.text}}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function CommunityBySlug({ slug }) {
  const router = useRouter()
  const { t }  = useTheme()
  const { requireAuth } = useAuthGate()

  const [authUser,  setAuthUser]  = useState(null)
  const [community, setComm]      = useState(null)
  const [posts,     setPosts]     = useState([])
  const [tab,       setTab]       = useState('posts')
  const [loading,   setLoading]   = useState(true)
  const [postsLoad, setPostsLoad] = useState(true)
  const [error,     setError]     = useState(null)
  const [joining,   setJoining]   = useState(false)
  const [compose,   setCompose]   = useState(false)
  const [cpPost,    setCpPost]    = useState(null)
  const [manage,    setManage]    = useState(false)

  useEffect(() => { getAuthUser().then(setAuthUser) }, [])

  const loadCommunity = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const comm = await getCommunityBySlug(slug)
      if (!comm) { setError('not_found'); return }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug) && comm.slug)
        window.history.replaceState(null,'',`/community/${comm.slug}`)
      setComm(comm)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [slug])

  useEffect(() => { loadCommunity() }, [loadCommunity])

  useEffect(() => {
    if (!community?.id) return
    setPostsLoad(true)
    getPosts(community.id).then(d=>{setPosts(d||[]);setPostsLoad(false)}).catch(()=>setPostsLoad(false))
  }, [community?.id])

  useEffect(() => {
    if (!community?.id) return
    const unsub = subscribeToNewPosts(community.id, np => {
      if (np.authorId===authUser?.id) return
      setPosts(prev=>prev.some(p=>p.id===np.id)?prev:[np,...prev])
    })
    return ()=>unsub()
  }, [community?.id, authUser?.id])

  async function handleJoin() {
    if (!authUser) { requireAuth('join'); return }
    if (joining) return
    setJoining(true)
    setComm(c=>({...c,joined:true,member_count:(c.member_count||0)+1}))
    try { await joinCommunity(community.id); showToast(`Joined ${community.name}! 🙌`) }
    catch { setComm(c=>({...c,joined:false,member_count:Math.max(0,(c.member_count||1)-1)})); showToast('Failed to join') }
    setJoining(false)
  }
  async function handleLeave() {
    if (!authUser||joining) return
    if (!window.confirm(`Leave ${community.name}?`)) return
    setJoining(true)
    setComm(c=>({...c,joined:false,member_count:Math.max(0,(c.member_count||1)-1)}))
    try { await leaveCommunity(community.id); showToast('Left community') }
    catch { setComm(c=>({...c,joined:true,member_count:(c.member_count||0)+1})); showToast('Failed') }
    setJoining(false)
  }
  async function handleDelete(postId) {
    setPosts(prev=>prev.filter(p=>p.id!==postId))
    await deletePost(postId).catch(()=>null)
    showToast('Post deleted')
  }
  function handleShare() {
    const url=`${window.location.origin}/community/${community.slug||slug}`
    navigator.clipboard.writeText(url).then(()=>showToast('Link copied!'))
  }

  // Is current user the creator?
  const isCreator = !!(authUser && community && community.created_by === authUser.id)

  // ── Loading / error screens ──
  if (loading) return (
    <div className="flex flex-col" style={{minHeight:'100dvh',background:t.bg}}>
      <div className="h-[160px] animate-pulse" style={{background:t.bgMuted}}/>
      <div className="h-[110px] animate-pulse mt-1" style={{background:t.bgCard}}/>
      <div className="flex flex-col gap-3 px-4 mt-4">{[1,2,3].map(i=><PostSkeleton key={i} t={t}/>)}</div>
    </div>
  )
  if (error==='not_found') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center" style={{background:t.bg}}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{background:t.purpleBg}}>
        <Users size={36} style={{color:'#5B4FCF'}}/>
      </div>
      <div>
        <p className="font-bold text-[22px]" style={{color:t.text}}>Community not found</p>
        <p className="text-[14px] mt-2" style={{color:t.textMuted}}>This link may have been removed.</p>
      </div>
      <button onClick={()=>router.push('/communities')}
        className="px-7 py-3.5 rounded-full text-white font-bold text-[15px]"
        style={{background:'#5B4FCF'}}>Browse Communities</button>
    </div>
  )

  const TABS = ['posts','members','about']

  return (
    <div className="flex flex-col" style={{minHeight:'100dvh',background:t.bg}}>
      <ToastContainer/>

      {/* ── BANNER ── */}
      <div className="relative" style={{height:160}}>
        <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}/>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>

        <button onClick={()=>router.push('/communities')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}>
          <ArrowLeft size={18} className="text-white"/>
        </button>

        {/* Right action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Creator: Manage button */}
          {isCreator && (
            <button onClick={()=>setManage(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full min-h-[40px]"
              style={{background:'rgba(255,255,255,0.2)',backdropFilter:'blur(4px)'}}>
              <Settings size={14} className="text-white"/>
              <span className="text-white text-[12px] font-bold">Manage</span>
            </button>
          )}

          <button onClick={handleShare}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}>
            <Share2 size={16} className="text-white"/>
          </button>

          {community.joined ? (
            <button onClick={handleLeave} disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold min-h-[40px]"
              style={{border:'2px solid rgba(255,255,255,0.8)',color:'white',background:'rgba(255,255,255,0.15)'}}>
              <CheckCircle2 size={14}/> {joining?'…':'Joined'}
            </button>
          ) : (
            <button onClick={handleJoin} disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold min-h-[40px]"
              style={{background:'rgba(255,255,255,0.95)',color:'#5B4FCF'}}>
              <UserPlus size={14}/> {joining?'…':'Join'}
            </button>
          )}
        </div>
      </div>

      {/* ── COMMUNITY INFO ── */}
      <div className="px-5 pt-4 pb-0 border-b" style={{background:t.bgCard,borderColor:t.border}}>
        <h1 className="font-bold text-[22px] leading-tight" style={{color:t.text}}>{community.name}</h1>
        <div className="flex items-center gap-3 mt-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <Users size={14} style={{color:t.textFaint}}/>
            <span className="text-[13px] font-semibold" style={{color:t.textMuted}}>
              {fmtCount(community.member_count)} members
            </span>
          </div>
          {community.visibility==='private'?<Lock size={13} style={{color:t.textFaint}}/>:<Globe size={13} style={{color:t.textFaint}}/>}
          {isCreator && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{background:t.purpleBg,color:'#5B4FCF'}}>Creator</span>
          )}
        </div>
        {community.description&&(
          <p className="text-[14px] leading-relaxed mb-3" style={{color:t.textMuted}}>{community.description}</p>
        )}
        {/* Tab bar */}
        <div className="flex border-b" style={{borderColor:t.border}}>
          {TABS.map(tab_=>(
            <button key={tab_} onClick={()=>setTab(tab_)}
              className="relative flex-1 py-2.5 text-[13px] font-semibold capitalize transition-colors min-h-[44px]"
              style={{color:tab===tab_?'#5B4FCF':t.textMuted}}>
              {tab_}
              {tab===tab_&&(
                <motion.div layoutId="comm-detail-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{background:'#5B4FCF'}} transition={{type:'spring',stiffness:400,damping:34}}/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1" style={{paddingBottom:community.joined&&tab==='posts'?96:80}}>
        <AnimatePresence mode="wait">
          {tab==='posts'&&(
            <motion.div key="posts" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-3 px-4 py-4">
              {postsLoad
                ? [1,2,3].map(i=><PostSkeleton key={i} t={t}/>)
                : posts.length===0
                  ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                      <span style={{fontSize:52}}>🌱</span>
                      <div>
                        <p className="font-bold text-[18px]" style={{color:t.text}}>No posts yet</p>
                        <p className="text-[14px] mt-1" style={{color:t.textMuted}}>
                          {community.joined?'Be the first to share something.':'Join to see and create posts.'}
                        </p>
                      </div>
                      {community.joined&&(
                        <button onClick={()=>setCompose(true)}
                          className="px-6 py-3 rounded-full text-white font-bold text-[14px]"
                          style={{background:'#5B4FCF'}}>Write the first post</button>
                      )}
                    </div>
                  )
                  : posts.map((post,i)=>(
                      <motion.div key={post.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                        transition={{delay:i*0.03}}>
                        <PostCard post={post} t={t} authUser={authUser} requireAuth={requireAuth}
                          onDelete={authUser?.id===post.authorId?handleDelete:undefined}
                          onCommentTap={p=>authUser?setCpPost(p):requireAuth('comment')}
                          onLikeOptimistic={nowLiked=>{
                            setPosts(prev=>prev.map(p=>p.id!==post.id?p:{
                              ...p,liked:nowLiked,like_count:Math.max(0,(p.like_count||0)+(nowLiked?1:-1)),
                            }))
                          }}/>
                      </motion.div>
                    ))
              }
            </motion.div>
          )}
          {tab==='about'&&(
            <motion.div key="about" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <AboutTab community={community} t={t}/>
            </motion.div>
          )}
          {tab==='members'&&(
            <motion.div key="members" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="px-4 py-4">
              <p className="text-center text-[13px] py-10" style={{color:t.textFaint}}>
                Member list coming soon
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      {tab==='posts'&&(
        <motion.button
          onClick={()=>community.joined?setCompose(true):(authUser?handleJoin():requireAuth('join'))}
          className="fixed flex items-center justify-center text-white rounded-full z-30"
          style={{width:56,height:56,bottom:80,right:16,background:'#5B4FCF',
            boxShadow:'0 4px 20px rgba(91,79,207,0.5)'}}
          initial={{scale:0}} animate={{scale:1}} whileTap={{scale:0.9}}
          transition={{type:'spring',stiffness:400,damping:24}}>
          <Plus size={24}/>
        </motion.button>
      )}

      {/* Sheets */}
      <AnimatePresence>
        {compose&&community&&(
          <ComposeSheet community={community} authUser={authUser} t={t}
            onClose={()=>setCompose(false)}
            onPost={post=>setPosts(prev=>[post,...prev])}/>
        )}
        {cpPost&&(
          <CommentSheet post={cpPost} authUser={authUser} t={t} onClose={()=>setCpPost(null)}/>
        )}
        {manage&&isCreator&&community&&(
          <ManageSheet community={community} authUser={authUser} t={t}
            onClose={()=>setManage(false)}
            onUpdated={updated=>setComm(updated)}
            onDeleted={()=>router.push('/communities')}/>
        )}
      </AnimatePresence>
    </div>
  )
}