'use client'

// ── src/app/plans/create/page.js ──
// FIXES:
// 1. Continue button always visible — uses fixed positioning with correct
//    bottom offset (80px = nav bar) so it's never hidden by nav or keyboard
// 2. Templates never lock content — all templates jump straight to mode
//    picker, user always chooses Book/Topic/Character themselves
// 3. Plan name is optional — auto-generated from content if not set
// 4. Clean 4-step flow: Mode → Content → Details → Done

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Search, BookOpen,
  Layers, Users, Globe, Lock, Loader2, Copy, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  BIBLE_BOOKS_FULL, TOPICS, CHARACTERS, PLAN_TEMPLATES,
  booksTodays, topicToDays, characterToDays, generateInviteCode,
} from '../../../lib/reading-data'
import { createSharedPlan } from '../../../lib/supabase/plans'
import { getJoinedCommunities } from '../../../lib/supabase/communities'

function todayStr() { return new Date().toISOString().split('T')[0] }

const DURATION_PRESETS = [
  { label:'7 days',   value:7   },
  { label:'14 days',  value:14  },
  { label:'30 days',  value:30  },
  { label:'100 days', value:100 },
  { label:'Custom',   value:0   },
]

const PLAN_TYPES = [
  { key:'private', icon:Lock,  label:'Just me',         sub:'Private — only you'           },
  { key:'group',   icon:Users, label:'Group / Private',  sub:'Invite others via code'       },
  { key:'public',  icon:Globe, label:'Public',           sub:'Anyone can find and join'     },
]

// ─────────────────────────────────────────────
//  Progress dots
// ─────────────────────────────────────────────
function StepDots({ current, total, t }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:      i === current ? 22 : 8,
          height:     8,
          borderRadius: 99,
          background: i <= current ? '#5B4FCF' : t.bgMuted,
          transition: 'all 0.2s ease',
        }}/>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1 — Mode picker
//  Template selection also starts here — templates ONLY set name + duration,
//  user ALWAYS picks the reading approach themselves.
// ─────────────────────────────────────────────
function StepMode({ mode, setMode, templateName, t }) {
  const MODES = [
    { id:'book',      icon:BookOpen, color:'#5B4FCF', bg:'#EDE9FF',
      title:'Read by Book',      desc:'Genesis, Romans, Psalms — any book, chapter by chapter' },
    { id:'topic',     icon:Layers,   color:'#4A7C5F', bg:'#E8F5EE',
      title:'Read by Topic',     desc:'Faith, Prayer, Forgiveness, Love, Wisdom…' },
    { id:'character', icon:Users,    color:'#E8A838', bg:'#FFF3DC',
      title:'Read by Character', desc:'David, Paul, Moses, Esther, Jesus…' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        {templateName ? (
          <>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color:'#5B4FCF' }}>
              Template: {templateName}
            </p>
            <h2 className="font-display font-bold text-[24px]" style={{ color:t.text }}>
              How do you want to read?
            </h2>
            <p className="text-[14px] mt-1" style={{ color:t.textMuted }}>
              Templates suggest a name and length — you choose the content.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display font-bold text-[26px]" style={{ color:t.text }}>
              Start a reading plan
            </h2>
            <p className="text-[14px] mt-1" style={{ color:t.textMuted }}>
              How would you like to read?
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {MODES.map(m => {
          const Icon = m.icon
          const sel  = mode === m.id
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left active:scale-[0.98] transition-all"
              style={{
                background: t.bgCard,
                border:     `2px solid ${sel ? m.color : 'transparent'}`,
                boxShadow:  t.shadow,
              }}>
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                style={{ background: m.bg }}>
                <Icon size={24} style={{ color: m.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]" style={{ color: sel ? m.color : t.text }}>{m.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>{m.desc}</p>
              </div>
              {sel && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: m.color }}>
                  <Check size={13} className="text-white" strokeWidth={3}/>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Template list — below modes, templates only set name+duration */}
      {!templateName && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-2.5" style={{ color:t.textFaint }}>
            Or start with a template
          </p>
          <div className="flex flex-col gap-2">
            {PLAN_TEMPLATES.map(tpl => (
              <a key={tpl.id} href={`/plans/create?template=${tpl.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] active:opacity-80 transition-opacity"
                style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{tpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] truncate" style={{ color:t.text }}>{tpl.name}</p>
                  <p className="text-[12px]" style={{ color:t.textMuted }}>{tpl.durationDays} days</p>
                </div>
                <ChevronRight size={13} style={{ color:t.textFaint }}/>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2A — Book picker
// ─────────────────────────────────────────────
function StepBook({ selectedBooks, setSelectedBooks, t }) {
  const [testament, setTestament] = useState('NT')
  const [search,    setSearch]    = useState('')

  const visible = BIBLE_BOOKS_FULL
    .filter(b => b.testament === testament)
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const totalChapters = selectedBooks.reduce((a, b) => a + b.chapters, 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose books</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>
          Chapters spread evenly across your plan duration.
        </p>
      </div>

      {/* Selected chips */}
      {selectedBooks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedBooks.map(b => (
            <button key={b.name}
              onClick={() => setSelectedBooks(p => p.filter(x => x.name !== b.name))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold text-white"
              style={{ background:'#5B4FCF' }}>
              {b.name} <span className="opacity-70">×</span>
            </button>
          ))}
          <span className="text-[12px] self-center font-semibold" style={{ color:'#5B4FCF' }}>
            {totalChapters} ch
          </span>
        </div>
      )}

      {/* OT / NT toggle */}
      <div className="flex gap-1 p-1 rounded-[11px]" style={{ background:t.bgMuted }}>
        {['OT','NT'].map(tab => (
          <button key={tab} onClick={() => { setTestament(tab); setSearch('') }}
            className="flex-1 py-2 rounded-[9px] text-[13px] font-bold transition-all"
            style={testament===tab
              ? { background:'#5B4FCF', color:'white' }
              : { color:t.textMuted }}>
            {tab === 'OT' ? 'Old Testament' : 'New Testament'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color:t.textMuted }}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full pl-8 pr-3 py-2.5 rounded-[11px] text-[14px] focus:outline-none"
          style={{ background:t.bgCard, color:t.text, border:`1.5px solid ${t.border}` }}/>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
        {visible.map(b => {
          const sel = selectedBooks.some(x => x.name === b.name)
          return (
            <button key={b.name}
              onClick={() => setSelectedBooks(p => sel ? p.filter(x=>x.name!==b.name) : [...p,b])}
              className="flex items-center justify-between px-3 py-3 rounded-[11px] text-left transition-all"
              style={{
                background: sel ? '#EDE9FF' : t.bgCard,
                border: `1.5px solid ${sel ? '#5B4FCF' : t.border}`,
              }}>
              <span className="text-[13px] font-semibold truncate flex-1"
                style={{ color: sel ? '#5B4FCF' : t.text }}>
                {b.name}
              </span>
              <span className="text-[10px] ml-1 flex-shrink-0" style={{ color:t.textFaint }}>
                {b.chapters}ch
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2B — Topic picker
// ─────────────────────────────────────────────
function StepTopic({ selectedTopicId, setSelectedTopicId, t }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>Passages curated from across the Bible</p>
      </div>
      <div className="flex flex-col gap-2">
        {TOPICS.map(topic => {
          const sel = selectedTopicId === topic.id
          return (
            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
              style={{
                background: t.bgCard,
                border: `2px solid ${sel ? topic.color : 'transparent'}`,
                boxShadow: t.shadow,
              }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{topic.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color: sel ? topic.color : t.text }}>
                  {topic.name}
                </p>
                <p className="text-[12px]" style={{ color:t.textMuted }}>
                  {topic.description} · {topic.passages.length} passages
                </p>
              </div>
              {sel && <Check size={15} style={{ color:topic.color }} strokeWidth={3}/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2C — Character picker
// ─────────────────────────────────────────────
function StepCharacter({ selectedCharId, setSelectedCharId, t }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose a character</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>Follow their story through Scripture</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHARACTERS.map(char => {
          const sel = selectedCharId === char.id
          return (
            <button key={char.id} onClick={() => setSelectedCharId(char.id)}
              className="flex flex-col items-center gap-2 px-3 py-4 rounded-[16px] text-center transition-all active:scale-[0.97]"
              style={{
                background: t.bgCard,
                border: `2px solid ${sel ? char.color : 'transparent'}`,
                boxShadow: t.shadow,
              }}>
              <span style={{ fontSize:26 }}>{char.icon}</span>
              <p className="font-bold text-[13px]" style={{ color: sel ? char.color : t.text }}>{char.name}</p>
              <p className="text-[11px]" style={{ color:t.textMuted }}>{char.passages.length} passages</p>
              {sel && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background:char.color }}>
                  <Check size={11} className="text-white" strokeWidth={3}/>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 3 — Details
//  Name is OPTIONAL — auto-generated from content if left blank
// ─────────────────────────────────────────────
function StepDetails({
  name, setName, duration, setDuration, customDays, setCustomDays,
  startDate, setStartDate, planType, setPlanType, autoName, t,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color:t.text }}>Plan details</h2>
        <p className="text-[14px] mt-1" style={{ color:t.textMuted }}>
          Everything here is optional — sensible defaults are already set.
        </p>
      </div>

      {/* Name — optional */}
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color:t.textMuted }}>
          Plan name <span style={{ color:t.textFaint, fontWeight:400, textTransform:'none' }}>(optional)</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, 80))}
          placeholder={autoName}
          className="w-full rounded-[14px] px-4 py-3.5 text-[15px] focus:outline-none"
          style={{
            background: t.bgCard,
            color:      t.text,
            border:     `1.5px solid ${name ? '#5B4FCF' : t.border}`,
          }}
        />
        {!name && (
          <p className="text-[11px] mt-1" style={{ color:t.textFaint }}>
            Will be saved as "{autoName}"
          </p>
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-2"
          style={{ color:t.textMuted }}>Duration</label>
        <div className="flex gap-2 flex-wrap">
          {DURATION_PRESETS.map(d => (
            <button key={d.value} onClick={() => setDuration(d.value)}
              className="px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-all"
              style={duration === d.value
                ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                : { background:t.bgCard, borderColor:t.border, color:t.textMuted }}>
              {d.label}
            </button>
          ))}
        </div>
        {duration === 0 && (
          <div className="flex items-center gap-3 mt-3">
            <input type="number" min={1} max={365} value={customDays}
              onChange={e => setCustomDays(Math.max(1, Math.min(365, +e.target.value)))}
              className="w-24 rounded-[12px] px-3 py-2.5 text-[16px] font-bold text-center focus:outline-none"
              style={{ background:t.bgCard, color:t.text, border:'1.5px solid #5B4FCF' }}/>
            <span className="text-[14px]" style={{ color:t.textMuted }}>days</span>
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-2"
          style={{ color:t.textMuted }}>Start date</label>
        <div className="flex gap-2">
          <button onClick={() => setStartDate(todayStr())}
            className="flex-1 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all"
            style={startDate === todayStr()
              ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
              : { background:t.bgCard, borderColor:t.border, color:t.textMuted }}>
            Today
          </button>
          <input type="date" value={startDate} min={todayStr()}
            onChange={e => setStartDate(e.target.value)}
            className="flex-1 rounded-full px-4 py-2.5 text-[13px] font-semibold focus:outline-none"
            style={{
              background: t.bgCard, color: t.text,
              border: `2px solid ${startDate !== todayStr() ? '#5B4FCF' : t.border}`,
            }}/>
        </div>
      </div>

      {/* Who can join */}
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-2"
          style={{ color:t.textMuted }}>Who can join?</label>
        <div className="flex flex-col gap-2">
          {PLAN_TYPES.map(pt => {
            const Icon = pt.icon
            const sel  = planType === pt.key
            return (
              <button key={pt.key} onClick={() => setPlanType(pt.key)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all"
                style={{
                  background: t.bgCard,
                  border: `2px solid ${sel ? '#5B4FCF' : t.border}`,
                }}>
                <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background: sel ? '#EDE9FF' : t.bgMuted }}>
                  <Icon size={17} style={{ color: sel ? '#5B4FCF' : t.textMuted }}/>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[14px]"
                    style={{ color: sel ? '#5B4FCF' : t.text }}>{pt.label}</p>
                  <p className="text-[12px]" style={{ color:t.textMuted }}>{pt.sub}</p>
                </div>
                {sel && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background:'#5B4FCF' }}>
                    <Check size={11} className="text-white" strokeWidth={3}/>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Success screen
// ─────────────────────────────────────────────
function SuccessScreen({ plan, t }) {
  const router = useRouter()

  async function copy() {
    const url = `${window.location.origin}/plan/join/${plan.inviteCode}`
    try { await navigator.clipboard.writeText(url); showToast('Link copied!') }
    catch { showToast(`Code: ${plan.inviteCode}`) }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center px-4 py-8">
      <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
        transition={{ type:'spring', stiffness:280, damping:22 }}>
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-[44px]"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          📖
        </div>
      </motion.div>

      <div>
        <p className="font-display font-bold text-[26px]" style={{ color:t.text }}>
          Plan created!
        </p>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color:t.textMuted }}>
          "{plan.name}" is ready. Start reading today.
        </p>
      </div>

      {plan.inviteCode && (
        <div className="w-full rounded-[18px] p-5 flex flex-col gap-3"
          style={{ background:t.bgCard, border:'1.5px solid #5B4FCF30' }}>
          <div className="flex items-center justify-between px-4 py-3 rounded-[12px]"
            style={{ background:'#EDE9FF' }}>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color:'#7C6FCD' }}>Invite code</p>
              <p className="font-bold text-[28px] tracking-[0.15em] mt-0.5"
                style={{ color:'#5B4FCF' }}>
                {plan.inviteCode}
              </p>
            </div>
            <button onClick={copy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-[13px] text-white"
              style={{ background:'#5B4FCF' }}>
              <Copy size={13}/> Copy
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        <button onClick={() => router.push(`/plans/${plan.id}`)}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] active:scale-[0.97] transition-all"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          Start reading →
        </button>
        <button onClick={() => router.push('/plans')}
          className="text-[13px] font-semibold py-2" style={{ color:t.textMuted }}>
          Back to plans
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main — 3 steps: Mode → Content → Details
//
//  BUTTON VISIBILITY FIX:
//  The CTA button is fixed at the bottom with paddingBottom that accounts
//  for the nav bar (80px) + safe area. The scrollable content area has
//  paddingBottom of 140px so content is never hidden behind the fixed button.
// ─────────────────────────────────────────────
function CreatePlanContent() {
  const router = useRouter()
  const sp     = useSearchParams()
  const { t }  = useTheme()

  const templateId = sp.get('template')
  const initMode   = sp.get('mode')

  // Step 1=mode, 2=content, 3=details, 4=success
  const [step,           setStep]           = useState(1)
  const [saving,         setSaving]         = useState(false)
  const [createdPlan,    setCreatedPlan]    = useState(null)
  const [templateMeta,   setTemplateMeta]   = useState(null)

  // Form state
  const [mode,           setMode]           = useState(initMode || null)
  const [selectedBooks,  setSelectedBooks]  = useState([])
  const [selectedTopicId,setSelectedTopicId]= useState(null)
  const [selectedCharId, setSelectedCharId] = useState(null)
  const [name,           setName]           = useState('')
  const [duration,       setDuration]       = useState(14)
  const [customDays,     setCustomDays]     = useState(14)
  const [startDate,      setStartDate]      = useState(todayStr())
  const [planType,       setPlanType]       = useState('group')

  // Apply template — ONLY sets name and duration, never locks content
  useEffect(() => {
    if (!templateId) return
    const tpl = PLAN_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return
    setTemplateMeta(tpl)
    setName(tpl.name)
    setDuration(tpl.durationDays)
    // Deliberately do NOT set mode, topic, books, or character
    // The user picks those themselves on step 1
  }, [templateId])

  // Auto-generate a name from the content selection
  const autoName = (() => {
    if (mode === 'book' && selectedBooks.length) {
      return selectedBooks.length === 1
        ? `Reading ${selectedBooks[0].name}`
        : `Reading ${selectedBooks.map(b=>b.name).join(', ')}`
    }
    if (mode === 'topic' && selectedTopicId) {
      const topic = TOPICS.find(t => t.id === selectedTopicId)
      return topic ? `${topic.name} Study` : 'My Reading Plan'
    }
    if (mode === 'character' && selectedCharId) {
      const char = CHARACTERS.find(c => c.id === selectedCharId)
      return char ? `The Story of ${char.name}` : 'My Reading Plan'
    }
    return 'My Reading Plan'
  })()

  const effectiveDuration = duration === 0 ? customDays : duration

  // Step validation
  const step1Valid = !!mode
  const step2Valid = (() => {
    if (mode === 'book')      return selectedBooks.length > 0
    if (mode === 'topic')     return !!selectedTopicId
    if (mode === 'character') return !!selectedCharId
    return false
  })()

  function buildDays() {
    if (mode === 'book') return booksTodays(selectedBooks, effectiveDuration)
    if (mode === 'topic') {
      const topic = TOPICS.find(t => t.id === selectedTopicId)
      return topicToDays(topic, effectiveDuration)
    }
    if (mode === 'character') {
      const char = CHARACTERS.find(c => c.id === selectedCharId)
      return characterToDays(char, effectiveDuration)
    }
    return []
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const finalName  = name.trim() || autoName
      const days       = buildDays()
      const inviteCode = generateInviteCode(finalName)
      const plan = await createSharedPlan({
        name:         finalName,
        templateId:   templateMeta?.id || null,
        durationDays: effectiveDuration,
        visibility:   planType === 'public' ? 'public' : 'private',
        startDate,
        days,
        inviteCode,
      })
      setCreatedPlan({ ...plan, inviteCode: plan.inviteCode || inviteCode })
      setStep(4)
    } catch (e) {
      if (e.message === 'not_authenticated') router.push('/auth?next=/plans/create')
      else { showToast('Failed to create — try again'); console.error(e) }
    } finally { setSaving(false) }
  }

  const TOTAL_STEPS = 3

  // Success screen
  if (step === 4 && createdPlan) {
    return (
      <div className="min-h-screen" style={{ background:t.bg }}>
        <ToastContainer/>
        <SuccessScreen plan={createdPlan} t={t}/>
      </div>
    )
  }

  const canContinue =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    step === 3

  // NAV BAR HEIGHT = 80px (nav) + env(safe-area-inset-bottom) extra
  // We add 140px total padding so content never hides behind the fixed button
  const CONTENT_BOTTOM_PAD = 140

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={() => step > 1 ? setStep(s=>s-1) : router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:t.bgCard, boxShadow:t.shadow }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>
        <StepDots current={step - 1} total={TOTAL_STEPS} t={t}/>
        <div className="w-9"/>
      </div>

      {/* ── SCROLLABLE CONTENT ──
          paddingBottom = CONTENT_BOTTOM_PAD so the fixed button never covers content */}
      <div
        className="flex-1 overflow-y-auto px-4"
        style={{ paddingBottom: CONTENT_BOTTOM_PAD }}>
        <AnimatePresence mode="wait">

          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepMode mode={mode} setMode={setMode}
                templateName={templateMeta?.name || null} t={t}/>
            </motion.div>
          )}

          {step === 2 && mode === 'book' && (
            <motion.div key="s2b"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepBook selectedBooks={selectedBooks} setSelectedBooks={setSelectedBooks} t={t}/>
            </motion.div>
          )}

          {step === 2 && mode === 'topic' && (
            <motion.div key="s2t"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTopic selectedTopicId={selectedTopicId} setSelectedTopicId={setSelectedTopicId} t={t}/>
            </motion.div>
          )}

          {step === 2 && mode === 'character' && (
            <motion.div key="s2c"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepCharacter selectedCharId={selectedCharId} setSelectedCharId={setSelectedCharId} t={t}/>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepDetails
                name={name} setName={setName}
                duration={duration} setDuration={setDuration}
                customDays={customDays} setCustomDays={setCustomDays}
                startDate={startDate} setStartDate={setStartDate}
                planType={planType} setPlanType={setPlanType}
                autoName={autoName} t={t}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── FIXED CONTINUE BUTTON ──
          FIX: always visible above nav bar.
          bottom = 80px (nav bar height) so it sits just above it.
          On devices with safe-area (iPhone home bar) the nav already
          accounts for it, so 80px is the correct clearance. */}
      <div
        style={{
          position:    'fixed',
          bottom:       80,
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '100%',
          maxWidth:     430,
          padding:     '12px 16px',
          background:   t.bg,
          borderTop:   `1px solid ${t.border}`,
          zIndex:       45,
        }}>
        <button
          onClick={() => step < 3 ? setStep(s=>s+1) : handleCreate()}
          disabled={!canContinue || saving}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-35 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {saving
            ? <><Loader2 size={17} className="animate-spin"/> Creating…</>
            : step < 3
              ? 'Continue →'
              : 'Create Plan 🙌'
          }
        </button>
      </div>
    </div>
  )
}

export default function CreatePlanPage() {
  return <Suspense fallback={null}><CreatePlanContent/></Suspense>
}