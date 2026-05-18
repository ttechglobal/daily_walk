'use client'

// ── src/app/community/[slug]/CommunityBySlug.js ──
// Compact tabs: text-[12px] py-1.5 — matches profile + communities tab style.
// PostComposer replaces old inline ComposeSheet.
// Creator Manage panel intact.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Plus, Share2, CheckCircle2,
  UserPlus, X, Send, Globe, Lock, Settings,
  Trash2, Edit3, ChevronRight,
} from 'lucide-react'
import { useAuthGate }               from '../../../components/AuthGate'
import { ToastContainer, showToast } from '../../../components/Toast'
import PostComposer                  from '../../../components/PostComposer'
import {
  getCommunityBySlug,
  getPosts, deletePost,
  getComments, addComment,
  joinCommunity, leaveCommunity,
  subscribeToNewPosts, subscribeToNewComments,
  getAuthUser,
} from '../../../lib/supabase/communities'
import { createClient }              from '../../../lib/supabase/client'
import PostCard                      from '../../../components/communities/PostCard'
import PostSkeleton                  from '../../../components/communities/PostSkeleton'

function fmtCount(n) { const v=n||0; return v>=1000?`${(v/1000).toFixed(1)}k`:String(v) }
function timeAgo(d) {
  if (!d) return ''
  const s=(Date.now()-new Date(d).getTime())/1000
  if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)}m ago`
  if(s<86400)return `${Math.floor(s/3600)}h ago`
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}
function Avatar({name,avatar,size=40}){
  const ini=(name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const colors=['#5B4FCF','#4A7C5F','#E8A838','#E84060','#7CB9E8','#C77DFF']
  const bg=colors[(ini.charCodeAt(0)||0)%colors.length]
  if(avatar)return<img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
  return<div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.36)}}>{ini}</div>
}

// ─────────────────────────────────────────────
//  Comment sheet
// ─────────────────────────────────────────────
function CommentSheet({ post, authUser, onClose }) {
  const { requireAuth } = useAuthGate()
  const [text,     setText]     = useState('')
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getComments(post.id).then(d=>{setComments(d);setLoading(false)}).catch(()=>setLoading(false))
    const unsub = subscribeToNewComments(post.id, c=>{
      setComments(prev=>prev.some(x=>x.id===c.id)?prev:[...prev,c])
    })
    return ()=>unsub()
  },[post.id])

  async function submit() {
    if (!authUser) { requireAuth('comment'); return }
    if (!text.trim()||sending) return
    setSending(true)
    try {
      const c = await addComment(post.id,text.trim())
      setComments(prev=>[...prev,c]); setText('')
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100)
    } catch(e){ showToast('Failed to post comment') }
    finally{setSending(false)}
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{maxHeight:'75dvh',paddingBottom:'env(safe-area-inset-bottom,0px)'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-warm-outer"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-[16px] text-text-primary">
            Comments {comments.length>0&&<span className="text-text-muted">({comments.length})</span>}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-warm-outer flex items-center justify-center">
            <X size={14} className="text-text-muted"/>
          </button>
        </div>
        <div className="mx-5 mt-3 px-3 py-2.5 rounded-[12px] bg-purple-light border-l-[3px] border-purple flex-shrink-0">
          <p className="text-[12px] line-clamp-2 text-text-muted">{post.content}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4 scroll-hide">
          {loading&&<div className="flex justify-center py-6"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{borderColor:'#5B4FCF',borderTopColor:'transparent'}}/></div>}
          {!loading&&!comments.length&&<p className="text-center text-[13px] py-8 text-text-muted">No comments yet. Start the conversation 🙏</p>}
          {comments.map((c,i)=>(
            <div key={c.id||i} className="flex items-start gap-3">
              <Avatar name={c.authorName} avatar={c.authorAvatar} size={34}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-[13px] text-text-primary">{c.authorName}</p>
                  <p className="text-[11px] text-text-muted">{timeAgo(c.createdAt)}</p>
                </div>
                <p className="text-[14px] mt-0.5 leading-relaxed text-text-primary">{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <Avatar name={authUser?.name||'You'} size={32}/>
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submit()}
            placeholder="Add a comment…"
            className="flex-1 bg-warm-outer border border-gray-200 rounded-pill px-4 py-2.5 text-[14px] focus:outline-none focus:border-purple transition-all min-h-[44px]"/>
          <button onClick={submit} disabled={!text.trim()||sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-purple disabled:opacity-40 flex-shrink-0">
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
function ManageSheet({ community, onClose, onUpdated, onDeleted }) {
  const [view,     setView]    = useState('menu')
  const [editName, setEditName]= useState(community.name)
  const [editDesc, setEditDesc]= useState(community.description||'')
  const [saving,   setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    const sb = createClient()
    const {error}=await sb.from('communities').update({name:editName.trim(),description:editDesc.trim()}).eq('id',community.id)
    if(error){showToast('Failed: '+error.message);setSaving(false);return}
    onUpdated({...community,name:editName.trim(),description:editDesc.trim()})
    onClose(); showToast('Community updated ✓'); setSaving(false)
  }
  async function handleDelete() {
    setSaving(true)
    const sb = createClient()
    const {error}=await sb.from('communities').delete().eq('id',community.id)
    if(error){showToast('Failed: '+error.message);setSaving(false);return}
    onDeleted(); onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/50 z-[60]"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[28px] z-[70] flex flex-col"
        style={{paddingBottom:'env(safe-area-inset-bottom,24px)'}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-warm-outer"/></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="font-bold text-[17px] text-text-primary">
            {view==='edit'?'Edit Community':view==='delete'?'Delete Community':'Manage'}
          </p>
          <button onClick={view!=='menu'?()=>setView('menu'):onClose}
            className="w-8 h-8 rounded-full bg-warm-outer flex items-center justify-center">
            <X size={14} className="text-text-muted"/>
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {view==='menu'&&(
            <>
              <button onClick={()=>setView('edit')}
                className="flex items-center gap-3 p-4 rounded-[16px] w-full text-left bg-warm-outer min-h-[56px]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-light flex-shrink-0"><Edit3 size={16} className="text-purple"/></div>
                <div><p className="font-bold text-[14px] text-text-primary">Edit Community</p><p className="text-[12px] text-text-muted">Change name and description</p></div>
                <ChevronRight size={16} className="text-text-muted ml-auto"/>
              </button>
              <button onClick={()=>setView('delete')}
                className="flex items-center gap-3 p-4 rounded-[16px] w-full text-left bg-red-50 min-h-[56px]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-100 flex-shrink-0"><Trash2 size={16} className="text-red-500"/></div>
                <div><p className="font-bold text-[14px] text-red-500">Delete Community</p><p className="text-[12px] text-red-400">This cannot be undone</p></div>
              </button>
            </>
          )}
          {view==='edit'&&(
            <div className="flex flex-col gap-3">
              <input value={editName} onChange={e=>setEditName(e.target.value)} maxLength={60}
                className="w-full border border-gray-200 rounded-[12px] px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple transition-all text-text-primary"/>
              <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} maxLength={300}
                className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] resize-none focus:outline-none focus:border-purple transition-all text-text-primary"/>
              <button onClick={handleSave} disabled={!editName.trim()||saving}
                className="w-full py-4 rounded-pill bg-purple text-white font-bold text-[14px] disabled:opacity-50">
                {saving?'Saving…':'Save changes'}
              </button>
            </div>
          )}
          {view==='delete'&&(
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-[16px] bg-red-50">
                <p className="font-bold text-[15px] text-red-500">Are you sure?</p>
                <p className="text-[13px] mt-1 leading-relaxed text-red-400">Deleting <strong>{community.name}</strong> will remove all posts and members. This cannot be undone.</p>
              </div>
              <button onClick={handleDelete} disabled={saving}
                className="w-full py-4 rounded-pill bg-red-500 text-white font-bold text-[14px] disabled:opacity-50">
                {saving?'Deleting…':'Yes, delete this community'}
              </button>
              <button onClick={()=>setView('menu')} className="text-center text-[13px] font-semibold text-text-muted">Cancel</button>
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
function AboutTab({ community }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="bg-white rounded-[18px] p-4 shadow-card">
        <p className="font-bold text-[14px] text-text-primary mb-2">About</p>
        <p className="text-[14px] leading-relaxed text-text-muted">{community.description||'A community on Daily Walk.'}</p>
      </div>
      <div className="bg-white rounded-[18px] p-4 shadow-card">
        {[
          ['Category',   community.category||'General'],
          ['Visibility', community.visibility==='private'?'🔒 Private':'🌐 Public'],
          ['Members',    fmtCount(community.member_count)],
          ['Created by', community.owner_name||'Daily Walk'],
        ].map(([l,v])=>(
          <div key={l} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-[13px] text-text-muted">{l}</span>
            <span className="text-[13px] font-semibold text-text-primary">{v}</span>
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

  useEffect(()=>{getAuthUser().then(setAuthUser)},[])

  const loadCommunity = useCallback(async()=>{
    setLoading(true); setError(null)
    try{
      const comm=await getCommunityBySlug(slug)
      if(!comm){setError('not_found');return}
      if(/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug)&&comm.slug)
        window.history.replaceState(null,'',`/community/${comm.slug}`)
      setComm(comm)
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  },[slug])

  useEffect(()=>{loadCommunity()},[loadCommunity])

  useEffect(()=>{
    if(!community?.id)return
    setPostsLoad(true)
    getPosts(community.id).then(d=>{setPosts(d||[]);setPostsLoad(false)}).catch(()=>setPostsLoad(false))
  },[community?.id])

  useEffect(()=>{
    if(!community?.id)return
    const unsub=subscribeToNewPosts(community.id,np=>{
      if(np.authorId===authUser?.id)return
      setPosts(prev=>prev.some(p=>p.id===np.id)?prev:[np,...prev])
    })
    return()=>unsub()
  },[community?.id,authUser?.id])

  async function handleJoin(){
    if(!authUser){requireAuth('join');return}
    if(joining)return; setJoining(true)
    setComm(c=>({...c,joined:true,member_count:(c.member_count||0)+1}))
    try{await joinCommunity(community.id);showToast(`Joined ${community.name}! 🙌`)}
    catch{setComm(c=>({...c,joined:false,member_count:Math.max(0,(c.member_count||1)-1)}));showToast('Failed')}
    setJoining(false)
  }
  async function handleLeave(){
    if(!authUser||joining)return
    if(!window.confirm(`Leave ${community.name}?`))return
    setJoining(true)
    setComm(c=>({...c,joined:false,member_count:Math.max(0,(c.member_count||1)-1)}))
    try{await leaveCommunity(community.id);showToast('Left community')}
    catch{setComm(c=>({...c,joined:true,member_count:(c.member_count||0)+1}));showToast('Failed')}
    setJoining(false)
  }
  async function handleDeletePost(postId){
    setPosts(prev=>prev.filter(p=>p.id!==postId))
    await deletePost(postId).catch(()=>null)
    showToast('Post deleted')
  }
  function handleShare(){
    const url=`${window.location.origin}/community/${community.slug||slug}`
    navigator.clipboard.writeText(url).then(()=>showToast('Link copied!'))
  }

  const isCreator = !!(authUser && community && community.created_by === authUser.id)

  if(loading)return(
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <div className="h-[160px] bg-warm-outer animate-pulse"/>
      <div className="h-[100px] bg-white animate-pulse mt-1"/>
      <div className="flex flex-col gap-3 px-4 mt-4">{[1,2,3].map(i=><PostSkeleton key={i}/>)}</div>
    </div>
  )
  if(error==='not_found')return(
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center bg-warm-bg">
      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-light"><Users size={36} className="text-purple"/></div>
      <div><p className="font-bold text-[22px] text-text-primary">Community not found</p><p className="text-[14px] mt-2 text-text-muted">This link may have been removed.</p></div>
      <button onClick={()=>router.push('/communities')} className="px-7 py-3.5 rounded-pill bg-purple text-white font-bold text-[15px]">Browse Communities</button>
    </div>
  )

  const TABS = ['posts','members','about']

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <ToastContainer/>

      {/* Banner */}
      <div className="relative" style={{height:160}}>
        <div className="absolute inset-0 streak-gradient"/>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>
        <button onClick={()=>router.push('/communities')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center min-h-[44px]"
          style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}>
          <ArrowLeft size={18} className="text-white"/>
        </button>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isCreator&&(
            <button onClick={()=>setManage(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full min-h-[40px]"
              style={{background:'rgba(255,255,255,0.2)',backdropFilter:'blur(4px)'}}>
              <Settings size={14} className="text-white"/><span className="text-white text-[12px] font-bold">Manage</span>
            </button>
          )}
          <button onClick={handleShare}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}>
            <Share2 size={16} className="text-white"/>
          </button>
          {community.joined?(
            <button onClick={handleLeave} disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold min-h-[40px]"
              style={{border:'2px solid rgba(255,255,255,0.8)',color:'white',background:'rgba(255,255,255,0.15)'}}>
              <CheckCircle2 size={14}/>{joining?'…':'Joined'}
            </button>
          ):(
            <button onClick={handleJoin} disabled={joining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold min-h-[40px]"
              style={{background:'rgba(255,255,255,0.95)',color:'#5B4FCF'}}>
              <UserPlus size={14}/>{joining?'…':'Join'}
            </button>
          )}
        </div>
      </div>

      {/* Info + compact tabs */}
      <div className="px-5 pt-4 pb-0 border-b border-gray-100 bg-white">
        <h1 className="font-bold text-[22px] text-text-primary leading-tight">{community.name}</h1>
        <div className="flex items-center gap-3 mt-1.5 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-text-muted"/>
            <span className="text-[13px] font-semibold text-text-muted">{fmtCount(community.member_count)} members</span>
          </div>
          {community.visibility==='private'?<Lock size={13} className="text-text-muted"/>:<Globe size={13} className="text-text-muted"/>}
          {isCreator&&<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-light text-purple">Creator</span>}
        </div>
        {community.description&&<p className="text-[14px] leading-relaxed text-text-muted mb-3">{community.description}</p>}

        {/* ── Compact tabs ── text-[12px] py-1.5 */}
        <div className="flex gap-0.5 p-1 rounded-full bg-purple-light mb-3">
          {TABS.map(tab_=>(
            <button key={tab_} onClick={()=>setTab(tab_)}
              className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold capitalize transition-all min-h-[36px]"
              style={tab===tab_?{color:'#5B4FCF'}:{color:'#6B7280'}}>
              {tab===tab_&&(
                <motion.div layoutId="cd-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                  transition={{type:'spring',stiffness:400,damping:34}}/>
              )}
              <span className="relative z-10">{tab_}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1" style={{paddingBottom:community.joined&&tab==='posts'?96:80}}>
        <AnimatePresence mode="wait">
          {tab==='posts'&&(
            <motion.div key="posts" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-3 px-4 py-4">
              {postsLoad
                ?[1,2,3].map(i=><PostSkeleton key={i}/>)
                :posts.length===0
                  ?<div className="flex flex-col items-center gap-4 py-20 text-center">
                    <span style={{fontSize:52}}>🌱</span>
                    <div>
                      <p className="font-bold text-[18px] text-text-primary">No posts yet</p>
                      <p className="text-[14px] mt-1 text-text-muted">{community.joined?'Be the first to share something.':'Join to see and create posts.'}</p>
                    </div>
                    {community.joined&&<button onClick={()=>setCompose(true)} className="px-6 py-3 rounded-pill bg-purple text-white font-bold text-[14px]">Write the first post</button>}
                  </div>
                  :posts.map((post,i)=>(
                    <motion.div key={post.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
                      <PostCard post={post} authUser={authUser} requireAuth={requireAuth}
                        onDelete={authUser?.id===post.authorId?handleDeletePost:undefined}
                        onCommentTap={p=>authUser?setCpPost(p):requireAuth('comment')}
                        onLikeOptimistic={nowLiked=>{
                          setPosts(prev=>prev.map(p=>p.id!==post.id?p:{...p,liked:nowLiked,like_count:Math.max(0,(p.like_count||0)+(nowLiked?1:-1))}))
                        }}/>
                    </motion.div>
                  ))
              }
            </motion.div>
          )}
          {tab==='about'&&(<motion.div key="about" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><AboutTab community={community}/></motion.div>)}
          {tab==='members'&&(<motion.div key="members" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="px-4 py-4"><p className="text-center text-[13px] text-text-muted py-10">Member list coming soon</p></motion.div>)}
        </AnimatePresence>
      </div>

      {/* FAB */}
      {tab==='posts'&&(
        <motion.button
          onClick={()=>community.joined?setCompose(true):(authUser?handleJoin():requireAuth('join'))}
          className="fixed flex items-center justify-center text-white rounded-full z-30 bg-purple shadow-purple"
          style={{width:56,height:56,bottom:80,right:16}}
          initial={{scale:0}} animate={{scale:1}} whileTap={{scale:0.9}}
          transition={{type:'spring',stiffness:400,damping:24}}>
          <Plus size={24}/>
        </motion.button>
      )}

      <AnimatePresence>
        {compose&&community&&(
          <PostComposer
            defaultCommunityId={community.id}
            onClose={()=>setCompose(false)}
            onPost={post=>{
              if(post.communityId===community.id) setPosts(prev=>[post,...prev])
            }}
          />
        )}
        {cpPost&&<CommentSheet post={cpPost} authUser={authUser} onClose={()=>setCpPost(null)}/>}
        {manage&&isCreator&&community&&(
          <ManageSheet community={community} onClose={()=>setManage(false)}
            onUpdated={u=>setComm(u)} onDeleted={()=>router.push('/communities')}/>
        )}
      </AnimatePresence>
    </div>
  )
}