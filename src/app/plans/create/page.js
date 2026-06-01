'use client'

// ── src/app/plans/create/page.js ──
// CHANGES:
// • Templates: inspiration only — never pre-select content
// • Dynamic pace selector for Topic and Character with duration preview
// • Rich topics (25+ passages) and characters (full arcs) from reading-data.js
// • Plan name optional — auto-generated
// • Continue button fixed above nav bar

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Search, BookOpen, Layers,
  Users, Globe, Lock, Loader2, Copy, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { ToastContainer, showToast } from '../../../components/Toast'
import {
  BIBLE_BOOKS_FULL, TOPICS, CHARACTERS, PLAN_TEMPLATES,
  PACE_OPTIONS, calcDurationFromPace,
  booksTodays, topicToDays, characterToDays, generateInviteCode,
} from '../../../lib/reading-data'
import { createSharedPlan } from '../../../lib/supabase/plans'

function todayStr() { return new Date().toISOString().split('T')[0] }

const PLAN_TYPES = [
  { key:'private', icon:Lock,  label:'Just me',          sub:'Private — only you'           },
  { key:'group',   icon:Users, label:'Group / Private',   sub:'Invite others via code'       },
  { key:'public',  icon:Globe, label:'Public',            sub:'Anyone can find and join'     },
]

function StepDots({ current, total, t }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{
          width:i===current?22:8, height:8, borderRadius:99,
          background:i<=current?'#5B4FCF':t.bgMuted, transition:'all 0.2s',
        }}/>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1 — Mode + Template picker
// ─────────────────────────────────────────────
function StepMode({ mode, setMode, templateMeta, onSelectTemplate, t }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        {templateMeta
          ? <><p className="text-[13px] font-semibold mb-1" style={{color:'#5B4FCF'}}>Template: {templateMeta.name}</p>
               <h2 className="font-display font-bold text-[24px]" style={{color:t.text}}>How do you want to read?</h2>
               <p className="text-[13px] mt-1" style={{color:t.textMuted}}>Templates only set the name — you choose the content.</p></>
          : <><h2 className="font-display font-bold text-[26px]" style={{color:t.text}}>Start a reading plan</h2>
               <p className="text-[14px] mt-1" style={{color:t.textMuted}}>How would you like to read?</p></>
        }
      </div>

      <div className="flex flex-col gap-2.5">
        {[
          {id:'book',      icon:BookOpen, color:'#5B4FCF', bg:'#EDE9FF', title:'Read by Book',      desc:'Genesis, Romans, Psalms — any book, chapter by chapter'},
          {id:'topic',     icon:Layers,   color:'#4A7C5F', bg:'#E8F5EE', title:'Read by Topic',     desc:'Faith, Prayer, Forgiveness, Love, Wisdom, Grace…'},
          {id:'character', icon:Users,    color:'#E8A838', bg:'#FFF3DC', title:'Read by Character', desc:'David, Paul, Moses, Esther, Jesus — the full story arc'},
        ].map(m => {
          const Icon = m.icon
          const sel  = mode === m.id
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex items-center gap-4 px-4 py-4 rounded-[18px] text-left active:scale-[0.98] transition-all"
              style={{ background:t.bgCard, border:`2px solid ${sel?m.color:'transparent'}`, boxShadow:t.shadow }}>
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                style={{ background:m.bg }}>
                <Icon size={24} style={{ color:m.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]" style={{ color:sel?m.color:t.text }}>{m.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color:t.textMuted }}>{m.desc}</p>
              </div>
              {sel && <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:m.color }}><Check size={13} className="text-white" strokeWidth={3}/></div>}
            </button>
          )
        })}
      </div>

      {!templateMeta && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color:t.textFaint }}>
            Or start with a template
          </p>
          <div className="flex flex-col gap-2">
            {PLAN_TEMPLATES.map(tpl => (
              <button key={tpl.id} onClick={() => onSelectTemplate(tpl)}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-left active:scale-[0.98] transition-all"
                style={{ background:t.bgCard, border:`1px solid ${t.border}` }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{tpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] truncate" style={{ color:t.text }}>{tpl.name}</p>
                  <p className="text-[11px]" style={{ color:t.textMuted }}>{tpl.description} · {tpl.durationDays} days</p>
                </div>
                <ChevronRight size={13} style={{ color:t.textFaint }}/>
              </button>
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
function StepBook({ selectedBooks, setSelectedBooks, pace, setPace, t }) {
  const [testament, setTestament] = useState('NT')
  const [search,    setSearch]    = useState('')
  const visible = BIBLE_BOOKS_FULL
    .filter(b => b.testament === testament)
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
  const totalChapters = selectedBooks.reduce((a, b) => a + b.chapters, 0)
  const totalDays     = pace && totalChapters ? calcDurationFromPace(totalChapters, pace) : totalChapters

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose books</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>Select one or more books, then set your pace.</p>
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
          {totalChapters > 0 && <span className="text-[12px] self-center font-semibold" style={{ color:'#5B4FCF' }}>{totalChapters} chapters</span>}
        </div>
      )}

      {/* OT / NT toggle */}
      <div className="flex gap-1 p-1 rounded-[11px]" style={{ background:t.bgMuted }}>
        {['OT','NT'].map(tab => (
          <button key={tab} onClick={() => { setTestament(tab); setSearch('') }}
            className="flex-1 py-2 rounded-[9px] text-[13px] font-bold transition-all"
            style={testament===tab ? { background:'#5B4FCF', color:'white' } : { color:t.textMuted }}>
            {tab === 'OT' ? 'Old Testament' : 'New Testament'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:t.textMuted }}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          className="w-full pl-8 pr-3 py-2.5 rounded-[11px] text-[14px] focus:outline-none"
          style={{ background:t.bgCard, color:t.text, border:`1.5px solid ${t.border}` }}/>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
        {visible.map(b => {
          const sel = selectedBooks.some(x => x.name === b.name)
          return (
            <button key={b.name}
              onClick={() => setSelectedBooks(p => sel ? p.filter(x => x.name!==b.name) : [...p, b])}
              className="flex items-center justify-between px-3 py-3 rounded-[11px] text-left transition-all"
              style={{ background:sel?'#EDE9FF':t.bgCard, border:`1.5px solid ${sel?'#5B4FCF':t.border}` }}>
              <span className="text-[13px] font-semibold truncate flex-1"
                style={{ color:sel?'#5B4FCF':t.text }}>{b.name}</span>
              <span className="text-[10px] ml-1 flex-shrink-0" style={{ color:t.textFaint }}>{b.chapters}ch</span>
            </button>
          )
        })}
      </div>

      {/* Pace selector — shown when books are selected */}
      {selectedBooks.length > 0 && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background:t.bgCard, border:'1.5px solid #5B4FCF20' }}>
          <p className="font-bold text-[14px]" style={{ color:t.text }}>How much per day?</p>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPace(p)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={pace?.id===p.id
                  ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                  : { background:t.bgMuted, borderColor:t.border, color:t.textMuted }}>
                {p.label}
              </button>
            ))}
          </div>
          {pace && totalChapters > 0 && (
            <div className="px-4 py-3 rounded-[12px]" style={{ background:'#EDE9FF' }}>
              <p className="font-bold text-[14px]" style={{ color:'#5B4FCF' }}>
                {totalChapters} chapters · {pace.label} = <span className="font-display text-[18px]">{totalDays} days</span>
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:'#7C6FCD' }}>
                Adjust above to change the duration before you create the plan.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2B — Topic + Pace picker
// ─────────────────────────────────────────────
function StepTopic({ selectedTopicId, setSelectedTopicId, pace, setPace, t }) {
  const topic = TOPICS.find(x => x.id === selectedTopicId)
  const total = topic?.passages?.length || 0
  const days  = pace ? calcDurationFromPace(total, pace) : total
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>Comprehensive passages from across the Bible</p>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {TOPICS.map(topic => {
          const sel = selectedTopicId === topic.id
          return (
            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
              style={{ background:t.bgCard, border:`2px solid ${sel?topic.color:'transparent'}`, boxShadow:t.shadow }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{topic.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px]" style={{ color:sel?topic.color:t.text }}>{topic.name}</p>
                <p className="text-[12px]" style={{ color:t.textMuted }}>
                  {topic.description} · <span style={{ color:'#5B4FCF', fontWeight:600 }}>{topic.passages.length} passages</span>
                </p>
              </div>
              {sel && <Check size={15} style={{ color:topic.color }} strokeWidth={3}/>}
            </button>
          )
        })}
      </div>

      {/* Pace selector — only shown when a topic is selected */}
      {selectedTopicId && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background:t.bgCard, border:`1.5px solid #5B4FCF20` }}>
          <p className="font-bold text-[14px]" style={{ color:t.text }}>How much do you want to read each day?</p>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPace(p)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={pace?.id===p.id
                  ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                  : { background:t.bgMuted, borderColor:t.border, color:t.textMuted }}>
                {p.label}
              </button>
            ))}
          </div>
          {pace && (
            <div className="px-4 py-3 rounded-[12px]" style={{ background:'#EDE9FF' }}>
              <p className="font-bold text-[14px]" style={{ color:'#5B4FCF' }}>
                {total} passages · {pace.label} = <span className="font-display text-[18px]">{days} days</span>
              </p>
              <p className="text-[12px] mt-0.5" style={{ color:'#7C6FCD' }}>
                Adjust the pace above to change the duration.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 2C — Character + Pace picker + Sub-sections
// ─────────────────────────────────────────────
function StepCharacter({ selectedCharId, setSelectedCharId, sectionId, setSectionId, pace, setPace, t }) {
  const char   = CHARACTERS.find(c => c.id === selectedCharId)
  const passages = sectionId
    ? char?.sections?.find(s => s.id === sectionId)?.passages || char?.passages || []
    : char?.passages || []
  const total = passages.length
  const days  = pace ? calcDurationFromPace(total, pace) : total

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[22px]" style={{ color:t.text }}>Choose a character</h2>
        <p className="text-[13px] mt-1" style={{ color:t.textMuted }}>Follow their complete story through Scripture</p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
        {CHARACTERS.map(ch => {
          const sel = selectedCharId === ch.id
          return (
            <button key={ch.id} onClick={() => { setSelectedCharId(ch.id); setSectionId(null) }}
              className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-[16px] text-center transition-all active:scale-[0.97]"
              style={{ background:t.bgCard, border:`2px solid ${sel?ch.color:'transparent'}`, boxShadow:t.shadow }}>
              <span style={{ fontSize:24 }}>{ch.icon}</span>
              <p className="font-bold text-[13px]" style={{ color:sel?ch.color:t.text }}>{ch.name}</p>
              <p className="text-[10px]" style={{ color:t.textMuted }}>{ch.passages.length} passages</p>
            </button>
          )
        })}
      </div>

      {/* Sub-section picker for rich characters */}
      {selectedCharId && char?.sections?.length > 0 && (
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col gap-2">
          <p className="font-bold text-[13px]" style={{ color:t.text }}>Focus (optional)</p>
          <button onClick={() => setSectionId(null)}
            className="flex items-center justify-between px-4 py-2.5 rounded-[12px]"
            style={{ background:!sectionId?'#EDE9FF':t.bgMuted, border:`1.5px solid ${!sectionId?'#5B4FCF':t.border}` }}>
            <span className="text-[13px] font-semibold" style={{ color:!sectionId?'#5B4FCF':t.textMuted }}>
              Full story arc ({char.passages.length} passages)
            </span>
            {!sectionId && <Check size={13} style={{ color:'#5B4FCF' }}/>}
          </button>
          {char.sections.map(sec => (
            <button key={sec.id} onClick={() => setSectionId(sec.id)}
              className="flex items-center justify-between px-4 py-2.5 rounded-[12px]"
              style={{ background:sectionId===sec.id?'#EDE9FF':t.bgMuted, border:`1.5px solid ${sectionId===sec.id?'#5B4FCF':t.border}` }}>
              <span className="text-[13px] font-semibold" style={{ color:sectionId===sec.id?'#5B4FCF':t.textMuted }}>
                {sec.label} ({sec.passages.length} passages)
              </span>
              {sectionId===sec.id && <Check size={13} style={{ color:'#5B4FCF' }}/>}
            </button>
          ))}
        </motion.div>
      )}

      {/* Pace selector */}
      {selectedCharId && total > 0 && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col gap-3 p-4 rounded-[16px]"
          style={{ background:t.bgCard, border:'1.5px solid #5B4FCF20' }}>
          <p className="font-bold text-[14px]" style={{ color:t.text }}>How much per day?</p>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPace(p)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={pace?.id===p.id
                  ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
                  : { background:t.bgMuted, borderColor:t.border, color:t.textMuted }}>
                {p.label}
              </button>
            ))}
          </div>
          {pace && (
            <div className="px-4 py-3 rounded-[12px]" style={{ background:'#EDE9FF' }}>
              <p className="font-bold text-[14px]" style={{ color:'#5B4FCF' }}>
                {total} passages · {pace.label} = <span className="font-display text-[18px]">{days} days</span>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 3 — Details (all optional)
// ─────────────────────────────────────────────
function StepDetails({ name, setName, startDate, setStartDate, planType, setPlanType, autoName, t }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-[24px]" style={{ color:t.text }}>Final details</h2>
        <p className="text-[14px] mt-1" style={{ color:t.textMuted }}>Everything here is optional.</p>
      </div>
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-1.5"
          style={{ color:t.textMuted }}>
          Plan name <span style={{ fontWeight:400, textTransform:'none', color:t.textFaint }}>(optional)</span>
        </label>
        <input value={name} onChange={e => setName(e.target.value.slice(0,80))}
          placeholder={autoName}
          className="w-full rounded-[14px] px-4 py-3.5 text-[15px] focus:outline-none"
          style={{ background:t.bgCard, color:t.text, border:`1.5px solid ${name?'#5B4FCF':t.border}` }}/>
        {!name && (
          <p className="text-[11px] mt-1" style={{ color:t.textFaint }}>Will be saved as "{autoName}"</p>
        )}
      </div>
      <div>
        <label className="text-[12px] font-bold uppercase tracking-wider block mb-2"
          style={{ color:t.textMuted }}>Start date</label>
        <div className="flex gap-2">
          <button onClick={() => setStartDate(todayStr())}
            className="flex-1 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all"
            style={startDate===todayStr()
              ? { background:'#5B4FCF', borderColor:'#5B4FCF', color:'white' }
              : { background:t.bgCard, borderColor:t.border, color:t.textMuted }}>
            Today
          </button>
          <input type="date" value={startDate} min={todayStr()} onChange={e => setStartDate(e.target.value)}
            className="flex-1 rounded-full px-4 py-2.5 text-[13px] font-semibold focus:outline-none"
            style={{ background:t.bgCard, color:t.text, border:`2px solid ${startDate!==todayStr()?'#5B4FCF':t.border}` }}/>
        </div>
      </div>
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
                style={{ background:t.bgCard, border:`2px solid ${sel?'#5B4FCF':t.border}` }}>
                <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background:sel?'#EDE9FF':t.bgMuted }}>
                  <Icon size={17} style={{ color:sel?'#5B4FCF':t.textMuted }}/>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[14px]" style={{ color:sel?'#5B4FCF':t.text }}>{pt.label}</p>
                  <p className="text-[12px]" style={{ color:t.textMuted }}>{pt.sub}</p>
                </div>
                {sel && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background:'#5B4FCF' }}><Check size={11} className="text-white" strokeWidth={3}/></div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Success
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
      <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:280, damping:22 }}>
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-[44px]"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>📖</div>
      </motion.div>
      <div>
        <p className="font-display font-bold text-[26px]" style={{ color:t.text }}>Plan created!</p>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color:t.textMuted }}>"{plan.name}" is ready.</p>
      </div>
      {plan.inviteCode && (
        <div className="w-full rounded-[18px] p-5 flex flex-col gap-3"
          style={{ background:t.bgCard, border:'1.5px solid #5B4FCF30' }}>
          <div className="flex items-center justify-between px-4 py-3 rounded-[12px]" style={{ background:'#EDE9FF' }}>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color:'#7C6FCD' }}>Invite code</p>
              <p className="font-bold text-[28px] tracking-[0.15em] mt-0.5" style={{ color:'#5B4FCF' }}>{plan.inviteCode}</p>
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
          className="text-[13px] font-semibold py-2" style={{ color:t.textMuted }}>Back to plans</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
function CreatePlanContent() {
  const router = useRouter()
  const sp     = useSearchParams()
  const { t }  = useTheme()

  const templateId = sp.get('template')
  const initMode   = sp.get('mode')

  const [step,           setStep]           = useState(1)
  const [saving,         setSaving]         = useState(false)
  const [createdPlan,    setCreatedPlan]    = useState(null)
  const [templateMeta,   setTemplateMeta]   = useState(null)

  const [mode,           setMode]           = useState(initMode || null)
  const [selectedBooks,  setSelectedBooks]  = useState([])
  const [selectedTopicId,setSelectedTopicId]= useState(null)
  const [selectedCharId, setSelectedCharId] = useState(null)
  const [sectionId,      setSectionId]      = useState(null)
  const [topicPace,      setTopicPace]      = useState(PACE_OPTIONS[0])
  const [charPace,       setCharPace]       = useState(PACE_OPTIONS[0])
  const [bookPace,       setBookPace]       = useState(PACE_OPTIONS[2]) // default: 1 chapter/day
  const [name,           setName]           = useState('')
  const [startDate,      setStartDate]      = useState(todayStr())
  const [planType,       setPlanType]       = useState('group')

  useEffect(() => {
    if (!templateId) return
    const tpl = PLAN_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return
    setTemplateMeta(tpl)
    setName(tpl.name)
    // Deliberately do NOT set mode, topic, character, or pace
  }, [templateId])

  const autoName = (() => {
    if (mode === 'book' && selectedBooks.length)
      return selectedBooks.length === 1 ? `Reading ${selectedBooks[0].name}` : `Reading ${selectedBooks.map(b=>b.name).join(', ')}`
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

  function buildDays() {
    if (mode === 'book' && selectedBooks.length) {
      return booksTodays(selectedBooks, bookPace)
    }
    if (mode === 'topic' && selectedTopicId) {
      const topic = TOPICS.find(t => t.id === selectedTopicId)
      if (!topic) return []
      return topicToDays(topic, topicPace)
    }
    if (mode === 'character' && selectedCharId) {
      const char = CHARACTERS.find(c => c.id === selectedCharId)
      if (!char) return []
      return characterToDays(char, charPace, sectionId)
    }
    return []
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const finalName  = name.trim() || autoName
      const inviteCode = generateInviteCode(finalName)
      const plan = await createSharedPlan({
        name:         finalName,
        templateId:   templateMeta?.id || null,
        durationDays,
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

  const step1Valid = !!mode
  const step2Valid = (() => {
    if (mode === 'book')      return selectedBooks.length > 0
    if (mode === 'topic')     return !!selectedTopicId && !!topicPace
    if (mode === 'character') return !!selectedCharId && !!charPace
    return false
  })()

  // Compute days only after step2Valid is known
  const days = step2Valid ? buildDays() : []
  const durationDays = days.length || 14

  const TOTAL_STEPS = 3

  if (step === 4 && createdPlan) {
    return (
      <div className="min-h-screen" style={{ background:t.bg }}>
        <ToastContainer/>
        <SuccessScreen plan={createdPlan} t={t}/>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background:t.bg }}>
      <ToastContainer/>
      <div className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0">
        <button onClick={() => step > 1 ? setStep(s=>s-1) : router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background:t.bgCard, boxShadow:t.shadow }}>
          <ArrowLeft size={18} style={{ color:t.text }}/>
        </button>
        <StepDots current={step-1} total={TOTAL_STEPS} t={t}/>
        <div className="w-9"/>
      </div>

      {/* Scrollable — 140px bottom padding clears the fixed button */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom:140 }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepMode mode={mode} setMode={setMode} templateMeta={templateMeta}
                onSelectTemplate={tpl => {
                  setTemplateMeta(tpl); setName(tpl.name); setStep(1)
                }} t={t}/>
            </motion.div>
          )}
          {step === 2 && mode === 'book' && (
            <motion.div key="s2b" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepBook selectedBooks={selectedBooks} setSelectedBooks={setSelectedBooks}
                pace={bookPace} setPace={setBookPace} t={t}/>
            </motion.div>
          )}
          {step === 2 && mode === 'topic' && (
            <motion.div key="s2t" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTopic selectedTopicId={selectedTopicId} setSelectedTopicId={setSelectedTopicId}
                pace={topicPace} setPace={setTopicPace} t={t}/>
            </motion.div>
          )}
          {step === 2 && mode === 'character' && (
            <motion.div key="s2c" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepCharacter selectedCharId={selectedCharId} setSelectedCharId={setSelectedCharId}
                sectionId={sectionId} setSectionId={setSectionId}
                pace={charPace} setPace={setCharPace} t={t}/>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepDetails name={name} setName={setName}
                startDate={startDate} setStartDate={setStartDate}
                planType={planType} setPlanType={setPlanType}
                autoName={autoName} t={t}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed CTA — bottom:80 sits above nav bar */}
      <div style={{
        position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:430, padding:'12px 16px',
        background:t.bg, borderTop:`1px solid ${t.border}`, zIndex:45,
      }}>
        <button
          onClick={() => step < 3 ? setStep(s=>s+1) : handleCreate()}
          disabled={saving || (step===1 && !step1Valid) || (step===2 && !step2Valid)}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-35 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          {saving ? <><Loader2 size={17} className="animate-spin"/> Creating…</> : step < 3 ? 'Continue →' : 'Create Plan 🙌'}
        </button>
      </div>
    </div>
  )
}

export default function CreatePlanPage() {
  return <Suspense fallback={null}><CreatePlanContent/></Suspense>
}