'use client'

// ── BottomNav — Final nav (Updates 2+3) ──
// Tabs: Home | Communities | + (action sheet) | Events | Profile
// Journey lives in Profile page as a tab.
// Hidden on /read for immersive reading mode.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Users, Plus, CalendarDays, User, Lightbulb, X, CheckCircle2, BookOpen, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCheckin } from '../hooks/useCheckin'
import { ToastContainer, showToast } from './Toast'
import { todayStr, SEED_CHALLENGES } from '../lib/constants'

const LEFT_ITEMS  = [
  { href: '/',             icon: Home,          label: 'Home'        },
  { href: '/communities',  icon: Users,         label: 'Communities' },
]
const RIGHT_ITEMS = [
  { href: '/events',   icon: CalendarDays, label: 'Events'  },
  { href: '/profile',  icon: User,         label: 'Profile' },
]

// ── Nugget modal ──
function NuggetModal({ onClose }) {
  const [input,   setInput]   = useState('')
  const [nuggets, setNuggets] = useLocalStorage('dw_nuggets', [])

  function save() {
    const t = input.trim()
    if (!t) return
    setNuggets(prev => [{
      id: `nug_${Date.now()}`, text: t, source: null,
      createdAt: new Date().toISOString(),
    }, ...(prev || [])])
    showToast('Nugget saved!')
    onClose()
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] p-5 pb-10"
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} style={{ color: '#E8A838' }} />
            <span className="font-bold text-text-primary text-[16px]">Add a nugget</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted"><X size={15} /></button>
        </div>
        <p className="text-text-muted text-[13px] mb-3">Saved privately to your Journey. Never auto-shared.</p>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Something that spoke to you..." rows={4} autoFocus
          className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted mb-3" />
        <button onClick={save} disabled={!input.trim()}
          className="w-full text-white rounded-pill py-3.5 font-bold text-[14px] disabled:opacity-40 transition-all active:scale-[0.97]"
          style={{ background: '#E8A838' }}>
          Save nugget
        </button>
      </motion.div>
    </>
  )
}

// ── Challenge post picker ──
function ChallengePostModal({ onClose }) {
  const router = useRouter()
  const [challenges] = useLocalStorage('dw_challenges', SEED_CHALLENGES)
  const [user]       = useLocalStorage('dw_user', null)
  const [step, setStep]             = useState('pick')
  const [selectedId, setSelectedId] = useState(null)
  const [passage,    setPassage]    = useState('')
  const [reflection, setReflection] = useState('')
  const [challenges2, setChallenges2] = useLocalStorage('dw_challenges', SEED_CHALLENGES)

  const joined = (challenges || []).filter(c => c.joined)

  function submit() {
    if (!passage.trim() && !reflection.trim()) { showToast('Add what you read or a reflection'); return }
    const displayName = user?.name?.trim() || 'Anonymous'
    const post = {
      id: `post_${Date.now()}`, userId: 'local_user', displayName,
      passage: passage.trim(), reflection: reflection.trim(),
      challengeId: selectedId, createdAt: new Date().toISOString(),
    }
    setChallenges2(prev => (prev || []).map(c =>
      c.id === selectedId ? { ...c, posts: [post, ...(c.posts || [])] } : c
    ))
    showToast('Posted!')
    onClose()
    setTimeout(() => router.push(`/challenges/${selectedId}`), 500)
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[60]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-warm-bg rounded-t-[28px] z-[70] flex flex-col"
        style={{ maxHeight:'88dvh' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        {step === 'pick' ? (
          <div className="flex flex-col px-5 pb-8 gap-4 overflow-y-auto scroll-hide">
            <div className="flex items-center justify-between py-3">
              <span className="font-bold text-text-primary text-[16px]">Post to a challenge</span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted"><X size={15} /></button>
            </div>
            {joined.length === 0 ? (
              <div className="text-center py-8 flex flex-col gap-3">
                <p className="text-text-muted text-[14px]">You haven't joined any challenges yet.</p>
                <Link href="/challenges" onClick={onClose} className="font-bold text-[14px] underline underline-offset-2" style={{ color: '#5B4FCF' }}>Browse challenges →</Link>
              </div>
            ) : joined.map(c => (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setStep('compose') }}
                className="w-full text-left p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]">
                <p className="font-bold text-text-primary text-[14px]">{c.title}</p>
                <p className="text-text-muted text-[12px] mt-0.5">{c.description.slice(0, 60)}…</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col px-5 pb-8 gap-4 overflow-y-auto scroll-hide">
            <div className="flex items-center gap-3 py-3">
              <button onClick={() => setStep('pick')} className="text-text-muted hover:text-text-primary transition-colors text-[13px] font-semibold">← Back</button>
              <span className="font-bold text-text-primary text-[15px] flex-1 truncate">{joined.find(c=>c.id===selectedId)?.title}</span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted"><X size={15} /></button>
            </div>
            <input type="text" value={passage} onChange={e => setPassage(e.target.value)} placeholder="What did you read?" autoFocus
              className="w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
            <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="What stood out? (optional)" rows={3}
              className="w-full border border-gray-200 rounded-input resize-none px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all placeholder:text-text-muted" />
            <button onClick={submit}
              className="w-full text-white rounded-pill py-4 text-[15px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
              style={{ background: '#5B4FCF' }}>
              Post →
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}

// ── Action sheet ──
function ActionSheet({ onClose, onNugget, onLogReading, onChallengePost, isCheckedIn }) {
  const actions = [
    {
      icon: Lightbulb, iconBg: 'bg-amber-light', iconColor: '#E8A838',
      title: 'Add a personal nugget', sub: 'Saved privately to your Journey',
      onClick: onNugget, disabled: false,
    },
    {
      icon: isCheckedIn ? CheckCircle2 : BookOpen,
      iconBg: 'bg-purple-light', iconColor: '#5B4FCF',
      title: isCheckedIn ? 'Already checked in today ✓' : 'Log a Bible reading',
      sub: isCheckedIn ? 'Come back tomorrow' : 'Mark your reading for today',
      onClick: isCheckedIn ? null : onLogReading,
      disabled: isCheckedIn,
    },
    {
      icon: Trophy, iconBg: 'bg-sage-light', iconColor: '#4A7C5F',
      title: 'Post to a challenge', sub: 'Share with your challenge group',
      onClick: onChallengePost, disabled: false,
    },
  ]

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/40 z-[55]" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[388px] bg-warm-bg rounded-[24px] z-[56] overflow-hidden shadow-xl"
        initial={{ opacity:0, y:20, scale:0.96 }}
        animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:10, scale:0.96 }}
        transition={{ type:'spring', stiffness:380, damping:34 }}>
        {actions.map((a, i) => (
          <button key={i} onClick={a.disabled ? undefined : a.onClick} disabled={a.disabled}
            className={clsx(
              'w-full flex items-center gap-4 px-5 py-4 transition-colors',
              i < actions.length - 1 && 'border-b border-gray-100',
              a.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            )}>
            <div className={`w-10 h-10 rounded-2xl ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
              <a.icon size={18} style={{ color: a.iconColor }} />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-primary text-[14px]">{a.title}</p>
              <p className="text-text-muted text-[12px]">{a.sub}</p>
            </div>
          </button>
        ))}
      </motion.div>
    </>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const isRead   = pathname === '/read'
  const { isCheckedInToday } = useCheckin()

  const [sheet,         setSheet]         = useState(false)
  const [nuggetOpen,    setNuggetOpen]    = useState(false)
  const [challengePost, setChallengePost] = useState(false)

  function openNugget()        { setSheet(false); setTimeout(() => setNuggetOpen(true),    120) }
  function openLogReading()    { setSheet(false); setTimeout(() => router.push('/checkin'), 120) }
  function openChallengePost() { setSheet(false); setTimeout(() => setChallengePost(true),  120) }

  if (isRead) return null

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around px-2 pt-2 pb-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {LEFT_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href))
          return (
            <Link key={href} href={href}
              className={clsx('flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors', isActive ? 'text-purple' : 'text-text-muted hover:text-text-primary')}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={clsx('text-[10px] font-semibold tracking-wide', isActive ? 'text-purple' : 'text-text-muted')}>{label}</span>
            </Link>
          )
        })}

        <button onClick={() => setSheet(v => !v)}
          className="flex flex-col items-center justify-center -mt-5 w-14 h-14 rounded-full text-white transition-transform active:scale-95 hover:opacity-90"
          style={{ background: '#5B4FCF', boxShadow: '0 4px 20px rgba(91,79,207,0.4)' }}
          aria-label="Add content">
          <motion.div animate={{ rotate: sheet ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={26} strokeWidth={2} />
          </motion.div>
        </button>

        {RIGHT_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href))
          return (
            <Link key={href} href={href}
              className={clsx('flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors', isActive ? 'text-purple' : 'text-text-muted hover:text-text-primary')}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={clsx('text-[10px] font-semibold tracking-wide', isActive ? 'text-purple' : 'text-text-muted')}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <AnimatePresence>
        {sheet && (
          <ActionSheet onClose={() => setSheet(false)} onNugget={openNugget}
            onLogReading={openLogReading} onChallengePost={openChallengePost}
            isCheckedIn={isCheckedInToday} />
        )}
        {nuggetOpen    && <NuggetModal        onClose={() => setNuggetOpen(false)} />}
        {challengePost && <ChallengePostModal onClose={() => setChallengePost(false)} />}
      </AnimatePresence>

      <ToastContainer />
    </>
  )
}