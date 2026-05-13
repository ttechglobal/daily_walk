'use client'

// ── /admin — Password-protected admin panel ──
// Update 5: manage topical plans — JSON upload or Claude AI generation

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Plus, Sparkles, Trash2, CheckCircle2, AlertCircle, BookOpen, X } from 'lucide-react'
import { TOPICAL_PLANS } from '../../lib/topical-plans'
import { createClient } from '../../lib/supabase/client'
import { showToast, ToastContainer } from '../../components/Toast'

const EXAMPLE_JSON = `{
  "id": "unique-plan-id",
  "name": "Plan Display Name",
  "description": "2 sentence description of the plan.",
  "theme": "Topic Theme",
  "color": "#5B4FCF",
  "icon": "BookOpen",
  "duration": 30,
  "days": [
    {
      "day": 1,
      "passage": "John 3:16",
      "title": "Short title here",
      "focus": "One sentence about what this passage covers."
    }
  ]
}`

// ── Password gate ──
function PasswordGate({ onAuth }) {
  const [pwd, setPwd]   = useState('')
  const [error, setError] = useState(false)

  function attempt() {
    // Password must be set as NEXT_PUBLIC_ADMIN_PASSWORD in .env.local
    const env = process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    if (!env) { alert('Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local'); return }
    if (pwd === env) {
      try { sessionStorage.setItem('dw_admin_auth', '1') } catch {}
      onAuth()
    } else {
      setError(true)
      setPwd('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background:'#FAF8F5' }}>
      <div className="w-full max-w-[360px] flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:'#EDE9FF' }}>
            <Lock size={24} style={{ color:'#5B4FCF' }} />
          </div>
          <p className="font-bold text-[20px]" style={{ color:'#1A1A2E' }}>Daily Walk Admin</p>
          <p className="text-[13px]" style={{ color:'#6B7280' }}>Developer access only</p>
        </div>
        <input
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin password"
          className="w-full border rounded-input px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple transition-all"
          style={{ borderColor: error ? '#EF4444' : '#E5E7EB', color:'#1A1A2E' }}
          autoFocus
        />
        {error && (
          <p className="text-[13px] text-center" style={{ color:'#EF4444' }}>
            Incorrect password
          </p>
        )}
        <button onClick={attempt}
          className="w-full text-white rounded-pill py-3.5 font-bold text-[15px] hover:opacity-90 transition-all"
          style={{ background:'#5B4FCF' }}>
          Enter
        </button>
      </div>
    </div>
  )
}

// ── Plan preview card ──
function PlanPreviewCard({ plan, onRemove }) {
  return (
    <div className="bg-white rounded-[16px] p-4 border" style={{ borderColor:'#E8E5E0' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[15px]" style={{ color:'#1A1A2E' }}>{plan.name}</p>
          <p className="text-[12px] mt-0.5" style={{ color:'#6B7280' }}>
            {plan.theme} · {plan.days?.length || plan.duration} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: plan.color || '#5B4FCF' }} />
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
            Active
          </span>
          {onRemove && (
            <button onClick={onRemove} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50" style={{ color:'#9CA3AF' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] mt-2 leading-relaxed line-clamp-2" style={{ color:'#6B7280' }}>
        {plan.description}
      </p>
      {plan.days?.slice(0, 2).map(d => (
        <div key={d.day} className="mt-2 flex items-start gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ background:'#5B4FCF' }}>{d.day}</span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold truncate" style={{ color:'#1A1A2E' }}>{d.passage}</p>
            <p className="text-[11px] truncate" style={{ color:'#9CA3AF' }}>{d.title}</p>
          </div>
        </div>
      ))}
      {(plan.days?.length || 0) > 2 && (
        <p className="text-[11px] mt-2" style={{ color:'#9CA3AF' }}>
          + {(plan.days?.length || 0) - 2} more days...
        </p>
      )}
    </div>
  )
}

// ── Main admin panel ──
function AdminPanel() {
  const [tab, setTab]             = useState('plans')
  const [supabasePlans, setSbPlans] = useState([])
  const [jsonInput, setJsonInput] = useState('')
  const [parsed,    setParsed]    = useState(null)
  const [parseError, setParseError] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  // AI generation
  const [genTopic,  setGenTopic]  = useState('')
  const [genDays,   setGenDays]   = useState('30')
  const [genDesc,   setGenDesc]   = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genResult, setGenResult]  = useState(null)
  const [genError,  setGenError]   = useState(null)

  useEffect(() => {
    loadSupabasePlans()
  }, [])

  async function loadSupabasePlans() {
    const sb = createClient()
    if (!sb) return
    try {
      const { data } = await sb.from('topical_plans').select('*').eq('is_active', true).order('created_at', { ascending:true })
      if (data) setSbPlans(data)
    } catch {}
  }

  function handleValidate() {
    setParseError(null)
    setParsed(null)
    try {
      const p = JSON.parse(jsonInput)
      if (!p.id || !p.name || !Array.isArray(p.days)) {
        setParseError('Missing required fields: id, name, days[]')
        return
      }
      if (p.days.length === 0) {
        setParseError('days array is empty')
        return
      }
      const d = p.days[0]
      if (!d.day || !d.passage || !d.title) {
        setParseError('Each day needs: day, passage, title, focus')
        return
      }
      setParsed({ ...p, duration: p.days.length })
    } catch (e) {
      setParseError(`Invalid JSON: ${e.message}`)
    }
  }

  async function handleSaveToSupabase(plan) {
    setSaving(true)
    setSaved(false)
    const sb = createClient()
    if (!sb) {
      showToast('Supabase not configured — plan saved locally only')
      setSaving(false)
      return
    }
    try {
      const { error } = await sb.from('topical_plans').upsert({
        id:          plan.id,
        name:        plan.name,
        description: plan.description || '',
        theme:       plan.theme || plan.name,
        color:       plan.color || '#5B4FCF',
        icon:        plan.icon || 'BookOpen',
        duration:    plan.days.length,
        days:        plan.days,
        is_active:   true,
      })
      if (error) throw error
      setSaved(true)
      showToast('Plan saved to Supabase!')
      setJsonInput('')
      setParsed(null)
      setGenResult(null)
      loadSupabasePlans()
    } catch (e) {
      showToast('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  async function handleGenerate() {
    if (!genTopic.trim()) { showToast('Enter a topic first'); return }
    setGenLoading(true)
    setGenError(null)
    setGenResult(null)
    try {
      const slug = genTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Create a ${genDays}-day Bible reading plan on the topic of "${genTopic}".${genDesc ? ` Context: ${genDesc}` : ''}

Return ONLY valid JSON — no markdown, no preamble. Start with { and end with }.
Use exactly this structure:
{
  "id": "${slug}-${Date.now()}",
  "name": "[Short display name, 2-4 words]",
  "description": "[2 sentence description]",
  "theme": "${genTopic}",
  "color": "[one of: #5B4FCF, #4A7C5F, #E8A838, #7CB9E8, #C77DFF]",
  "icon": "[Lucide icon name that fits the topic]",
  "days": [
    { "day": 1, "passage": "Book Chapter:Verse-Verse", "title": "4-6 word title", "focus": "One sentence." }
  ]
}
Rules: real passages only, vary books, progress logically, return all ${genDays} days.`
          }]
        })
      })
      const data  = await res.json()
      const text  = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const plan  = JSON.parse(clean)
      setGenResult({ ...plan, duration: plan.days?.length || parseInt(genDays) })
    } catch (e) {
      setGenError(`Generation failed: ${e.message}`)
    }
    setGenLoading(false)
  }

  const inputClass = "w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all bg-white"

  return (
    <div className="min-h-screen" style={{ background:'#FAF8F5' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Daily Walk Admin</p>
        <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>Developer panel — not for users</p>
      </div>

      {/* Nav pills */}
      <div className="flex gap-2 px-4 py-3">
        {['plans', 'generate'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-[13px] font-bold capitalize border-2 transition-all"
            style={tab===t ? {background:'#5B4FCF',borderColor:'#5B4FCF',color:'white'} : {background:'white',borderColor:'#E5E7EB',color:'#6B7280'}}>
            {t === 'plans' ? 'Topical Plans' : 'Generate with AI'}
          </button>
        ))}
      </div>

      <div className="px-4 pb-12 flex flex-col gap-5">

        {/* ── PLANS TAB ── */}
        {tab === 'plans' && (
          <>
            {/* Hardcoded plans */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color:'#9CA3AF' }}>
                Built-in plans ({TOPICAL_PLANS.length})
              </p>
              <div className="flex flex-col gap-3">
                {TOPICAL_PLANS.map(p => <PlanPreviewCard key={p.id} plan={p} />)}
              </div>
            </div>

            {/* Supabase plans */}
            {supabasePlans.length > 0 && (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color:'#9CA3AF' }}>
                  Supabase plans ({supabasePlans.length})
                </p>
                <div className="flex flex-col gap-3">
                  {supabasePlans.map(p => <PlanPreviewCard key={p.id} plan={p} />)}
                </div>
              </div>
            )}

            {/* JSON paste */}
            <div className="bg-white rounded-[20px] p-5 border" style={{ borderColor:'#E8E5E0' }}>
              <p className="font-bold text-[16px] mb-1" style={{ color:'#1A1A2E' }}>Add plan via JSON</p>
              <p className="text-[12px] mb-3" style={{ color:'#6B7280' }}>Paste plan JSON — see format below</p>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={EXAMPLE_JSON}
                rows={10}
                className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[12px] font-mono focus:outline-none focus:border-purple resize-none"
                style={{ color:'#1A1A2E', background:'#FAFAFA' }} />
              {parseError && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-[10px]" style={{ background:'#FFF0F0' }}>
                  <AlertCircle size={14} style={{ color:'#EF4444' }} />
                  <p className="text-[12px]" style={{ color:'#EF4444' }}>{parseError}</p>
                </div>
              )}
              {parsed && <PlanPreviewCard plan={parsed} />}
              <div className="flex gap-2 mt-3">
                <button onClick={handleValidate} disabled={!jsonInput.trim()}
                  className="flex-1 border-2 rounded-pill py-3 text-[13px] font-bold disabled:opacity-40 transition-all"
                  style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
                  Validate & Preview
                </button>
                {parsed && (
                  <button onClick={() => handleSaveToSupabase(parsed)} disabled={saving}
                    className="flex-1 text-white rounded-pill py-3 text-[13px] font-bold disabled:opacity-60 hover:opacity-90 transition-all"
                    style={{ background:'#5B4FCF' }}>
                    {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save to Supabase'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── GENERATE TAB ── */}
        {tab === 'generate' && (
          <div className="bg-white rounded-[20px] p-5 border flex flex-col gap-4" style={{ borderColor:'#E8E5E0' }}>
            <div>
              <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Generate with Claude</p>
              <p className="text-[12px] mt-0.5" style={{ color:'#6B7280' }}>AI creates a real Bible reading plan</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold" style={{ color:'#6B7280' }}>Topic *</label>
              <input type="text" value={genTopic} onChange={e => setGenTopic(e.target.value)}
                placeholder="e.g. Holiness, Grief, Identity in Christ"
                className={inputClass} style={{ color:'#1A1A2E' }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold" style={{ color:'#6B7280' }}>Duration (days)</label>
              <input type="number" value={genDays} onChange={e => setGenDays(e.target.value)}
                min="7" max="90" className={inputClass} style={{ color:'#1A1A2E' }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold" style={{ color:'#6B7280' }}>Extra context (optional)</label>
              <textarea value={genDesc} onChange={e => setGenDesc(e.target.value)}
                placeholder="e.g. Focus on NT passages, for new believers..."
                rows={2} className={`${inputClass} resize-none`} style={{ color:'#1A1A2E' }} />
            </div>

            {genLoading && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="flex items-center gap-3 p-4 rounded-[14px]" style={{ background:'#EDE9FF' }}>
                <motion.div animate={{ rotate:360 }} transition={{ duration:2, repeat:Infinity, ease:'linear' }}>
                  <Sparkles size={20} style={{ color:'#5B4FCF' }} />
                </motion.div>
                <p className="text-[13px] font-semibold" style={{ color:'#5B4FCF' }}>
                  Generating {genDays}-day plan on {genTopic}...
                </p>
              </motion.div>
            )}

            {genError && (
              <div className="flex items-center gap-2 p-3 rounded-[12px]" style={{ background:'#FFF0F0' }}>
                <AlertCircle size={14} style={{ color:'#EF4444' }} />
                <p className="text-[12px]" style={{ color:'#EF4444' }}>{genError}</p>
              </div>
            )}

            {genResult && !genLoading && (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] font-bold" style={{ color:'#4A7C5F' }}>✓ Plan generated — review before saving</p>
                <PlanPreviewCard plan={genResult} />
                <div className="flex gap-2">
                  <button onClick={() => { setGenResult(null); setGenTopic(''); setGenDays('30') }}
                    className="flex-1 border-2 rounded-pill py-3 text-[13px] font-bold"
                    style={{ borderColor:'#E5E7EB', color:'#6B7280' }}>
                    Discard
                  </button>
                  <button onClick={() => handleSaveToSupabase(genResult)} disabled={saving}
                    className="flex-1 text-white rounded-pill py-3 text-[13px] font-bold disabled:opacity-60 hover:opacity-90"
                    style={{ background:'#5B4FCF' }}>
                    {saving ? 'Saving...' : 'Save to Supabase'}
                  </button>
                </div>
              </div>
            )}

            {!genResult && !genLoading && (
              <button onClick={handleGenerate} disabled={!genTopic.trim()}
                className="w-full flex items-center justify-center gap-2 text-white rounded-pill py-4 text-[14px] font-bold disabled:opacity-40 hover:opacity-90 transition-all"
                style={{ background:'#5B4FCF' }}>
                <Sparkles size={16} /> Generate Plan
              </button>
            )}
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('dw_admin_auth') === '1') setAuthed(true)
    } catch {}
    setChecking(false)
  }, [])

  if (checking) return null
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />
  return <AdminPanel />
}