'use client'

// ── /plans/create — Create plan flow ──
// Book: searchable list + pace picker
// Topic: 3 hardcoded topical plans to choose from
// Character: coming soon screen
// DARK MODE: full support via useDarkMode() + getDarkModeColors()

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Layers, Users, Lock, Sparkles, Mountain, Wind } from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../../components/Toast'
import { BIBLE_BOOKS, todayStr } from '../../../lib/constants'
import { buildBookPlanDays, calcEndDate, fmtDate, readPlans, writePlans, prefetchPlanPassages } from '../../../lib/plans'
import { TOPICAL_PLANS } from '../../../lib/topical-plans'
import { CHARACTERS } from '../../../lib/characters'
import { useDarkMode, getDarkModeColors } from '../../../contexts/DarkModeContext'

// Icon map for topical plans
const PLAN_ICONS = { Sparkles, Mountain, Wind }

function StepDots({ current, c }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {[0, 1].map(i => (
        <motion.div key={i}
          animate={{ width: i === current ? 24 : 8, background: i === current ? '#5B4FCF' : c.bgMuted }}
          className="h-2 rounded-full" />
      ))}
    </div>
  )
}

const PACE_OPTIONS = ['1 verse', '2 verses', '3 verses', '5 verses', 'Half chapter', '1 chapter', '2 chapters', 'Custom']

// ─────────────────────────────────────────────
//  Step 0 — Type picker
// ─────────────────────────────────────────────
function StepTypePicker({ onPick, c }) {
  const types = [
    { type: 'book',      icon: BookOpen, title: 'Read a Book',       desc: 'Pick any Bible book and read at your own pace. Fully flexible.' },
    { type: 'topic',     icon: Layers,   title: 'Study a Topic',     desc: 'Choose from curated 30-day plans on faith, peace, identity, and more.' },
    { type: 'character', icon: Users,    title: 'Study a Character', desc: 'Walk through the life of a Bible figure, day by day.' },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: c.text }}>What would you like to do?</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Choose your study approach</p>
      </div>
      {types.map(t => (
        <motion.button key={t.type} whileTap={{ scale: 0.97 }} onClick={() => onPick(t.type)}
          className="w-full flex items-start gap-4 p-5 rounded-[20px] text-left transition-all"
          style={{ background: c.bgCard, boxShadow: c.shadow }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: c.purpleLight }}>
            <t.icon size={28} style={{ color: '#5B4FCF' }} />
          </div>
          <div>
            <p className="font-display text-[18px] font-semibold" style={{ color: c.text }}>{t.title}</p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: c.textMuted }}>{t.desc}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1A — Book plan
// ─────────────────────────────────────────────
function StepBook({ onSave, c }) {
  const [testament, setTestament] = useState('NT')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [pace, setPace]           = useState('1 chapter')

  const books = BIBLE_BOOKS.slice(testament === 'OT' ? 0 : 39, testament === 'OT' ? 39 : undefined)
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  function calcDays() {
    if (!selected) return 0
    if (pace === '2 chapters') return Math.ceil(selected.chapters / 2)
    if (pace === 'Half chapter') return selected.chapters * 2
    return selected.chapters
  }
  const totalDays = calcDays()
  const endDate   = totalDays ? calcEndDate(totalDays) : null

  function handleSave() {
    if (!selected) return
    const days = buildBookPlanDays(selected, pace)
    const plan = {
      id:               `plan_${Date.now()}`,
      type:             'book',
      name:             `${selected.name} Reading Plan`,
      pace,
      startDate:        todayStr(),
      estimatedEndDate: endDate,
      totalDays,
      currentDay:       1,
      status:           'active',
      days:             days.map(d => ({ ...d, completedAt: null, reflection: '' })),
      createdAt:        new Date().toISOString(),
    }
    writePlans([plan, ...readPlans()])
    prefetchPlanPassages(days.slice(0, 3)).catch(() => {})
    onSave()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: c.text }}>Choose a book</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Pick any book of the Bible</p>
      </div>

      {/* Testament toggle */}
      <div className="flex gap-2 p-1 rounded-[14px]" style={{ background: c.bgMuted }}>
        {['OT', 'NT'].map(t => (
          <button key={t} onClick={() => setTestament(t)}
            className="flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all"
            style={testament === t
              ? { background: '#5B4FCF', color: 'white' }
              : { background: 'transparent', color: c.textMuted }}>
            {t === 'OT' ? 'Old Testament' : 'New Testament'}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search books…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-[14px] text-[14px] focus:outline-none transition-all"
        style={{
          background:  c.bgInput,
          color:       c.text,
          border:      `1.5px solid ${c.borderInput}`,
        }}
      />

      {/* Book grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {books.map(b => (
          <button key={b.name} onClick={() => setSelected(b)}
            className="flex items-center justify-between px-3 py-3 rounded-[14px] text-left transition-all"
            style={{
              background:  selected?.name === b.name ? c.purpleLight : c.bgCard,
              border:      `2px solid ${selected?.name === b.name ? '#5B4FCF' : c.border}`,
            }}>
            <span className="font-semibold text-[14px]"
              style={{ color: selected?.name === b.name ? '#5B4FCF' : c.text }}>
              {b.name}
            </span>
            <span className="text-[12px]" style={{ color: c.textFaint }}>{b.chapters} ch</span>
          </button>
        ))}
      </div>

      {/* Pace + calculation */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          <p className="font-bold text-[14px]" style={{ color: c.text }}>Reading pace</p>
          <div className="flex gap-2 flex-wrap">
            {PACE_OPTIONS.map(p => (
              <button key={p} onClick={() => setPace(p)}
                className="px-3 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={pace === p
                  ? { background: '#5B4FCF', borderColor: '#5B4FCF', color: 'white' }
                  : { background: c.bgCard, borderColor: c.borderInput, color: c.textMuted }}>
                {p}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-[16px]" style={{ background: c.purpleLight }}>
            <p className="font-bold text-[14px]" style={{ color: '#5B4FCF' }}>
              At {pace} · {selected.name} in {totalDays} days
            </p>
            {endDate && <p className="text-[12px] mt-1" style={{ color: '#7C6FCD' }}>Estimated completion: {fmtDate(endDate)}</p>}
          </div>
        </motion.div>
      )}

      <button onClick={handleSave} disabled={!selected}
        className="w-full text-white rounded-pill py-4 text-[15px] font-bold disabled:opacity-40 active:scale-[0.97] transition-all"
        style={{ background: '#5B4FCF' }}>
        Create Plan
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1B — Topic plan
// ─────────────────────────────────────────────
function StepTopic({ onSave, c }) {
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)

  function handleStart() {
    if (!selected) return
    const plan = {
      id:               `plan_${Date.now()}`,
      type:             'topic',
      name:             selected.name,
      pace:             '1 passage/day',
      startDate:        todayStr(),
      estimatedEndDate: calcEndDate(selected.duration),
      totalDays:        selected.duration,
      currentDay:       1,
      status:           'active',
      days:             selected.days.map(d => ({ ...d, completedAt: null, reflection: '' })),
      createdAt:        new Date().toISOString(),
    }
    writePlans([plan, ...readPlans()])
    onSave()
  }

  if (confirming && selected) {
    const preview = selected.days.slice(0, 3)
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-[22px] font-bold" style={{ color: c.text }}>{selected.name}</h2>
          <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>{selected.duration} days · {selected.theme}</p>
        </div>

        <div className="p-4 rounded-[20px] flex flex-col gap-3" style={{ background: c.bgCard, boxShadow: c.shadow }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textFaint }}>First 3 days</p>
          {preview.map(d => (
            <div key={d.day} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                style={{ background: selected.color }}>
                {d.day}
              </span>
              <div>
                <p className="font-semibold text-[14px]" style={{ color: c.text }}>{d.passage}</p>
                <p className="text-[12px]" style={{ color: c.textMuted }}>{d.title}</p>
              </div>
            </div>
          ))}
          <p className="text-[12px] font-semibold px-1" style={{ color: c.textFaint }}>+ {selected.duration - 3} more days</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)}
            className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 active:scale-[0.97]"
            style={{ borderColor: c.borderInput, color: c.textMuted }}>
            ← Back
          </button>
          <button onClick={handleStart}
            className="flex-1 text-white rounded-pill py-3 text-[14px] font-bold hover:opacity-90 active:scale-[0.97]"
            style={{ background: selected.color }}>
            Start Plan →
          </button>
        </div>
        <p className="text-[12px] text-center" style={{ color: c.textFaint }}>More topics coming soon</p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: c.text }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Curated 30-day plans for every season</p>
      </div>

      {TOPICAL_PLANS.map((plan, i) => {
        const PlanIcon = PLAN_ICONS[plan.icon] || Sparkles
        const isSelected = selected?.id === plan.id
        return (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setSelected(plan)}
            className="w-full text-left p-4 rounded-[20px] transition-all"
            style={{
              background:  isSelected ? `${plan.color}12` : c.bgCard,
              border:      `2px solid ${isSelected ? plan.color : c.border}`,
              boxShadow:   isSelected ? `0 0 0 1px ${plan.color}33` : c.shadow,
            }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: plan.color }}>
                <PlanIcon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold text-[16px]" style={{ color: c.text }}>{plan.name}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${plan.color}18`, color: plan.color }}>
                    {plan.duration} days
                  </span>
                </div>
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: plan.color }}>{plan.theme}</p>
                <p className="text-[13px] mt-1 leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{plan.description}</p>
              </div>
            </div>
          </motion.button>
        )
      })}

      <button
        onClick={() => { if (!selected) { showToast('Select a plan first'); return } setConfirming(true) }}
        disabled={!selected}
        className="w-full text-white rounded-pill py-4 text-[15px] font-bold disabled:opacity-40 active:scale-[0.97] transition-all"
        style={{ background: '#5B4FCF' }}>
        Preview Plan →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1C — Character (coming soon)
// ─────────────────────────────────────────────
function StepCharacter({ c }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: c.text }}>Character studies</h2>
        <p className="text-[13px] mt-1" style={{ color: c.textMuted }}>Coming in the next update</p>
      </div>

      <div className="p-5 rounded-[20px] flex flex-col items-center gap-3 text-center"
        style={{ background: c.purpleLight }}>
        <Sparkles size={32} style={{ color: '#5B4FCF' }} />
        <p className="font-bold text-[15px]" style={{ color: c.text }}>
          Character study plans are being prepared
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: c.textMuted }}>
          Walk through the lives of David, Daniel, Esther, and Mary — passage by passage.
        </p>
      </div>

      {/* Greyed-out character cards */}
      <div className="grid grid-cols-2 gap-3">
        {CHARACTERS.map(ch => (
          <div key={ch.id}
            className="flex flex-col items-center gap-2 p-4 rounded-[16px] relative overflow-hidden"
            style={{ background: c.bgCard, border: `2px solid ${c.border}`, opacity: 0.6 }}>
            <Lock size={14} className="absolute top-2 right-2" style={{ color: c.textFaint }} />
            <span style={{ fontSize: 32 }}>{ch.placeholderEmoji}</span>
            <p className="font-bold text-[13px]" style={{ color: c.text }}>{ch.name}</p>
            <p className="text-[11px]" style={{ color: c.textFaint }}>{ch.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
function CreatePlanContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initType     = searchParams.get('type')
  const { dark }     = useDarkMode()
  const c            = getDarkModeColors(dark)

  const [step,     setStep]     = useState(initType ? 1 : 0)
  const [planType, setPlanType] = useState(initType || null)

  function handleTypePick(type) { setPlanType(type); setStep(1) }
  function handleSave() { showToast('Plan created!'); router.push('/plans') }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: c.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${c.border}` }}>
        <button onClick={() => step > 0 ? setStep(0) : router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
          style={{ background: c.bgCard, boxShadow: c.shadow, color: c.text }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex justify-center">
          <StepDots current={step === 0 ? 0 : 1} c={c} />
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 pb-10 pt-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTypePicker onPick={handleTypePick} c={c} />
            </motion.div>
          )}
          {step === 1 && planType === 'book' && (
            <motion.div key="book" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepBook onSave={handleSave} c={c} />
            </motion.div>
          )}
          {step === 1 && planType === 'topic' && (
            <motion.div key="topic" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTopic onSave={handleSave} c={c} />
            </motion.div>
          )}
          {step === 1 && planType === 'character' && (
            <motion.div key="char" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepCharacter c={c} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function CreatePlanPage() {
  return <Suspense><CreatePlanContent /></Suspense>
}