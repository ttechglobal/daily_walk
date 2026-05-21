// 'use client'

// // ── src/app/qa/page.js ──
// // Scripture-grounded Q&A. Safe, humble, and faith-centred.
// // Tone: not a debate forum. A place for genuine questions and Word-anchored answers.

// import { useState, useEffect, useCallback } from 'react'
// import { useRouter } from 'next/navigation'
// import { motion, AnimatePresence } from 'framer-motion'
// import {
//   BookOpen, MessageSquare, ChevronRight,
//   Plus, X, Send, Loader2, HelpCircle, Heart,
// } from 'lucide-react'
// import Link from 'next/link'
// import { useTheme } from '../../lib/theme'
// import { ToastContainer, showToast } from '../../components/Toast'
// import { useAuthGate } from '../../components/AuthGate'
// import { getQuestions, askQuestion, toggleHelped } from '../../lib/supabase/qa'
// import { parseScriptureRefs } from '../../lib/scripture'

// function timeAgo(d) {
//   if (!d) return ''
//   const s = (Date.now() - new Date(d)) / 1000
//   if (s < 60)    return 'just now'
//   if (s < 3600)  return `${Math.floor(s/60)}m ago`
//   if (s < 86400) return `${Math.floor(s/3600)}h ago`
//   return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
// }

// function Avatar({ name, avatar, size = 32 }) {
//   const ini    = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
//   const colors = ['#5B4FCF','#4A7C5F','#E8A838','#7CB9E8','#C77DFF']
//   const bg     = colors[(ini.charCodeAt(0)||0) % colors.length]
//   if (avatar) return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}} onError={e=>{e.currentTarget.style.display='none'}}/>
//   return <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{width:size,height:size,background:bg,fontSize:Math.round(size*0.38)}}>{ini}</div>
// }

// // ─────────────────────────────────────────────
// //  Ask Question sheet
// // ─────────────────────────────────────────────
// function AskSheet({ onClose, onAsked }) {
//   const { t } = useTheme()
//   const [title,   setTitle]   = useState('')
//   const [body,    setBody]    = useState('')
//   const [passage, setPassage] = useState('')
//   const [sending, setSending] = useState(false)

//   async function submit() {
//     if (!title.trim()) return
//     setSending(true)
//     try {
//       const q = await askQuestion({ title, body, passage, isPublic: true })
//       onAsked(q)
//       onClose()
//     } catch (e) {
//       if (e.message === 'not_authenticated') showToast('Sign in to ask a question')
//       else showToast('Something went wrong — try again')
//     } finally { setSending(false) }
//   }

//   return (
//     <>
//       <motion.div className="fixed inset-0 bg-black/50 z-[60]"
//         initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
//       <motion.div
//         className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-[28px] z-[70] flex flex-col"
//         style={{background:t.bgCard, maxHeight:'90dvh', paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))'}}
//         initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
//         transition={{type:'spring',stiffness:340,damping:36}}
//         onClick={e=>e.stopPropagation()}>
//         <div className="flex justify-center pt-3 pb-1">
//           <div className="w-10 h-1 rounded-full" style={{background:t.border}}/>
//         </div>
//         <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{borderColor:t.border}}>
//           <div>
//             <p className="font-bold text-[16px]" style={{color:t.text}}>Ask a question</p>
//             <p className="text-[12px] mt-0.5" style={{color:t.textMuted}}>Be genuine. The community is here to help.</p>
//           </div>
//           <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:t.bgMuted}}>
//             <X size={14} style={{color:t.textMuted}}/>
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
//           <div>
//             <label className="text-[12px] font-bold uppercase tracking-wider block mb-1.5" style={{color:t.textMuted}}>
//               Your question *
//             </label>
//             <textarea
//               value={title}
//               onChange={e => setTitle(e.target.value.slice(0, 300))}
//               placeholder="e.g. What does 'born again' really mean?"
//               rows={3}
//               className="w-full rounded-[14px] px-4 py-3 text-[15px] resize-none focus:outline-none transition-all"
//               style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${t.border}`}}
//             />
//             <p className="text-right text-[11px] mt-1" style={{color:t.textFaint}}>{300 - title.length} left</p>
//           </div>

//           <div>
//             <label className="text-[12px] font-bold uppercase tracking-wider block mb-1.5" style={{color:t.textMuted}}>
//               More context (optional)
//             </label>
//             <textarea
//               value={body}
//               onChange={e => setBody(e.target.value.slice(0, 1000))}
//               placeholder="Share what prompted this question or what you've already explored…"
//               rows={4}
//               className="w-full rounded-[14px] px-4 py-3 text-[14px] resize-none focus:outline-none transition-all"
//               style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${t.border}`}}
//             />
//           </div>

//           <div>
//             <label className="text-[12px] font-bold uppercase tracking-wider block mb-1.5" style={{color:t.textMuted}}>
//               Related scripture (optional)
//             </label>
//             <input
//               value={passage}
//               onChange={e => setPassage(e.target.value)}
//               placeholder='e.g. "John 3:3" or "Romans 8"'
//               className="w-full rounded-[14px] px-4 py-3 text-[14px] focus:outline-none transition-all"
//               style={{background:t.bgMuted, color:t.text, border:`1.5px solid ${t.border}`}}
//             />
//           </div>

//           <button onClick={submit} disabled={!title.trim() || sending}
//             className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
//             style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
//             {sending ? <><Loader2 size={17} className="animate-spin"/> Asking…</> : <>Ask the community →</>}
//           </button>

//           <p className="text-center text-[12px] leading-relaxed" style={{color:t.textFaint}}>
//             Questions are shared with the Daily Walk community. Be kind — you may be asking what someone else is afraid to ask.
//           </p>
//         </div>
//       </motion.div>
//     </>
//   )
// }

// // ─────────────────────────────────────────────
// //  Question card
// // ─────────────────────────────────────────────
// function QuestionCard({ q, onHelped }) {
//   const { t }     = useTheme()
//   const router    = useRouter()
//   const [helped,  setHelped]  = useState(q.helped)
//   const [count,   setCount]   = useState(q.helpedCount)

//   async function handleHelped(e) {
//     e.stopPropagation()
//     try {
//       const { toggleHelped: toggle } = await import('../../lib/supabase/qa')
//       const now = await toggle('question', q.id)
//       setHelped(now); setCount(c => c + (now ? 1 : -1))
//       onHelped?.(q.id, now)
//     } catch (e) {
//       if (e.message === 'not_authenticated') showToast('Sign in to mark helpful')
//     }
//   }

//   return (
//     <motion.div
//       onClick={() => router.push(`/qa/${q.id}`)}
//       className="bg-white rounded-[18px] p-4 shadow-card cursor-pointer active:scale-[0.99] transition-all"
//       whileTap={{ scale: 0.99 }}
//     >
//       <div className="flex items-start gap-3">
//         <Avatar name={q.authorName} avatar={q.authorAvatar} size={34}/>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-1.5 mb-1">
//             <p className="font-bold text-[13px] text-text-primary truncate">{q.authorName}</p>
//             <span className="text-[11px] text-text-muted flex-shrink-0">{timeAgo(q.createdAt)}</span>
//           </div>

//           {/* Passage anchor */}
//           {q.passage && (
//             <div className="flex items-center gap-1.5 mb-2 pl-0.5">
//               <BookOpen size={11} className="text-purple flex-shrink-0"/>
//               <p className="text-[12px] font-bold text-purple">{q.passage}</p>
//             </div>
//           )}

//           {/* Question title */}
//           <p className="font-display font-semibold text-[15px] text-text-primary leading-snug">{q.title}</p>

//           {/* Body preview */}
//           {q.body && (
//             <p className="text-[13px] text-text-muted mt-1 leading-relaxed line-clamp-2">{q.body}</p>
//           )}

//           {/* Footer */}
//           <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
//             {/* Answers */}
//             <div className="flex items-center gap-1.5 text-text-muted">
//               <MessageSquare size={14}/>
//               <span className="text-[12px] font-semibold">
//                 {q.answerCount} {q.answerCount === 1 ? 'answer' : 'answers'}
//               </span>
//             </div>

//             {/* This helped me */}
//             <button
//               onClick={handleHelped}
//               className="flex items-center gap-1.5 ml-auto transition-all active:scale-90"
//               style={{color: helped ? '#5B4FCF' : '#9CA3AF'}}>
//               <Heart size={14} fill={helped ? '#5B4FCF' : 'none'} stroke={helped ? '#5B4FCF' : '#9CA3AF'}/>
//               <span className="text-[12px] font-semibold">
//                 {helped ? 'Helped me' : 'This helped me'}
//                 {count > 0 && <span className="ml-1 opacity-70">· {count}</span>}
//               </span>
//             </button>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   )
// }

// // ─────────────────────────────────────────────
// //  Main page
// // ─────────────────────────────────────────────
// export default function QAPage() {
//   const { t }       = useTheme()
//   const { requireAuth } = useAuthGate()

//   const [questions, setQuestions] = useState([])
//   const [loading,   setLoading]   = useState(true)
//   const [tab,       setTab]       = useState('recent')
//   const [showAsk,   setShowAsk]   = useState(false)

//   const load = useCallback(async () => {
//     setLoading(true)
//     const q = await getQuestions({ limit: 40 })
//     setQuestions(q)
//     setLoading(false)
//   }, [])

//   useEffect(() => { load() }, [load])

//   function handleAsk() {
//     requireAuth('post', () => setShowAsk(true))
//   }

//   const sorted = tab === 'recent'
//     ? [...questions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
//     : [...questions].sort((a,b) => b.answerCount - a.answerCount)

//   return (
//     <div className="flex flex-col min-h-screen" style={{background: t.bg}}>
//       <ToastContainer/>

//       {/* Header */}
//       <div className="px-4 pt-12 pb-3">
//         <div className="flex items-start justify-between mb-1">
//           <div>
//             <h1 className="font-display font-bold text-[26px]" style={{color:t.text}}>Ask & Explore</h1>
//             <p className="text-[13px] mt-0.5" style={{color:t.textMuted}}>
//               Scripture-grounded answers from the community
//             </p>
//           </div>
//           <button
//             onClick={handleAsk}
//             className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px] active:scale-95 transition-all"
//             style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)', flexShrink:0}}>
//             <Plus size={14}/> Ask
//           </button>
//         </div>

//         {/* Encouraging tagline */}
//         <div className="mt-3 px-4 py-3 rounded-[14px]" style={{background:t.purpleBg||'#EDE9FF'}}>
//           <p className="text-[13px] leading-relaxed font-semibold" style={{color:'#5B4FCF'}}>
//             📖 "Ask and it will be given to you; seek and you will find." — Matthew 7:7
//           </p>
//         </div>
//       </div>

//       {/* Tab bar */}
//       <div className="px-4 pb-3">
//         <div className="flex gap-0.5 p-1 rounded-full" style={{background:t.bgMuted}}>
//           {[{k:'recent',l:'Most Recent'},{k:'answered',l:'Most Answered'}].map(({k,l}) => (
//             <button key={k} onClick={() => setTab(k)}
//               className="relative flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all min-h-[36px]"
//               style={tab===k ? {color:'#5B4FCF'} : {color:t.textMuted}}>
//               {tab===k && (
//                 <motion.div layoutId="qa-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
//                   transition={{type:'spring',stiffness:400,damping:35}}/>
//               )}
//               <span className="relative z-10">{l}</span>
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Content */}
//       <div className="flex-1 overflow-y-auto px-4 pb-28 flex flex-col gap-3">
//         {loading
//           ? Array.from({length:4}).map((_,i) => (
//               <div key={i} className="bg-white rounded-[18px] p-4 shadow-card animate-pulse">
//                 <div className="flex gap-3">
//                   <div className="w-9 h-9 rounded-full flex-shrink-0" style={{background:t.bgMuted}}/>
//                   <div className="flex-1 flex flex-col gap-2">
//                     <div className="h-3 rounded-full w-1/4" style={{background:t.bgMuted}}/>
//                     <div className="h-4 rounded-full w-4/5" style={{background:t.bgMuted}}/>
//                     <div className="h-3 rounded-full w-full" style={{background:t.bgMuted}}/>
//                   </div>
//                 </div>
//               </div>
//             ))
//           : sorted.length === 0
//             ? (
//               <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
//                 <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:t.purpleBg||'#EDE9FF'}}>
//                   <HelpCircle size={28} className="text-purple"/>
//                 </div>
//                 <p className="font-bold text-[18px]" style={{color:t.text}}>No questions yet</p>
//                 <p className="text-[14px] leading-relaxed" style={{color:t.textMuted}}>
//                   Be the first to ask something you're wrestling with. Others may be wondering the same thing.
//                 </p>
//                 <button onClick={handleAsk}
//                   className="px-7 py-3.5 rounded-full text-white font-bold text-[14px]"
//                   style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
//                   Ask the first question
//                 </button>
//               </div>
//             )
//             : sorted.map((q, i) => (
//                 <motion.div key={q.id}
//                   initial={{opacity:0, y:6}} animate={{opacity:1, y:0}}
//                   transition={{delay: Math.min(i * 0.04, 0.24)}}>
//                   <QuestionCard q={q}
//                     onHelped={(id, now) => setQuestions(prev =>
//                       prev.map(x => x.id !== id ? x : {...x, helped:now, helpedCount:x.helpedCount+(now?1:-1)})
//                     )}/>
//                 </motion.div>
//               ))
//         }
//       </div>

//       {/* Floating Ask button */}
//       <motion.button
//         onClick={handleAsk}
//         className="fixed flex items-center gap-2 text-white font-bold rounded-full z-30"
//         style={{
//           bottom:       80,
//           right:        16,
//           height:       52,
//           paddingLeft:  18,
//           paddingRight: 18,
//           fontSize:     14,
//           background:  'linear-gradient(135deg,#5B4FCF,#3D3190)',
//           boxShadow:   '0 6px 20px rgba(91,79,207,0.4)',
//         }}
//         initial={{scale:0}} animate={{scale:1}} whileTap={{scale:0.92}}
//         transition={{type:'spring',stiffness:400,damping:24}}>
//         <HelpCircle size={17}/> Ask a question
//       </motion.button>

//       <AnimatePresence>
//         {showAsk && <AskSheet onClose={() => setShowAsk(false)} onAsked={q => setQuestions(prev => [q, ...prev])}/>}
//       </AnimatePresence>
//     </div>
//   )
// }