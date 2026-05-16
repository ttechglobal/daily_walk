'use client'

// ── src/app/communities/page.js ──
// Full communities UI is visible — users can browse everything freely.
// ALL action buttons (Join, Post, Like, Comment, Sign In) show a
// "Communities are coming soon" toast. No redirects, no auth walls.

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X as XIcon, Plus, Users, Heart,
  MessageCircle, Share2, Bookmark, MoreHorizontal,
  Sparkles, ChevronRight, Lock,
} from 'lucide-react'
import { ToastContainer, showToast } from '../../components/Toast'
import { avatarColor, initials } from '../../lib/constants'

// ─────────────────────────────────────────────
//  Coming-soon toast helper — used everywhere
// ─────────────────────────────────────────────
const cs = () => showToast('🙌 Communities are coming soon — stay tuned!')

// ─────────────────────────────────────────────
//  Colour maps
// ─────────────────────────────────────────────
const CAT_COLOR = {
  'Bible Study':'#5B4FCF','Prayer':'#4A7C5F','Mental Health':'#7CB9E8',
  'Youth':'#E8A838','Worship':'#C77DFF','General':'#888780',
}
const CAT_GRADIENT = {
  'Bible Study':'linear-gradient(135deg,#5B4FCF,#3D3190)',
  'Prayer':'linear-gradient(135deg,#4A7C5F,#2E5240)',
  'Mental Health':'linear-gradient(135deg,#7CB9E8,#4A90C4)',
  'Youth':'linear-gradient(135deg,#E8A838,#B07000)',
  'Worship':'linear-gradient(135deg,#C77DFF,#7C3AED)',
  'General':'linear-gradient(135deg,#888780,#5A5954)',
}
const CATEGORIES = ['All','Bible Study','Prayer','Mental Health','Youth','Worship','General']

// ─────────────────────────────────────────────
//  Demo data — real-feeling content for the preview
// ─────────────────────────────────────────────
const DEMO_POSTS = [
  { id:'d1', authorName:'Sarah M.', content:'Started reading Psalms this morning and Psalm 23 just hit different today. "Even though I walk through the darkest valley, I will fear no evil." So much peace in those words.', passage:'Psalm 23:4', type:'reading', like_count:14, comment_count:3, createdAt:new Date(Date.now()-3600000).toISOString() },
  { id:'d2', authorName:'James K.', content:'Day 12 of the New Believer plan and I feel like a new person. The verse on identity in Christ today just broke something open in me. Grateful for this community.', passage:'2 Corinthians 5:17', type:'encouragement', like_count:22, comment_count:7, createdAt:new Date(Date.now()-7200000).toISOString() },
  { id:'d3', authorName:'Priya T.', content:'Praying for anyone going through a hard season right now. God sees you, He hasn\'t forgotten you, and His timing is perfect. Drop a 🙏 and I\'ll be praying for you today.', type:'prayer', like_count:41, comment_count:12, createdAt:new Date(Date.now()-10800000).toISOString() },
  { id:'d4', authorName:'David O.', content:'Just finished the book of Romans. Reading Paul\'s explanation of grace made me realise I\'ve been treating it as a reward for good behaviour instead of a free gift. Mind blown.', passage:'Romans 5:1', type:'general', like_count:18, comment_count:5, createdAt:new Date(Date.now()-86400000).toISOString() },
]
const DEMO_COMMS = [
  { id:'c1', name:'Daily Psalms',  category:'Bible Study',   member_count:1240, description:'Reading through the Psalms together, one a day.', visibility:'public' },
  { id:'c2', name:'Prayer Circle', category:'Prayer',        member_count:890,  description:'A safe place to share requests and pray for each other.', visibility:'public' },
  { id:'c3', name:'New Believers', category:'General',       member_count:654,  description:'Welcome! We are all learning to walk with God here.', visibility:'public' },
  { id:'c4', name:'Youth & Faith', category:'Youth',         member_count:432,  description:'For the next generation walking boldly with Jesus.', visibility:'public' },
  { id:'c5', name:'Worship Room',  category:'Worship',       member_count:321,  description:'Songs, Psalms, and the presence of God — daily.', visibility:'public' },
]

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now()-new Date(d).getTime())/1000
  if (s<60) return 'just now'
  if (s<3600) return `${Math.floor(s/60)}m`
  if (s<86400) return `${Math.floor(s/3600)}h`
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}
function fmt(n){const v=n||0;return v>=1000?`${(v/1000).toFixed(1)}k`:String(v)}

// ─────────────────────────────────────────────
//  Post Card
// ─────────────────────────────────────────────
function PostCard({ post }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [count, setCount] = useState(post.like_count||0)
  const [anim,  setAnim]  = useState(false)
  const tc = post.type==='prayer'?'#4A7C5F':post.type==='encouragement'?'#E8A838':post.type==='reading'?'#5B4FCF':'#888780'

  function handleLike(){
    setLiked(l=>!l); setCount(c=>liked?Math.max(0,c-1):c+1)
    setAnim(true); setTimeout(()=>setAnim(false),380); cs()
  }

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="bg-white rounded-[20px] overflow-hidden" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
          style={{background:avatarColor(post.authorName||'A')}}>{initials(post.authorName||'A')}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[14px] truncate" style={{color:'#1A1A2E'}}>{post.authorName}</p>
            {post.type&&post.type!=='general'&&(
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                style={{background:`${tc}18`,color:tc}}>{post.type}</span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{color:'#9CA3AF'}}>{timeAgo(post.createdAt)}</p>
        </div>
        <button onClick={cs} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50">
          <MoreHorizontal size={16} style={{color:'#9CA3AF'}}/>
        </button>
      </div>
      {post.passage&&(
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl" style={{background:'#F8F7FF',borderLeft:'3px solid #5B4FCF'}}>
          <p className="text-[12px] font-bold" style={{color:'#5B4FCF'}}>{post.passage}</p>
        </div>
      )}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-[1.7]" style={{color:'#1A1A2E'}}>{post.content}</p>
      </div>
      <div className="flex items-center gap-1 px-3 pb-3 pt-2 border-t" style={{borderColor:'#F5F5F5'}}>
        <button onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90"
          style={{color:liked?'#E84060':'#9CA3AF',background:liked?'#FFF0F3':'transparent'}}>
          <motion.div animate={anim?{scale:[1,1.5,1]}:{}} transition={{duration:0.35}}>
            <Heart size={17} fill={liked?'#E84060':'none'}/>
          </motion.div>
          <span className="text-[13px] font-semibold">{fmt(count)}</span>
        </button>
        <button onClick={cs} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{color:'#9CA3AF'}}>
          <MessageCircle size={17}/>
          <span className="text-[13px] font-semibold">{fmt(post.comment_count)}</span>
        </button>
        <button onClick={cs} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{color:'#9CA3AF'}}>
          <Share2 size={17}/>
        </button>
        <button onClick={()=>{setSaved(s=>!s);cs()}}
          className="ml-auto flex items-center px-3 py-2 rounded-full"
          style={{color:saved?'#5B4FCF':'#9CA3AF',background:saved?'#EDE9FF':'transparent'}}>
          <Bookmark size={17} fill={saved?'#5B4FCF':'none'}/>
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Community cards
// ─────────────────────────────────────────────
function MyCommunityCard({ community, dimmed }) {
  const gradient = CAT_GRADIENT[community.category]||CAT_GRADIENT.General
  const color    = CAT_COLOR[community.category]||'#888780'
  return (
    <motion.button initial={{opacity:0,y:6}} animate={{opacity:dimmed?0.45:1,y:0}} whileTap={{scale:0.97}}
      onClick={cs} className="w-full bg-white rounded-[20px] overflow-hidden flex items-center gap-4 px-4 py-3.5 text-left"
      style={{boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-[22px] flex-shrink-0"
        style={{background:gradient}}>{(community.name||'C')[0].toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] truncate" style={{color:'#1A1A2E'}}>{community.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{background:`${color}18`,color}}>{community.category}</span>
          <span className="text-[12px]" style={{color:'#9CA3AF'}}>{fmt(community.member_count)} members</span>
        </div>
        {community.description&&<p className="text-[12px] mt-1 line-clamp-1" style={{color:'#6B7280'}}>{community.description}</p>}
      </div>
      <ChevronRight size={18} style={{color:'#D1D5DB',flexShrink:0}}/>
    </motion.button>
  )
}

function ExploreCard({ community, idx }) {
  const gradient = CAT_GRADIENT[community.category]||CAT_GRADIENT.General
  const color    = CAT_COLOR[community.category]||'#888780'
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}}
      className="bg-white rounded-[20px] overflow-hidden" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
      <div className="h-24 flex items-end px-4 pb-3 relative" style={{background:gradient}}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)',backgroundSize:'28px 28px'}}/>
        {community.visibility==='private'&&(
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center">
            <Lock size={12} className="text-white"/>
          </div>
        )}
        <span className="relative z-10 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/25 text-white">
          {community.category}
        </span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <p className="font-bold text-[15px]" style={{color:'#1A1A2E'}}>{community.name}</p>
        {community.description&&(
          <p className="text-[13px] mt-1 line-clamp-2 leading-relaxed" style={{color:'#6B7280'}}>{community.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <Users size={13} style={{color:'#9CA3AF'}}/>
            <span className="text-[12px]" style={{color:'#9CA3AF'}}>{fmt(community.member_count)} members</span>
          </div>
          <button onClick={cs}
            className="px-4 py-2 rounded-full text-[13px] font-bold text-white active:scale-95 transition-all"
            style={{background:'#5B4FCF'}}>Join</button>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function CommunitiesPage() {
  const [tab,    setTab]    = useState('foryou')
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = useMemo(()=>{
    let list = DEMO_COMMS
    if(filter!=='All') list=list.filter(c=>c.category===filter)
    if(query.trim()){const q=query.toLowerCase();list=list.filter(c=>c.name?.toLowerCase().includes(q)||c.description?.toLowerCase().includes(q))}
    return list
  },[filter,query])

  const TABS=[{key:'foryou',label:'For You'},{key:'mine',label:'My Communities'},{key:'explore',label:'Explore'}]

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{background:'#FAF8F5'}}>
      <ToastContainer/>

      {/* Header */}
      <div className="px-4 pt-6 pb-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold" style={{color:'#1A1A2E'}}>Communities</h1>
          <p className="text-[13px] mt-0.5" style={{color:'#6B7280'}}>Grow together with other believers</p>
        </div>
        <button onClick={cs} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold border-2"
          style={{borderColor:'#5B4FCF',color:'#5B4FCF'}}><Plus size={13}/> Create</button>
      </div>

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'#9CA3AF'}}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search communities..."
            className="w-full pl-10 pr-10 py-3 rounded-full border border-gray-200 text-[14px] focus:outline-none focus:border-purple-300 bg-white transition-all"
            style={{color:'#1A1A2E'}}/>
          {query&&<button onClick={()=>setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <XIcon size={12} style={{color:'#6B7280'}}/></button>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 p-1 rounded-full" style={{background:'#EDE9FF'}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className="relative flex-1 py-2 rounded-full text-[12px] font-bold transition-all"
              style={tab===t.key?{color:'#5B4FCF'}:{color:'#6B7280'}}>
              {tab===t.key&&<motion.div layoutId="ctab" className="absolute inset-0 bg-white rounded-full"
                style={{boxShadow:'0 1px 6px rgba(0,0,0,0.1)'}} transition={{type:'spring',stiffness:400,damping:35}}/>}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* For You */}
          {tab==='foryou'&&(
            <motion.div key="fy" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-3 px-4 pt-4">
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
                <Sparkles size={20} className="text-white flex-shrink-0"/>
                <div>
                  <p className="font-bold text-white text-[14px]">Communities launching soon</p>
                  <p className="text-white/75 text-[12px] mt-0.5">Here's a preview of what's coming 👇</p>
                </div>
              </motion.div>
              {DEMO_POSTS.map((post,i)=>(
                <motion.div key={post.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
                  <PostCard post={post}/>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* My Communities */}
          {tab==='mine'&&(
            <motion.div key="mine" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-3 px-4 pt-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[16px]" style={{background:'#EDE9FF'}}>
                <Users size={18} style={{color:'#5B4FCF',flexShrink:0}}/>
                <p className="text-[13px] font-semibold" style={{color:'#5B4FCF'}}>
                  Your communities will appear here when we launch 🙌
                </p>
              </div>
              {DEMO_COMMS.slice(0,3).map((c,i)=>(
                <MyCommunityCard key={c.id} community={c} dimmed/>
              ))}
            </motion.div>
          )}

          {/* Explore */}
          {tab==='explore'&&(
            <motion.div key="explore" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div className="flex gap-2 px-4 mt-4 overflow-x-auto scroll-hide pb-1">
                {CATEGORIES.map(cat=>(
                  <button key={cat} onClick={()=>setFilter(cat)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all"
                    style={filter===cat?{background:'#5B4FCF',borderColor:'#5B4FCF',color:'white'}:{background:'white',borderColor:'#E5E7EB',color:'#6B7280'}}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 px-4 mt-4 pb-10">
                {filtered.map((c,i)=><ExploreCard key={c.id} community={c} idx={i}/>)}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}