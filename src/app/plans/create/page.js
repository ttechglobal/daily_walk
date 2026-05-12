'use client'

// ── /plans/create — Create plan flow (Update 5) ──
// Book: searchable list + pace picker
// Topic: 3 hardcoded topical plans to choose from
// Character: coming soon screen

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Layers, Users, Lock, Sparkles, Mountain, Wind } from 'lucide-react'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { ToastContainer, showToast } from '../../../components/Toast'
import { BIBLE_BOOKS, todayStr } from '../../../lib/constants'
import { buildBookPlanDays, calcEndDate, fmtDate, readPlans, writePlans } from '../../../lib/plans'
import { TOPICAL_PLANS } from '../../../lib/topical-plans'
import { CHARACTERS } from '../../../lib/characters'

// Icon map for topical plans
const PLAN_ICONS = { Sparkles, Mountain, Wind }

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {[0, 1].map(i => (
        <motion.div key={i}
          animate={{ width: i === current ? 24 : 8, background: i === current ? '#5B4FCF' : '#EDE9FF' }}
          className="h-2 rounded-full" />
      ))}
    </div>
  )
}

const PACE_OPTIONS = ['1 verse', '2 verses', '3 verses', '5 verses', 'Half chapter', '1 chapter', '2 chapters', 'Custom']

// ─────────────────────────────────────────────
//  Step 0 — Type picker
// ─────────────────────────────────────────────
function StepTypePicker({ onPick }) {
  const types = [
    { type: 'book',      icon: BookOpen, title: 'Read a Book',      desc: 'Pick any Bible book and read at your own pace. Fully flexible.' },
    { type: 'topic',     icon: Layers,   title: 'Study a Topic',    desc: 'Choose from curated 30-day plans on faith, peace, identity, and more.' },
    { type: 'character', icon: Users,    title: 'Study a Character', desc: 'Walk through the life of a Bible figure, day by day.' },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: '#1A1A2E' }}>What would you like to do?</h2>
        <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>Choose your study approach</p>
      </div>
      {types.map(t => (
        <motion.button key={t.type} whileTap={{ scale: 0.97 }} onClick={() => onPick(t.type)}
          className="w-full flex items-start gap-4 p-5 bg-white rounded-[20px] text-left hover:shadow-md transition-all"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FF' }}>
            <t.icon size={28} style={{ color: '#5B4FCF' }} />
          </div>
          <div>
            <p className="font-display text-[18px] font-semibold" style={{ color: '#1A1A2E' }}>{t.title}</p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: '#6B7280' }}>{t.desc}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Step 1A — Book plan
// ─────────────────────────────────────────────
function StepBook({ onSave }) {
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
    if (!selected) { showToast('Pick a book first'); return }
    const days = buildBookPlanDays(selected, pace)
    const plan = {
      id: `plan_${Date.now()}`, type: 'book', name: selected.name, pace,
      startDate: todayStr(), estimatedEndDate: calcEndDate(days.length),
      totalDays: days.length, currentDay: 1, status: 'active', days,
      createdAt: new Date().toISOString(),
    }
    writePlans([plan, ...readPlans()])
    onSave()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: '#1A1A2E' }}>Which book?</h2>
        <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>Pick a Bible book to read through</p>
      </div>

      {/* OT / NT */}
      <div className="flex gap-1 p-1 rounded-full" style={{ background: '#EDE9FF' }}>
        {[{ k:'OT', l:'Old Testament' }, { k:'NT', l:'New Testament' }].map(t => (
          <button key={t.k} onClick={() => setTestament(t.k)}
            className="relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all"
            style={testament === t.k ? { color: '#5B4FCF' } : { color: '#6B7280' }}>
            {testament === t.k && (
              <motion.div layoutId="testament-tab" className="absolute inset-0 bg-white rounded-full shadow-card"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
            )}
            <span className="relative z-10">{t.l}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search books..."
        className="w-full border border-gray-200 rounded-input px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
        style={{ color: '#1A1A2E' }} />

      {/* Book list */}
      <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto scroll-hide">
        {books.map(b => (
          <button key={b.name} onClick={() => setSelected(b)}
            className="flex items-center justify-between px-4 py-2.5 rounded-[12px] transition-all"
            style={{
              background: selected?.name === b.name ? '#EDE9FF' : 'white',
              border: `2px solid ${selected?.name === b.name ? '#5B4FCF' : '#F0EDE8'}`,
            }}>
            <span className="font-semibold text-[14px]" style={{ color: selected?.name === b.name ? '#5B4FCF' : '#1A1A2E' }}>
              {b.name}
            </span>
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{b.chapters} ch</span>
          </button>
        ))}
      </div>

      {/* Pace + calculation */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          <p className="font-bold text-[14px]" style={{ color: '#1A1A2E' }}>Reading pace</p>
          <div className="flex gap-2 flex-wrap">
            {PACE_OPTIONS.map(p => (
              <button key={p} onClick={() => setPace(p)}
                className="px-3 py-2 rounded-full text-[12px] font-bold border-2 transition-all"
                style={pace === p
                  ? { background: '#5B4FCF', borderColor: '#5B4FCF', color: 'white' }
                  : { background: 'white', borderColor: '#E5E7EB', color: '#6B7280' }}>
                {p}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-[16px]" style={{ background: '#EDE9FF' }}>
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
//  Step 1B — Topic plan (hardcoded plans)
// ─────────────────────────────────────────────
function StepTopic({ onSave }) {
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)

  function handleStart() {
    if (!selected) return
    const plan = {
      id: `plan_${Date.now()}`,
      type: 'topic',
      name: selected.name,
      pace: '1 passage/day',
      startDate: todayStr(),
      estimatedEndDate: calcEndDate(selected.duration),
      totalDays: selected.duration,
      currentDay: 1,
      status: 'active',
      days: selected.days.map(d => ({ ...d, completedAt: null, reflection: '' })),
      createdAt: new Date().toISOString(),
    }
    writePlans([plan, ...readPlans()])
    onSave()
  }

  if (confirming && selected) {
    const PlanIcon = PLAN_ICONS[selected.icon] || Sparkles
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
        {/* Plan header */}
        <div className="p-5 rounded-[20px]" style={{ background: `${selected.color}18`, border: `1.5px solid ${selected.color}33` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: selected.color }}>
              <PlanIcon size={20} className="text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-[17px]" style={{ color: '#1A1A2E' }}>{selected.name}</p>
              <p className="text-[12px]" style={{ color: selected.color }}>{selected.theme}</p>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>{selected.description}</p>
        </div>

        {/* First 3 days preview */}
        <div className="flex flex-col gap-2">
          <p className="font-bold text-[13px]" style={{ color: '#1A1A2E' }}>First 3 days</p>
          {selected.days.slice(0, 3).map(d => (
            <div key={d.day} className="flex items-start gap-3 p-3 bg-white rounded-[12px]" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: selected.color }}>
                {d.day}
              </span>
              <div>
                <p className="font-bold text-[13px]" style={{ color: '#1A1A2E' }}>{d.passage}</p>
                <p className="text-[12px]" style={{ color: '#6B7280' }}>{d.title}</p>
              </div>
            </div>
          ))}
          <p className="text-[12px] font-semibold px-1" style={{ color: '#9CA3AF' }}>+ {selected.duration - 3} more days</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)}
            className="flex-1 rounded-pill py-3 text-[14px] font-bold border-2 active:scale-[0.97]"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            ← Back
          </button>
          <button onClick={handleStart}
            className="flex-1 text-white rounded-pill py-3 text-[14px] font-bold hover:opacity-90 active:scale-[0.97]"
            style={{ background: selected.color }}>
            Start Plan →
          </button>
        </div>
        <p className="text-[12px] text-center" style={{ color: '#9CA3AF' }}>More topics coming soon</p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: '#1A1A2E' }}>Choose a topic</h2>
        <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>Curated 30-day plans for every season</p>
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
              background: isSelected ? `${plan.color}12` : 'white',
              border: `2px solid ${isSelected ? plan.color : '#F0EDE8'}`,
              boxShadow: isSelected ? `0 0 0 1px ${plan.color}33` : '0 2px 8px rgba(0,0,0,0.06)',
            }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: plan.color }}>
                <PlanIcon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold text-[16px]" style={{ color: '#1A1A2E' }}>{plan.name}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${plan.color}18`, color: plan.color }}>
                    {plan.duration} days
                  </span>
                </div>
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: plan.color }}>{plan.theme}</p>
                <p className="text-[13px] mt-1 leading-relaxed line-clamp-2" style={{ color: '#6B7280' }}>{plan.description}</p>
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
function StepCharacter() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ color: '#1A1A2E' }}>Character studies</h2>
        <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>Coming in the next update</p>
      </div>

      <div className="p-5 rounded-[20px] flex flex-col items-center gap-3 text-center" style={{ background: '#EDE9FF' }}>
        <Sparkles size={32} style={{ color: '#5B4FCF' }} />
        <p className="font-bold text-[15px]" style={{ color: '#1A1A2E' }}>
          Character study plans are being prepared
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>
          Walk through the lives of David, Daniel, Esther, and Mary — passage by passage.
        </p>
      </div>

      {/* Greyed-out character cards */}
      <div className="grid grid-cols-2 gap-3">
        {CHARACTERS.map(c => (
          <div key={c.id}
            className="flex flex-col items-center gap-2 p-4 rounded-[16px] relative overflow-hidden"
            style={{ background: 'white', border: '2px solid #F0EDE8', opacity: 0.6 }}>
            <Lock size={14} className="absolute top-2 right-2" style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: 32 }}>{c.placeholderEmoji}</span>
            <p className="font-bold text-[13px]" style={{ color: '#1A1A2E' }}>{c.name}</p>
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{c.title}</p>
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

  const [step,     setStep]     = useState(initType ? 1 : 0)
  const [planType, setPlanType] = useState(initType || null)

  function handleTypePick(type) { setPlanType(type); setStep(1) }
  function handleSave() { showToast('Plan created!'); router.push('/plans') }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#FAF8F5' }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => step > 0 ? setStep(0) : router.back()}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)', color: '#1A1A2E' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex justify-center">
          <StepDots current={step === 0 ? 0 : 1} />
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 pb-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTypePicker onPick={handleTypePick} />
            </motion.div>
          )}
          {step === 1 && planType === 'book' && (
            <motion.div key="book" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepBook onSave={handleSave} />
            </motion.div>
          )}
          {step === 1 && planType === 'topic' && (
            <motion.div key="topic" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepTopic onSave={handleSave} />
            </motion.div>
          )}
          {step === 1 && planType === 'character' && (
            <motion.div key="char" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <StepCharacter />
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