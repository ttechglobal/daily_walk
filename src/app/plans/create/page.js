'use client'

// ── src/app/plans/create/page.js ── v5
//
// BOOK PLANS: 1 chapter/day | 2 chapters/day | 3 chapters/day | custom
//   Content = one item per chapter. Frequency = { unit: 'chapter', count: N }
//
// TOPIC/CHARACTER PLANS: 1 verse/day | 2 verses/day | 1 chapter/day | 2 chapters/day
//   Content = one item per passage. Frequency = { unit: 'verse'|'chapter', count: N }
//
// Both use getSliceForDay() from plan-schedule.js to compute daily reading.
// Both local (localStorage) and Supabase plans supported.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, BookOpen, Layers, Users,
  Globe, Lock, Loader2, Copy, ChevronRight, Plus,
} from 'lucide-react'
import { useTheme }              from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  BIBLE_BOOKS_FULL, TOPICS, CHARACTERS, PLAN_TEMPLATES,
  BOOK_PACE_OPTIONS, TOPIC_PACE_OPTIONS,
  booksToContent, topicToContent, calcBookDuration, calcTopicDuration,
  generateInviteCode,
} from '../../../lib/reading-data'
import { readPlans, writePlans } from '../../../lib/plans'
import { createClient } from '../../../lib/supabase/client'

function todayStr() { return new Date().toISOString().split('T')[0] }

// ─────────────────────────────────────────────
//  Step dots
// ─────────────────────────────────────────────
function Dots({ current, total, t }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8, borderRadius: 99,
          background: i <= current ? '#5B4FCF' : t.bgMuted, transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Duration badge
// ─────────────────────────────────────────────
function DurationBadge({ days, t }) {
  if (!days) return null
  const label = days <= 7   ? `${days} days`
              : days <= 31  ? `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''}`
              : `${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''}`
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="px-4 py-3 rounded-[14px] text-center"
      style={{ background: '#EDE9FF' }}>
      <p className="font-display font-bold text-[22px]" style={{ color: '#5B4FCF' }}>{label}</p>
      <p className="text-[12px] mt-0.5" style={{ color: '#7C6FCD' }}>reading plan</p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Step 1 — Mode (Book / Topic / Character)
// ─────────────────────────────────────────────
function StepMode({ mode, setMode, t }) {
  const OPTIONS = [
    { id: 'book',      Icon: BookOpen, color: '#5B4FCF', bg: '#EDE9FF', label: 'Read by Book',      desc: 'Any book of the Bible, chapter by chapter' },
    { id: 'topic',     Icon: Layers,   color: '#4A7C5F', bg: '#E8F5EE', label: 'Read by Topic',     desc: 'Faith, prayer, identity, peace, wisdom…' },
    { id: 'character', Icon: Users,    color: '#E8A838', bg: '#FFF3DC', label: 'Read by Character', desc: 'David, Paul, Esther, Ruth and more' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[26px]" style={{ color: t.text }}>
          Start a reading plan
        </h2>
        <p className="text-[14px] mt-1" style={{ color: t.textMuted }}>How would you like to read?</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map(({ id, Icon, color, bg, label, desc }) => (
          <button key={id} onClick={() => setMode(id)}
            className="flex items-center gap-3 px-4 py-4 rounded-[18px] text-left active:scale-[0.98] transition-all border-2"
            style={{
              background:  mode === id ? bg   : t.bgCard,
              borderColor: mode === id ? color : t.border,
            }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background: mode === id ? color : bg }}>
              <Icon size={20} color={mode === id ? 'white' : color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]" style={{ color: t.text }}>{label}</p>
              <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>{desc}</p>
            </div>
            {mode === id && <Check size={18} style={{ color, flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      {/* Templates shortcut */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textFaint }}>
          Popular templates
        </p>
        <div className="flex gap-2 flex-wrap">
          {PLAN_TEMPLATES.slice(0, 5).map(tpl => (
            <button key={tpl.id} onClick={() => setMode('book')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold border"
              style={{ background: t.bgCard, borderColor: t.border, color: t.text }}>
              {tpl.icon} {tpl.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2A — Book picker + pace
// ─────────────────────────────────────────────
function StepBook({ books, setBooks, pace, setPace, customPace, setCustomPace, t }) {
  const [search,  setSearch]  = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const OT = BIBLE_BOOKS_FULL.filter(b => b.testament === 'OT' && b.name.toLowerCase().includes(search.toLowerCase()))
  const NT = BIBLE_BOOKS_FULL.filter(b => b.testament === 'NT' && b.name.toLowerCase().includes(search.toLowerCase()))

  const totalChapters = books.reduce((s, b) => s + b.chapters, 0)
  const chaptersPerDay = showCustom ? (customPace || 1) : (pace?.chaptersPerDay || 1)
  const duration = totalChapters > 0 ? Math.ceil(totalChapters / chaptersPerDay) : 0

  function toggle(book) {
    setBooks(prev =>
      prev.find(b => b.name === book.name) ? prev.filter(b => b.name !== book.name) : [...prev, book]
    )
  }

  function BookGroup({ label, items }) {
    if (!items.length) return null
    return (
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: t.textFaint }}>{label}</p>
        <div className="grid grid-cols-2 gap-2">
          {items.map(book => {
            const sel = !!books.find(b => b.name === book.name)
            return (
              <button key={book.name} onClick={() => toggle(book)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-left border-2 transition-all active:scale-[0.97]"
                style={{
                  background:  sel ? '#EDE9FF' : t.bgCard,
                  borderColor: sel ? '#5B4FCF' : t.border,
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: sel ? '#5B4FCF' : t.border }}>
                  {sel && <div className="w-2 h-2 rounded-full" style={{ background: '#5B4FCF' }} />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate"
                    style={{ color: sel ? '#5B4FCF' : t.text }}>{book.name}</p>
                  <p className="text-[10px]" style={{ color: t.textFaint }}>{book.chapters} ch</p>
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
        <h2 className="font-display font-bold text-[24px]" style={{ color: t.text }}>Choose a book</h2>
        <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
          Pick one or more books of the Bible
        </p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search books…"
        className="w-full px-4 py-3 rounded-[14px] border text-[14px] focus:outline-none"
        style={{ background: t.bgMuted, borderColor: t.border, color: t.text }} />

      {books.length > 0 && (
        <p className="text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
          Selected: {books.map(b => b.name).join(', ')} — {totalChapters} chapters
        </p>
      )}

      <BookGroup label="Old Testament" items={OT} />
      <BookGroup label="New Testament" items={NT} />

      {/* Pace — only shown when books are selected */}
      {books.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background: t.bgCard, border: `1.5px solid #5B4FCF30` }}>
          <p className="font-bold text-[14px]" style={{ color: t.text }}>How much per day?</p>

          <div className="flex flex-col gap-1.5">
            {BOOK_PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => { setPace(p); setShowCustom(false) }}
                className="flex items-center justify-between px-4 py-3 rounded-[12px] border-2 transition-all"
                style={{
                  background:  !showCustom && pace?.id === p.id ? '#EDE9FF' : t.bgMuted,
                  borderColor: !showCustom && pace?.id === p.id ? '#5B4FCF' : t.border,
                }}>
                <span className="font-semibold text-[14px]" style={{ color: t.text }}>{p.label}</span>
                {totalChapters > 0 && (
                  <span className="text-[12px] font-semibold"
                    style={{ color: !showCustom && pace?.id === p.id ? '#5B4FCF' : t.textMuted }}>
                    {Math.ceil(totalChapters / p.chaptersPerDay)} days
                  </span>
                )}
              </button>
            ))}

            {/* Custom */}
            <button onClick={() => setShowCustom(true)}
              className="flex items-center justify-between px-4 py-3 rounded-[12px] border-2 transition-all"
              style={{
                background:  showCustom ? '#EDE9FF' : t.bgMuted,
                borderColor: showCustom ? '#5B4FCF' : t.border,
              }}>
              <span className="font-semibold text-[14px]" style={{ color: t.text }}>Custom</span>
              {showCustom && (
                <input
                  type="number" min="1" max="50"
                  value={customPace || ''}
                  onChange={e => setCustomPace(Math.max(1, parseInt(e.target.value) || 1))}
                  onClick={e => e.stopPropagation()}
                  placeholder="chapters/day"
                  className="w-28 text-right text-[13px] font-bold focus:outline-none rounded-lg px-2 py-1"
                  style={{ background: '#EDE9FF', color: '#5B4FCF', border: 'none' }}
                />
              )}
            </button>
          </div>

          {duration > 0 && (
            <DurationBadge days={duration} t={t} />
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2B — Topic picker + pace
// ─────────────────────────────────────────────
function StepTopic({ topicId, setTopicId, pace, setPace, t }) {
  const topic    = TOPICS.find(x => x.id === topicId)
  const duration = topic ? calcTopicDuration(topic.passages, pace) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: t.text }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
          Curated passages from across the Bible
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {TOPICS.map(top => {
          const sel = topicId === top.id
          return (
            <button key={top.id} onClick={() => setTopicId(top.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left border-2 transition-all active:scale-[0.98]"
              style={{
                background:  sel ? `${top.color}12` : t.bgCard,
                borderColor: sel ? top.color : t.border,
              }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{top.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: sel ? top.color : t.text }}>
                  {top.name}
                </p>
                <p className="text-[12px]" style={{ color: t.textMuted }}>
                  {top.description} · {top.passages.length} passages
                </p>
              </div>
              {sel && <Check size={16} style={{ color: top.color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      {topicId && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background: t.bgCard, border: `1.5px solid #5B4FCF30` }}>
          <p className="font-bold text-[14px]" style={{ color: t.text }}>How much per day?</p>
          <div className="flex flex-col gap-1.5">
            {TOPIC_PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPace(p)}
                className="flex items-center justify-between px-4 py-3 rounded-[12px] border-2 transition-all"
                style={{
                  background:  pace?.id === p.id ? '#EDE9FF' : t.bgMuted,
                  borderColor: pace?.id === p.id ? '#5B4FCF' : t.border,
                }}>
                <span className="font-semibold text-[14px]" style={{ color: t.text }}>{p.label}</span>
                {topic && (
                  <span className="text-[12px] font-semibold"
                    style={{ color: pace?.id === p.id ? '#5B4FCF' : t.textMuted }}>
                    {calcTopicDuration(topic.passages, p)} days
                  </span>
                )}
              </button>
            ))}
          </div>
          {pace && duration > 0 && <DurationBadge days={duration} t={t} />}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2C — Character picker + pace
// ─────────────────────────────────────────────
function StepCharacter({ charId, setCharId, pace, setPace, t }) {
  const char     = CHARACTERS.find(c => c.id === charId)
  const duration = char ? calcTopicDuration(char.passages, pace) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: t.text }}>Choose a character</h2>
        <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
          Follow their story through Scripture
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {CHARACTERS.map(ch => {
          const sel = charId === ch.id
          return (
            <button key={ch.id} onClick={() => setCharId(ch.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left border-2 transition-all active:scale-[0.98]"
              style={{
                background:  sel ? `${ch.color}12` : t.bgCard,
                borderColor: sel ? ch.color : t.border,
              }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{ch.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: sel ? ch.color : t.text }}>
                  {ch.name}
                </p>
                <p className="text-[12px]" style={{ color: t.textMuted }}>
                  {ch.description} · {ch.passages.length} passages
                </p>
              </div>
              {sel && <Check size={16} style={{ color: ch.color, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      {charId && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background: t.bgCard, border: `1.5px solid #5B4FCF30` }}>
          <p className="font-bold text-[14px]" style={{ color: t.text }}>How much per day?</p>
          <div className="flex flex-col gap-1.5">
            {TOPIC_PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPace(p)}
                className="flex items-center justify-between px-4 py-3 rounded-[12px] border-2 transition-all"
                style={{
                  background:  pace?.id === p.id ? '#EDE9FF' : t.bgMuted,
                  borderColor: pace?.id === p.id ? '#5B4FCF' : t.border,
                }}>
                <span className="font-semibold text-[14px]" style={{ color: t.text }}>{p.label}</span>
                {char && (
                  <span className="text-[12px] font-semibold"
                    style={{ color: pace?.id === p.id ? '#5B4FCF' : t.textMuted }}>
                    {calcTopicDuration(char.passages, p)} days
                  </span>
                )}
              </button>
            ))}
          </div>
          {pace && duration > 0 && <DurationBadge days={duration} t={t} />}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 3 — Name + Visibility
// ─────────────────────────────────────────────
function StepConfigure({ name, setName, planType, setPlanType, autoName, t }) {
  const TYPES = [
    { key: 'local',  Icon: Lock,  label: 'Just me',     sub: 'Saved on this device — no account needed' },
    { key: 'group',  Icon: Users, label: 'Shared group', sub: 'Invite others via code — requires account'  },
    { key: 'public', Icon: Globe, label: 'Public',       sub: 'Anyone can find and join — requires account'},
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color: t.text }}>Finish setting up</h2>
        <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>Name your plan and choose who it's for</p>
      </div>

      <div>
        <p className="text-[13px] font-bold mb-2" style={{ color: t.textMuted }}>Plan name (optional)</p>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={autoName}
          className="w-full px-4 py-3.5 rounded-[14px] border text-[14px] focus:outline-none"
          style={{ background: t.bgMuted, borderColor: name ? '#5B4FCF' : t.border, color: t.text }} />
        {!name && <p className="text-[11px] mt-1.5" style={{ color: t.textFaint }}>Will use "{autoName}" if left blank</p>}
      </div>

      <div>
        <p className="text-[13px] font-bold mb-2" style={{ color: t.textMuted }}>Who is this plan for?</p>
        <div className="flex flex-col gap-2">
          {TYPES.map(({ key, Icon, label, sub }) => (
            <button key={key} onClick={() => setPlanType(key)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] border-2 text-left transition-all"
              style={{
                background:  planType === key ? '#EDE9FF' : t.bgCard,
                borderColor: planType === key ? '#5B4FCF' : t.border,
              }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: planType === key ? '#5B4FCF' : t.bgMuted }}>
                <Icon size={17} color={planType === key ? 'white' : t.textMuted} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[14px]" style={{ color: t.text }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>{sub}</p>
              </div>
              {planType === key && <Check size={16} style={{ color: '#5B4FCF', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Success screen
// ─────────────────────────────────────────────
function SuccessScreen({ plan, planType, t }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(plan.inviteCode || '').catch(() => null)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center text-center gap-5 py-8 px-5">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-[44px]"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>📖</div>
      </motion.div>
      <div>
        <p className="font-display font-bold text-[26px]" style={{ color: t.text }}>Plan created! 🎉</p>
        <p className="text-[14px] mt-1" style={{ color: t.textMuted }}>"{plan.name}" is ready.</p>
      </div>

      {plan.inviteCode && planType !== 'local' && (
        <div className="w-full rounded-[18px] p-5"
          style={{ background: t.bgCard, border: `1.5px solid #5B4FCF30` }}>
          <div className="flex items-center justify-between px-4 py-3 rounded-[12px] mb-2"
            style={{ background: '#EDE9FF' }}>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#7C6FCD' }}>Invite code</p>
              <p className="font-bold text-[28px] tracking-[0.15em]" style={{ color: '#5B4FCF' }}>{plan.inviteCode}</p>
            </div>
            <button onClick={copy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-[13px] text-white"
              style={{ background: copied ? '#4A7C5F' : '#5B4FCF' }}>
              <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[12px]" style={{ color: t.textFaint }}>
            Share this code with friends so they can join
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        <button onClick={() => router.push(plan.id ? `/plans/${plan.id}` : '/plans')}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          Start reading →
        </button>
        <button onClick={() => router.push('/plans')}
          className="text-[13px] font-semibold py-2" style={{ color: t.textMuted }}>
          Back to plans
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
function CreatePlanContent() {
  const router  = useRouter()
  const { t }   = useTheme()

  const [step,        setStep]        = useState(1) // 1=mode 2=content 3=configure 4=done
  const [saving,      setSaving]      = useState(false)
  const [createdPlan, setCreatedPlan] = useState(null)

  // Mode
  const [mode,       setMode]       = useState(null) // 'book'|'topic'|'character'

  // Book selections
  const [books,      setBooks]      = useState([])
  const [bookPace,   setBookPace]   = useState(BOOK_PACE_OPTIONS[0])
  const [customPace, setCustomPace] = useState(1)

  // Topic / character
  const [topicId,    setTopicId]    = useState(null)
  const [charId,     setCharId]     = useState(null)
  const [topicPace,  setTopicPace]  = useState(TOPIC_PACE_OPTIONS[0])

  // Configure
  const [name,       setName]       = useState('')
  const [planType,   setPlanType]   = useState('local')

  // Computed
  const chaptersPerDay = (bookPace?.chaptersPerDay || customPace || 1)

  const content = (() => {
    if (mode === 'book' && books.length) return booksToContent(books)
    if (mode === 'topic' && topicId) {
      const topic = TOPICS.find(t => t.id === topicId)
      return topic ? topicToContent(topic.passages) : []
    }
    if (mode === 'character' && charId) {
      const char = CHARACTERS.find(c => c.id === charId)
      return char ? topicToContent(char.passages) : []
    }
    return []
  })()

  const frequency = mode === 'book'
    ? { unit: 'chapter', count: chaptersPerDay }
    : { unit: topicPace?.unit || 'verse', count: topicPace?.count || 1 }

  const totalDays = (() => {
    if (!content.length) return 0
    if (mode === 'book') return Math.ceil(content.length / frequency.count)
    const { unit, count } = frequency
    if (unit === 'verse') return Math.ceil(content.length / count)
    // chapter: count unique chapters
    const chs = new Set(content.map(c => `${c.book}::${c.chapter}`))
    return Math.ceil(chs.size / count)
  })()

  const autoName = (() => {
    if (mode === 'book' && books.length)
      return books.length === 1 ? `Reading ${books[0].name}` : `Reading ${books.map(b => b.name).join(', ')}`
    if (mode === 'topic' && topicId) {
      const top = TOPICS.find(t => t.id === topicId)
      return top ? `${top.name} Study` : 'My Reading Plan'
    }
    if (mode === 'character' && charId) {
      const ch = CHARACTERS.find(c => c.id === charId)
      return ch ? `The Story of ${ch.name}` : 'My Reading Plan'
    }
    return 'My Reading Plan'
  })()

  // Step validation
  const step2Valid = mode === 'book'      ? books.length > 0
                   : mode === 'topic'     ? !!topicId
                   : mode === 'character' ? !!charId
                   : false
  const canContinue = step === 1 ? !!mode : step === 2 ? step2Valid : true

  async function handleCreate() {
    if (saving) return
    setSaving(true)
    const finalName  = name.trim() || autoName
    const inviteCode = generateInviteCode(finalName)

    try {
      if (planType === 'local') {
        // Local plan — no auth, stored in localStorage
        const plan = {
          id:             `local_${Date.now()}`,
          name:           finalName,
          type:           mode,
          status:         'active',
          currentDay:     1,
          totalDays,
          frequencyUnit:  frequency.unit,
          frequencyCount: frequency.count,
          content,
          createdAt:      new Date().toISOString(),
          // Legacy days array for backwards compat with PlanDetailClient
          days: Array.from({ length: totalDays }, (_, i) => {
            const start = i * frequency.count
            const slice = content.slice(start, start + frequency.count)
            const ref   = slice.length === 0 ? `Day ${i + 1}`
                        : slice.length === 1  ? slice[0].reference
                        : `${slice[0].reference} – ${slice[slice.length - 1].reference}`
            return { day: i + 1, passage: ref, completedAt: null }
          }),
        }
        const existing = readPlans()
        writePlans([...existing, plan])
        setCreatedPlan({ ...plan, inviteCode: null })
        setStep(4)
      } else {
        // Supabase plan
        const sb = createClient()
        if (!sb) throw new Error('not_authenticated')
        const { data: { user } } = await sb.auth.getUser()
        if (!user) throw new Error('not_authenticated')

        const { createSharedPlan } = await import('../../../lib/supabase/plans')
        const plan = await createSharedPlan({
          name:        finalName,
          visibility:  planType === 'public' ? 'public' : 'private',
          startDate:   todayStr(),
          inviteCode,
          planSubtype: mode,
          content,
          itemUnit:    frequency.unit,
        })
        setCreatedPlan({ ...plan, inviteCode: plan.inviteCode || inviteCode })
        setStep(4)
      }
    } catch (e) {
      if (e.message === 'not_authenticated') {
        showToast('Sign in to create a shared plan')
        router.push('/auth?next=/plans/create')
      } else {
        showToast('Failed to create plan — try again')
        console.error(e)
      }
    } finally { setSaving(false) }
  }

  if (step === 4 && createdPlan) {
    return (
      <div className="min-h-screen" style={{ background: t.bg }}>
        <ToastContainer />
        <SuccessScreen plan={createdPlan} planType={planType} t={t} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: t.bg }}>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/plans')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgCard }}>
          <ArrowLeft size={18} style={{ color: t.text }} />
        </button>
        <Dots current={step - 1} total={3} t={t} />
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.16 }}>

            {step === 1 && <StepMode mode={mode} setMode={setMode} t={t} />}

            {step === 2 && mode === 'book' && (
              <StepBook
                books={books} setBooks={setBooks}
                pace={bookPace} setPace={setBookPace}
                customPace={customPace} setCustomPace={setCustomPace}
                t={t} />
            )}
            {step === 2 && mode === 'topic' && (
              <StepTopic topicId={topicId} setTopicId={setTopicId}
                pace={topicPace} setPace={setTopicPace} t={t} />
            )}
            {step === 2 && mode === 'character' && (
              <StepCharacter charId={charId} setCharId={setCharId}
                pace={topicPace} setPace={setTopicPace} t={t} />
            )}

            {step === 3 && (
              <StepConfigure name={name} setName={setName}
                planType={planType} setPlanType={setPlanType}
                autoName={autoName} t={t} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3"
        style={{ background: t.bg, borderTop: `1px solid ${t.border}` }}>
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canContinue}
            className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-40 active:scale-[0.97] transition-all"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            Continue →
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving}
            className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-60 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
            {saving ? <><Loader2 size={17} className="animate-spin" /> Creating…</> : 'Create Plan 🙌'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CreatePlanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#5B4FCF' }} />
      </div>
    }>
      <CreatePlanContent />
    </Suspense>
  )
}