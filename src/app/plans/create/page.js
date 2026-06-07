'use client'

// ── src/app/plans/create/page.js ── v6
// FIXES:
//   1. CTA button: bottom:64px (clears 64px BottomNav exactly)
//   2. Shared/Public plan type: shows sign-in prompt inline if not authenticated
//   3. Topic pace: 1 verse/day | 2 verses/day | 1 chapter/day | 2 chapters/day | custom
//   4. Character plans: same pace options as topic
//   5. Content stored as reference-only flat array (no Bible text)
//   6. Local plan uses content[] + frequency — works with getSliceForDay
//   7. Where do character plans go: src/data/character-plans.json (explained at bottom)

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams }     from 'next/navigation'
import { motion, AnimatePresence }        from 'framer-motion'
import {
  ArrowLeft, Check, BookOpen, Layers, Users,
  Globe, Lock, Loader2, Copy, ChevronRight,
} from 'lucide-react'
import { useDarkMode, getDarkModeColors } from '../../../contexts/DarkModeContext'
import { ToastContainer, showToast }      from '../../../components/Toast'
import {
  BIBLE_BOOKS_FULL, TOPICS, CHARACTERS, PLAN_TEMPLATES,
  generateInviteCode,
} from '../../../lib/reading-data'
import { readPlans, writePlans } from '../../../lib/plans'
import { createClient }          from '../../../lib/supabase/client'

function todayStr() { return new Date().toISOString().split('T')[0] }

// ─────────────────────────────────────────────
//  Pace options — book vs topic/character
// ─────────────────────────────────────────────
const BOOK_PACE = [
  { id:'1ch', label:'1 chapter/day',  unit:'chapter', count:1 },
  { id:'2ch', label:'2 chapters/day', unit:'chapter', count:2 },
  { id:'3ch', label:'3 chapters/day', unit:'chapter', count:3 },
]

const TOPIC_PACE = [
  { id:'1v',  label:'1 verse/day',    unit:'verse',   count:1 },
  { id:'2v',  label:'2 verses/day',   unit:'verse',   count:2 },
  { id:'1ch', label:'1 chapter/day',  unit:'chapter', count:1 },
  { id:'2ch', label:'2 chapters/day', unit:'chapter', count:2 },
]

// ─────────────────────────────────────────────
//  Content builders (reference-only — no Bible text stored)
// ─────────────────────────────────────────────
function buildBookContent(books) {
  const items = []
  for (const book of books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      items.push({ reference: `${book.name} ${ch}`, book: book.name, chapter: ch })
    }
  }
  return items
}

function buildTopicContent(passages) {
  return (passages || []).map(p => {
    const ref = p.ref || p.reference || ''
    const m   = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?$/)
    return {
      reference: ref,
      book:      m?.[1] || ref,
      chapter:   parseInt(m?.[2]) || 1,
      verse:     m?.[3] ? parseInt(m[3]) : null,
      title:     p.title || ref,
      focus:     p.focus || null,
    }
  })
}

function calcDuration(content, pace) {
  if (!content?.length || !pace) return 0
  if (pace.unit === 'verse')   return Math.ceil(content.length / pace.count)
  // chapter: count unique book+chapter combos
  const uniq = new Set(content.map(c => `${c.book}||${c.chapter}`))
  return Math.ceil(uniq.size / pace.count)
}

function formatDuration(days) {
  if (!days) return '—'
  if (days <= 7)   return `${days} days`
  if (days <= 31)  return `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''}`
  return `${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''}`
}

// ─────────────────────────────────────────────
//  Step dots
// ─────────────────────────────────────────────
function Dots({ current, total, c }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8, borderRadius: 99,
          background: i <= current ? '#5B4FCF' : c.bgMuted, transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Pace selector (shared by book / topic / character)
// ─────────────────────────────────────────────
function PacePicker({ options, pace, setPace, duration, c }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[16px]"
      style={{ background: c.bgCard, border: '1.5px solid #5B4FCF30' }}>
      <p className="font-bold text-[14px]" style={{ color: c.text }}>How much per day?</p>
      <div className="flex flex-col gap-1.5">
        {options.map(p => {
          const sel = pace?.id === p.id
          return (
            <button key={p.id} onClick={() => setPace(p)}
              className="flex items-center justify-between px-4 py-3 rounded-[12px] border-2 transition-all"
              style={{
                background:  sel ? '#EDE9FF' : c.bgMuted,
                borderColor: sel ? '#5B4FCF' : c.border,
              }}>
              <span className="font-semibold text-[14px]" style={{ color: c.text }}>{p.label}</span>
              {duration > 0 && (
                <span className="text-[12px] font-semibold"
                  style={{ color: sel ? '#5B4FCF' : c.textMuted }}>
                  {duration} days
                </span>
              )}
            </button>
          )
        })}
      </div>
      {pace && duration > 0 && (
        <div className="px-4 py-3 rounded-[12px] text-center" style={{ background: '#EDE9FF' }}>
          <p className="font-bold text-[15px]" style={{ color: '#5B4FCF' }}>
            You'll finish in {formatDuration(duration)} 🎯
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1 — Mode
// ─────────────────────────────────────────────
function StepMode({ mode, setMode, c }) {
  const MODES = [
    { id:'book',      Icon:BookOpen, color:'#5B4FCF', bg:'#EDE9FF', title:'Read by Book',      desc:'Any book of the Bible, chapter by chapter' },
    { id:'topic',     Icon:Layers,   color:'#4A7C5F', bg:'#E8F5EE', title:'Read by Topic',     desc:'Faith, Prayer, Identity, Peace, Wisdom…' },
    { id:'character', Icon:Users,    color:'#E8A838', bg:'#FFF3DC', title:'Read by Character', desc:'David, Paul, Esther, Ruth and more' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[26px]" style={{ color: c.text }}>
          Start a reading plan
        </h2>
        <p className="text-[14px] mt-1" style={{ color: c.textMuted }}>How would you like to read?</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {MODES.map(({ id, Icon, color, bg, title, desc }) => {
          const sel = mode === id
          return (
            <button key={id} onClick={() => setMode(id)}
              className="flex items-center gap-3 px-4 py-4 rounded-[18px] text-left active:scale-[0.98] transition-all border-2"
              style={{ background: sel ? bg : c.bgCard, borderColor: sel ? color : c.border }}>
              <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{ background: sel ? color : bg }}>
                <Icon size={21} color={sel ? 'white' : color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]" style={{ color: c.text }}>{title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>{desc}</p>
              </div>
              {sel && <Check size={18} style={{ color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
      {/* Templates shortcut */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: c.textFaint }}>
          Quick start
        </p>
        <div className="flex gap-2 flex-wrap">
          {PLAN_TEMPLATES.slice(0, 5).map(tpl => (
            <button key={tpl.id} onClick={() => setMode('book')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold border"
              style={{ background: c.bgCard, borderColor: c.border, color: c.text }}>
              {tpl.icon} {tpl.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2A — Book + pace
// ─────────────────────────────────────────────
function StepBook({ books, setBooks, pace, setPace, c }) {
  const [search, setSearch] = useState('')
  const OT = BIBLE_BOOKS_FULL.filter(b => b.testament === 'OT' && b.name.toLowerCase().includes(search.toLowerCase()))
  const NT = BIBLE_BOOKS_FULL.filter(b => b.testament === 'NT' && b.name.toLowerCase().includes(search.toLowerCase()))
  const total = books.reduce((s, b) => s + b.chapters, 0)
  const dur   = pace ? Math.ceil(total / pace.count) : 0

  function toggle(book) {
    setBooks(prev => prev.find(b => b.name === book.name) ? prev.filter(b => b.name !== book.name) : [...prev, book])
  }

  function Group({ label, items }) {
    if (!items.length) return null
    return (
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
          style={{ color: c.textFaint }}>{label}</p>
        <div className="grid grid-cols-2 gap-2">
          {items.map(book => {
            const sel = !!books.find(b => b.name === book.name)
            return (
              <button key={book.name} onClick={() => toggle(book)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] border-2 text-left transition-all active:scale-[0.97]"
                style={{ background: sel ? '#EDE9FF' : c.bgCard, borderColor: sel ? '#5B4FCF' : c.border }}>
                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: sel ? '#5B4FCF' : c.border }}>
                  {sel && <div className="w-2 h-2 rounded-full" style={{ background: '#5B4FCF' }} />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate"
                    style={{ color: sel ? '#5B4FCF' : c.text }}>{book.name}</p>
                  <p className="text-[10px]" style={{ color: c.textFaint }}>{book.chapters} ch</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: c.text }}>Choose a book</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Pick one or more books of the Bible</p>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search books…"
        className="w-full px-4 py-3 rounded-[14px] border text-[14px] focus:outline-none"
        style={{ background: c.bgMuted, borderColor: c.border, color: c.text }} />
      {books.length > 0 && (
        <p className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
          {books.map(b => b.name).join(', ')} — {total} chapters
        </p>
      )}
      <Group label="Old Testament" items={OT} />
      <Group label="New Testament" items={NT} />
      {books.length > 0 && (
        <PacePicker options={BOOK_PACE} pace={pace} setPace={setPace} duration={dur} c={c} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2B — Topic + pace
// ─────────────────────────────────────────────
function StepTopic({ topicId, setTopicId, pace, setPace, c }) {
  const topic = TOPICS.find(t => t.id === topicId)
  const dur   = topic ? calcDuration(buildTopicContent(topic.passages), pace) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: c.text }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>
          Curated Scripture passages on each theme
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {TOPICS.map(top => {
          const sel = topicId === top.id
          return (
            <button key={top.id} onClick={() => setTopicId(top.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left border-2 transition-all active:scale-[0.98]"
              style={{ background: sel ? `${top.color}15` : c.bgCard, borderColor: sel ? top.color : c.border }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{top.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: sel ? top.color : c.text }}>
                  {top.name}
                </p>
                <p className="text-[12px]" style={{ color: c.textMuted }}>
                  {top.passages?.length || 0} passages
                </p>
              </div>
              {sel && <Check size={16} style={{ color: top.color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
      {topicId && (
        <PacePicker options={TOPIC_PACE} pace={pace} setPace={setPace} duration={dur} c={c} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2C — Character + pace
// ─────────────────────────────────────────────
function StepCharacter({ charId, setCharId, pace, setPace, c }) {
  const char = CHARACTERS.find(ch => ch.id === charId)
  const dur  = char ? calcDuration(buildTopicContent(char.passages), pace) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: c.text }}>Choose a character</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Follow their story through Scripture</p>
      </div>
      <div className="flex flex-col gap-2">
        {CHARACTERS.map(ch => {
          const sel  = charId === ch.id
          const total = ch.passages?.length || 0
          return (
            <button key={ch.id} onClick={() => setCharId(ch.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left border-2 transition-all active:scale-[0.98]"
              style={{ background: sel ? `${ch.color}15` : c.bgCard, borderColor: sel ? ch.color : c.border }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{ch.icon || '👤'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: sel ? ch.color : c.text }}>{ch.name}</p>
                <p className="text-[12px]" style={{ color: c.textMuted }}>
                  {ch.description} · {total} passages
                </p>
              </div>
              {sel && <Check size={16} style={{ color: ch.color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
      {charId && (
        <PacePicker options={TOPIC_PACE} pace={pace} setPace={setPace} duration={dur} c={c} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 3 — Name + plan type
//  FIX: Shared/Public shows sign-in nudge inline when not authenticated
// ─────────────────────────────────────────────
function StepDetails({ name, setName, planType, setPlanType, autoName, authUser, c, router }) {
  const TYPES = [
    { key:'local',  Icon:Lock,  label:'Just me',      sub:'Saved on this device — no account needed' },
    { key:'group',  Icon:Users, label:'Shared group',  sub:'Invite others via code — free account needed'  },
    { key:'public', Icon:Globe, label:'Public',        sub:'Anyone can discover it — free account needed'  },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: c.text }}>Almost done</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Name your plan and choose who it's for</p>
      </div>

      <div>
        <p className="text-[13px] font-bold mb-2" style={{ color: c.textMuted }}>Plan name (optional)</p>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={autoName}
          className="w-full px-4 py-3.5 rounded-[14px] border text-[14px] focus:outline-none"
          style={{ background: c.bgMuted, borderColor: name ? '#5B4FCF' : c.border, color: c.text }} />
        {!name && (
          <p className="text-[11px] mt-1.5" style={{ color: c.textFaint }}>
            Will use "{autoName}" if left blank
          </p>
        )}
      </div>

      <div>
        <p className="text-[13px] font-bold mb-2" style={{ color: c.textMuted }}>Who is this plan for?</p>
        <div className="flex flex-col gap-2">
          {TYPES.map(({ key, Icon, label, sub }) => {
            const sel = planType === key
            const needsAuth = key !== 'local'
            const locked = needsAuth && !authUser
            return (
              <button key={key}
                onClick={() => {
                  if (locked) {
                    // Soft prompt — let them select but warn
                    setPlanType(key)
                    return
                  }
                  setPlanType(key)
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] border-2 text-left transition-all"
                style={{ background: sel ? '#EDE9FF' : c.bgCard, borderColor: sel ? '#5B4FCF' : c.border }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: sel ? '#5B4FCF' : c.bgMuted }}>
                  <Icon size={17} color={sel ? 'white' : c.textMuted} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[14px]" style={{ color: c.text }}>{label}</p>
                    {locked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
                        Sign in
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>{sub}</p>
                </div>
                {sel && !locked && <Check size={16} style={{ color: '#5B4FCF', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>

        {/* Inline sign-in nudge when shared/public selected but not signed in */}
        {(planType === 'group' || planType === 'public') && !authUser && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 px-4 py-3.5 rounded-[14px]"
            style={{ background: '#EDE9FF' }}>
            <p className="font-bold text-[13px]" style={{ color: '#5B4FCF' }}>
              Free account needed to share plans
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#7C6FCD' }}>
              Sign in to create shared plans with invite codes and group progress.
            </p>
            <button
              onClick={() => router.push('/auth?next=/plans/create')}
              className="mt-2.5 px-4 py-2 rounded-full font-bold text-[12px] text-white"
              style={{ background: '#5B4FCF' }}>
              Sign in / Create account →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Success screen
// ─────────────────────────────────────────────
function SuccessScreen({ plan, planType, c, router }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(plan.inviteCode || '').catch(() => null)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex flex-col items-center text-center gap-5 py-8 px-5">
      <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-[44px]"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>📖</div>
      <div>
        <p className="font-display font-bold text-[26px]" style={{ color: c.text }}>Plan created! 🎉</p>
        <p className="text-[14px] mt-1" style={{ color: c.textMuted }}>"{plan.name}" is ready to go.</p>
      </div>
      {plan.inviteCode && planType !== 'local' && (
        <div className="w-full rounded-[18px] p-5"
          style={{ background: c.bgCard, border: '1.5px solid #5B4FCF30' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#7C6FCD' }}>Invite code</p>
          <p className="font-bold text-[28px] tracking-[0.15em]" style={{ color: '#5B4FCF' }}>
            {plan.inviteCode}
          </p>
          <button onClick={copy}
            className="mt-2 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-full text-[13px] font-bold text-white"
            style={{ background: copied ? '#4A7C5F' : '#5B4FCF' }}>
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-2 w-full">
        <button onClick={() => router.push(plan.id ? `/plans/${plan.id}` : '/plans')}
          className="w-full py-4 rounded-full text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          Start reading →
        </button>
        <button onClick={() => router.push('/plans')}
          className="text-[13px] font-semibold py-2" style={{ color: c.textMuted }}>
          Back to plans
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main create flow
// ─────────────────────────────────────────────
function CreateContent() {
  const router = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [created, setCreated] = useState(null)

  // Step 1
  const [mode, setMode] = useState(null)

  // Step 2 — book
  const [books,    setBooks]    = useState([])
  const [bookPace, setBookPace] = useState(null)

  // Step 2 — topic
  const [topicId,    setTopicId]    = useState(null)
  const [topicPace,  setTopicPace]  = useState(null)

  // Step 2 — character
  const [charId,   setCharId]   = useState(null)
  const [charPace, setCharPace] = useState(null)

  // Step 3
  const [name,     setName]     = useState('')
  const [planType, setPlanType] = useState('local')

  // Auth (background check — doesn't block render)
  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    const sb = createClient()
    if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => setAuthUser(user || null)).catch(() => null)
  }, [])

  // Derived
  const content = (() => {
    if (mode === 'book' && books.length)
      return buildBookContent(books)
    if (mode === 'topic' && topicId)
      return buildTopicContent(TOPICS.find(t => t.id === topicId)?.passages || [])
    if (mode === 'character' && charId)
      return buildTopicContent(CHARACTERS.find(c => c.id === charId)?.passages || [])
    return []
  })()

  const pace = mode === 'book' ? bookPace : mode === 'topic' ? topicPace : charPace

  const totalDays = calcDuration(content, pace)

  const autoName = (() => {
    if (mode === 'book' && books.length)
      return books.length === 1 ? `Reading ${books[0].name}` : `Reading ${books.map(b => b.name).join(', ')}`
    if (mode === 'topic' && topicId)
      return `${TOPICS.find(t => t.id === topicId)?.name || ''} Study`
    if (mode === 'character' && charId)
      return `The Story of ${CHARACTERS.find(c => c.id === charId)?.name || ''}`
    return 'My Reading Plan'
  })()

  const step2Valid = (
    (mode === 'book'      && books.length > 0 && !!bookPace) ||
    (mode === 'topic'     && !!topicId && !!topicPace) ||
    (mode === 'character' && !!charId && !!charPace)
  )
  const canContinue = step === 1 ? !!mode : step === 2 ? step2Valid : true

  async function handleCreate() {
    if (saving) return
    setSaving(true)
    const finalName  = name.trim() || autoName
    const inviteCode = generateInviteCode(finalName)

    try {
      if (planType === 'local' || (!authUser && planType !== 'local')) {
        // Local plan — always works, no auth needed
        // (If user chose group/public but isn't signed in, fallback to local)
        const localPlan = {
          id:             `local_${Date.now()}`,
          name:           finalName,
          type:           mode,
          status:         'active',
          currentDay:     1,
          totalDays,
          frequencyUnit:  pace.unit,
          frequencyCount: pace.count,
          content,
          createdAt:      new Date().toISOString(),
          days: Array.from({ length: totalDays }, (_, i) => {
            const start = i * pace.count
            const slice = content.slice(start, start + pace.count)
            const ref   = slice.length === 1
              ? slice[0].reference
              : slice.length > 1
                ? `${slice[0].reference} – ${slice[slice.length - 1].reference}`
                : `Day ${i + 1}`
            return { day: i + 1, passage: ref, completedAt: null }
          }),
        }
        writePlans([...readPlans(), localPlan])
        setCreated({ ...localPlan, inviteCode: null })
        setStep(4)
      } else {
        // Supabase plan
        const { createSharedPlan } = await import('../../../lib/supabase/plans')
        const plan = await createSharedPlan({
          name:        finalName,
          visibility:  planType === 'public' ? 'public' : 'private',
          startDate:   todayStr(),
          inviteCode,
          planSubtype: mode,
          content,
          itemUnit:    pace.unit,
        })
        setCreated({ ...plan, inviteCode: plan.inviteCode || inviteCode })
        setStep(4)
      }
    } catch (e) {
      if (e.message === 'not_authenticated') {
        showToast('Creating as local plan — sign in to share')
        // Fall back to local
        const localPlan = {
          id: `local_${Date.now()}`,
          name: name.trim() || autoName,
          type: mode, status: 'active', currentDay: 1,
          totalDays, frequencyUnit: pace.unit, frequencyCount: pace.count,
          content, createdAt: new Date().toISOString(),
          days: Array.from({ length: totalDays }, (_, i) => ({
            day: i + 1,
            passage: content[i * pace.count]?.reference || `Day ${i + 1}`,
            completedAt: null,
          })),
        }
        writePlans([...readPlans(), localPlan])
        setCreated({ ...localPlan, inviteCode: null })
        setStep(4)
      } else {
        showToast('Failed to create — try again')
        console.error(e)
      }
    } finally { setSaving(false) }
  }

  if (step === 4 && created) {
    return (
      <div className="min-h-screen" style={{ background: c.bg }}>
        <ToastContainer />
        <SuccessScreen plan={created} planType={planType} c={c} router={router} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: c.bgCard }}>
          <ArrowLeft size={18} style={{ color: c.text }} />
        </button>
        <Dots current={step - 1} total={3} c={c} />
        <div className="w-9" />
      </div>

      {/* Scrollable content — 130px bottom padding so CTA is never hidden */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 130 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}>

            {step === 1 && <StepMode mode={mode} setMode={setMode} c={c} />}
            {step === 2 && mode === 'book'      && <StepBook books={books} setBooks={setBooks} pace={bookPace} setPace={setBookPace} c={c} />}
            {step === 2 && mode === 'topic'     && <StepTopic topicId={topicId} setTopicId={setTopicId} pace={topicPace} setPace={setTopicPace} c={c} />}
            {step === 2 && mode === 'character' && <StepCharacter charId={charId} setCharId={setCharId} pace={charPace} setPace={setCharPace} c={c} />}
            {step === 3 && (
              <StepDetails
                name={name} setName={setName}
                planType={planType} setPlanType={setPlanType}
                autoName={autoName} authUser={authUser}
                c={c} router={router} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── FIXED CTA ── bottom:64 = sits directly above 64px BottomNav */}
      <div style={{
        position: 'fixed',
        bottom:   64,   // ← exact height of BottomNav
        left:     '50%',
        transform:'translateX(-50%)',
        width:    '100%',
        maxWidth: 430,
        padding:  '10px 16px',
        background: c.bg,
        borderTop: `1px solid ${c.border}`,
        zIndex: 45,
      }}>
        <button
          onClick={() => step < 3 ? setStep(s => s + 1) : handleCreate()}
          disabled={!canContinue || saving}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-35 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {saving
            ? <><Loader2 size={17} className="animate-spin" /> Creating…</>
            : step < 3 ? 'Continue →' : 'Create Plan 🙌'}
        </button>
      </div>
    </div>
  )
}

export default function CreatePlanPage() {
  return (
    <Suspense fallback={null}>
      <CreateContent />
    </Suspense>
  )
}

// ─────────────────────────────────────────────
//  WHERE DO CHARACTER PLANS GO?
//  Character plans live in two places:
//
//  1. HARDCODED (in-app, always available offline):
//     src/lib/reading-data.js → CHARACTERS array
//     Each character has: id, name, icon, color, description, passages[]
//     These show up immediately in Step 2C (StepCharacter above).
//
//  2. SEEDED TO SUPABASE (discoverable public plans):
//     src/data/character-plans.json → run `node scripts/seed-plans.js`
//     These appear in /plans/discover for anyone to join.
//
//  The CHARACTERS in reading-data.js are used for PERSONAL plans
//  (saved to localStorage). The seeded Supabase plans are GROUP plans
//  that multiple people can join and read together.
// ─────────────────────────────────────────────