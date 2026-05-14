'use client'

// ── /admin — Daily Walk Admin Panel ──
// Password: set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local
// Tabs: Plans | Analytics | Ads (coming soon)

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, Plus, Sparkles, Trash2, CheckCircle2, AlertCircle,
  Copy, BarChart2, Users, BookOpen, TrendingUp, Eye, Megaphone
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { showToast, ToastContainer } from '../../components/Toast'

// ─────────────────────────────────────────────
//  Gemini prompt builder
// ─────────────────────────────────────────────
function buildGeminiPrompt(topic, days) {
  return `Create a ${days}-day Bible reading plan on the topic of "${topic}".

Return ONLY valid JSON — no markdown backticks, no explanation, no preamble. Start your response with { and end with }.

Use exactly this structure:
{
  "id": "${topic.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-')}-plan",
  "name": "[Short catchy plan name, 2-4 words]",
  "description": "[2 sentences: what this plan covers and who it is for]",
  "theme": "${topic}",
  "color": "[choose one: #5B4FCF, #4A7C5F, #E8A838, #7CB9E8, #C77DFF]",
  "icon": "[one Lucide React icon name that fits, e.g. Heart, Shield, Flame, Star, Wind]",
  "duration": ${days},
  "days": [
    { "day": 1, "passage": "Book Chapter:Verse-Verse", "title": "4-6 word title", "focus": "One sentence about this passage for this topic." },
    { "day": 2, "passage": "Book Chapter:Verse-Verse", "title": "4-6 word title", "focus": "One sentence." }
  ]
}

Rules:
- Only use real, accurate Bible passages that genuinely address "${topic}"
- Vary the books — no two consecutive days from the same book
- Progress from foundational to deeper passages across ${days} days
- Keep focus sentences encouraging, not preachy
- Return ALL ${days} days, no skipping or truncating
- The "days" array must have exactly ${days} items`
}

// ─────────────────────────────────────────────
//  Password gate
// ─────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pwd,   setPwd]   = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function attempt() {
    const env = process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    if (!env) { alert('Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local then restart dev server'); return }
    if (pwd === env) {
      try { sessionStorage.setItem('dw_admin_auth', '1') } catch {}
      onAuth()
    } else {
      setError(true); setShake(true); setPwd('')
      setTimeout(() => { setError(false); setShake(false) }, 1800)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background:'#FAF8F5' }}>
      <motion.div className="w-full max-w-[360px] flex flex-col gap-5"
        animate={shake ? { x:[-8,8,-6,6,-3,3,0] } : {}} transition={{ duration:0.4 }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:'#EDE9FF' }}>
            <Lock size={24} style={{ color:'#5B4FCF' }} />
          </div>
          <p className="font-bold text-[22px]" style={{ color:'#1A1A2E' }}>Daily Walk Admin</p>
          <p className="text-[13px]" style={{ color:'#9CA3AF' }}>Developer access only</p>
        </div>
        <input type="password" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin password"
          className="w-full border rounded-[14px] px-4 py-3.5 text-[15px] focus:outline-none focus:border-purple transition-all"
          style={{ borderColor:error?'#EF4444':'#E5E7EB', color:'#1A1A2E' }}
          autoFocus />
        {error && <p className="text-[13px] text-center" style={{ color:'#EF4444' }}>Incorrect password</p>}
        <button onClick={attempt}
          className="w-full text-white rounded-full py-3.5 font-bold text-[15px] hover:opacity-90 transition-all"
          style={{ background:'#5B4FCF' }}>
          Enter
        </button>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Plan preview card
// ─────────────────────────────────────────────
function PlanPreviewCard({ plan }) {
  const [expanded, setExpanded] = useState(false)
  const days = plan.days || []
  const shown = expanded ? days : days.slice(0, 3)

  return (
    <div className="bg-white rounded-[16px] overflow-hidden border" style={{ borderColor:'#E8E5E0' }}>
      <div className="h-1.5 w-full" style={{ background: plan.color || '#5B4FCF' }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>{plan.name}</p>
            <p className="text-[12px] mt-0.5" style={{ color:'#6B7280' }}>
              {plan.theme} · {days.length} days
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background:plan.color||'#5B4FCF' }} />
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#E8F4ED', color:'#4A7C5F' }}>
              Valid ✓
            </span>
          </div>
        </div>
        {plan.description && (
          <p className="text-[13px] leading-relaxed" style={{ color:'#6B7280' }}>{plan.description}</p>
        )}
        {/* Day rows */}
        <div className="flex flex-col gap-1.5">
          {shown.map(d => (
            <div key={d.day} className="flex items-start gap-2.5 py-1.5 border-b last:border-0"
              style={{ borderColor:'#F5F5F5' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: plan.color||'#5B4FCF' }}>{d.day}</div>
              <div className="min-w-0">
                <p className="font-bold text-[12px]" style={{ color:'#1A1A2E' }}>{d.passage}</p>
                <p className="text-[11px]" style={{ color:'#6B7280' }}>{d.title}</p>
                <p className="text-[11px] italic mt-0.5" style={{ color:'#9CA3AF' }}>{d.focus}</p>
              </div>
            </div>
          ))}
        </div>
        {days.length > 3 && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-[12px] font-semibold text-center"
            style={{ color:'#5B4FCF' }}>
            {expanded ? 'Show less ↑' : `Show all ${days.length} days ↓`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Plans tab
// ─────────────────────────────────────────────
function PlansTab() {
  const [sbPlans,   setSbPlans]   = useState([])
  const [jsonInput, setJsonInput] = useState('')
  const [parsed,    setParsed]    = useState(null)
  const [parseErr,  setParseErr]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [prompt,    setPrompt]    = useState({ topic:'', days:'30', copied:false })

  useEffect(() => { loadSbPlans() }, [])

  async function loadSbPlans() {
    const sb = createClient()
    if (!sb) return
    try {
      const { data } = await sb.from('topical_plans').select('*').eq('is_active', true).order('created_at')
      if (data) setSbPlans(data)
    } catch {}
  }

  function handleValidate() {
    setParseErr(null); setParsed(null)
    try {
      const p = JSON.parse(jsonInput)
      if (!p.id)            { setParseErr('Missing: id'); return }
      if (!p.name)          { setParseErr('Missing: name'); return }
      if (!Array.isArray(p.days) || p.days.length === 0) { setParseErr('Missing: days[]'); return }
      const d = p.days[0]
      if (!d.day || !d.passage || !d.title) { setParseErr('Each day needs: day, passage, title, focus'); return }
      setParsed({ ...p, duration: p.days.length })
      showToast(`✓ Valid — ${p.days.length} days`)
    } catch (e) {
      setParseErr(`JSON error: ${e.message}`)
    }
  }

  async function handleSave(plan) {
    setSaving(true)
    const sb = createClient()
    if (!sb) {
      showToast('Supabase not configured — wire NEXT_PUBLIC_SUPABASE_URL in .env.local')
      setSaving(false); return
    }
    try {
      const { error } = await sb.from('topical_plans').upsert({
        id: plan.id, name: plan.name, description: plan.description || '',
        theme: plan.theme || plan.name, color: plan.color || '#5B4FCF',
        icon: plan.icon || 'BookOpen', duration: plan.days.length,
        days: plan.days, is_active: true,
      })
      if (error) throw error
      showToast('Plan saved — users will see it immediately!')
      setJsonInput(''); setParsed(null); loadSbPlans()
    } catch (e) { showToast('Save failed: ' + e.message) }
    setSaving(false)
  }

  async function copyPrompt() {
    const text = buildGeminiPrompt(prompt.topic || 'Prayer', prompt.days)
    await navigator.clipboard.writeText(text).catch(() => {})
    setPrompt(p => ({ ...p, copied: true }))
    setTimeout(() => setPrompt(p => ({ ...p, copied: false })), 2000)
    showToast('Prompt copied — paste into Gemini!')
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── STEP 1: Generate prompt ── */}
      <section className="bg-white rounded-[20px] p-5 border flex flex-col gap-4"
        style={{ borderColor:'#E8E5E0' }}>
        <div>
          <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>
            Step 1 — Generate a plan with Gemini
          </p>
          <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>
            Fill in topic + length, copy the prompt, paste into Gemini, paste the JSON back below.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color:'#9CA3AF' }}>Topic</label>
            <input type="text" value={prompt.topic}
              onChange={e => setPrompt(p => ({...p, topic: e.target.value}))}
              placeholder="e.g. Self-Control, Prayer, Grief, Purpose"
              className="border rounded-[12px] px-3 py-2.5 text-[14px] focus:outline-none focus:border-purple"
              style={{ borderColor:'#E5E7EB', color:'#1A1A2E' }} />
          </div>
          <div className="flex flex-col gap-1 w-20">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color:'#9CA3AF' }}>Days</label>
            <input type="number" value={prompt.days} min="7" max="90"
              onChange={e => setPrompt(p => ({...p, days: e.target.value}))}
              className="border rounded-[12px] px-3 py-2.5 text-[14px] focus:outline-none focus:border-purple text-center"
              style={{ borderColor:'#E5E7EB', color:'#1A1A2E' }} />
          </div>
        </div>

        {/* Prompt preview */}
        <div className="rounded-[12px] p-3 text-[11px] font-mono leading-relaxed"
          style={{ background:'#F8F7FF', color:'#5B4FCF', border:'1px solid #EDE9FF', maxHeight:120, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 60%, #F8F7FF)' }} />
          {buildGeminiPrompt(prompt.topic||'Prayer', prompt.days).slice(0, 300)}...
        </div>

        <button onClick={copyPrompt}
          className="w-full flex items-center justify-center gap-2 text-white rounded-full py-3.5 text-[14px] font-bold hover:opacity-90 active:scale-[0.97] transition-all"
          style={{ background: prompt.copied ? '#4A7C5F' : '#5B4FCF' }}>
          <Copy size={15} />
          {prompt.copied ? 'Copied! Paste into Gemini ↗' : 'Copy Gemini Prompt'}
        </button>

        <p className="text-[12px] text-center" style={{ color:'#9CA3AF' }}>
          Paste the prompt into gemini.google.com → copy the JSON response → paste below
        </p>
      </section>

      {/* ── STEP 2: Paste + validate ── */}
      <section className="bg-white rounded-[20px] p-5 border flex flex-col gap-4"
        style={{ borderColor:'#E8E5E0' }}>
        <div>
          <p className="font-bold text-[16px]" style={{ color:'#1A1A2E' }}>Step 2 — Paste JSON & preview</p>
          <p className="text-[13px] mt-0.5" style={{ color:'#6B7280' }}>Paste the JSON Gemini gave you. Click Validate to check it.</p>
        </div>

        <textarea value={jsonInput} onChange={e => { setJsonInput(e.target.value); setParsed(null); setParseErr(null) }}
          placeholder={'{\n  "id": "prayer-plan",\n  "name": "Powerful Prayer",\n  "days": [...]\n}'}
          rows={8}
          className="w-full border rounded-[12px] px-4 py-3 text-[12px] font-mono focus:outline-none focus:border-purple resize-none"
          style={{ borderColor:'#E5E7EB', color:'#1A1A2E', background:'#FAFAFA' }} />

        {parseErr && (
          <div className="flex items-start gap-2 p-3 rounded-[12px]" style={{ background:'#FFF0F0' }}>
            <AlertCircle size={14} style={{ color:'#EF4444', flexShrink:0, marginTop:1 }} />
            <p className="text-[12px]" style={{ color:'#EF4444' }}>{parseErr}</p>
          </div>
        )}

        <button onClick={handleValidate} disabled={!jsonInput.trim()}
          className="w-full border-2 rounded-full py-3 text-[14px] font-bold disabled:opacity-40 hover:bg-purple-light transition-all"
          style={{ borderColor:'#5B4FCF', color:'#5B4FCF' }}>
          Validate & Preview
        </button>

        {/* Preview */}
        {parsed && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="flex flex-col gap-3">
            <p className="text-[12px] font-bold" style={{ color:'#4A7C5F' }}>
              ✓ Looks good — {parsed.days.length} days ready to publish
            </p>
            <PlanPreviewCard plan={parsed} />
            <button onClick={() => handleSave(parsed)} disabled={saving}
              className="w-full text-white rounded-full py-4 text-[15px] font-bold disabled:opacity-60 hover:opacity-90 active:scale-[0.97] transition-all"
              style={{ background:'#5B4FCF' }}>
              {saving ? 'Saving to Supabase...' : 'Publish Plan →'}
            </button>
          </motion.div>
        )}
      </section>

      {/* ── STEP 3: Live plans ── */}
      {sbPlans.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color:'#9CA3AF' }}>
            Live in app ({sbPlans.length} from Supabase)
          </p>
          {sbPlans.map(p => <PlanPreviewCard key={p.id} plan={p} />)}
        </section>
      )}

      {/* Supabase not configured notice */}
      {!createClient() && (
        <div className="p-4 rounded-[14px] border" style={{ borderColor:'#FDE68A', background:'#FFFBEB' }}>
          <p className="font-bold text-[13px]" style={{ color:'#92400E' }}>Supabase not connected</p>
          <p className="text-[12px] mt-1" style={{ color:'#B45309' }}>
            Plans will save locally for now. Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to publish to all users.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Analytics tab (real localStorage metrics)
// ─────────────────────────────────────────────
function AnalyticsTab() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    try {
      const checkins    = JSON.parse(localStorage.getItem('dw_checkins')    || '[]')
      const plans       = JSON.parse(localStorage.getItem('dw_plans')       || '[]')
      const communities = JSON.parse(localStorage.getItem('dw_communities') || '[]')
      const nuggets     = JSON.parse(localStorage.getItem('dw_nuggets')     || '[]')
      const globalPosts = JSON.parse(localStorage.getItem('dw_global_posts')|| '[]')
      const streak      = JSON.parse(localStorage.getItem('dw_streak')      || '{}')
      const user        = JSON.parse(localStorage.getItem('dw_user')        || 'null')

      const allPosts = [...globalPosts]
      communities.forEach(c => allPosts.push(...(c.posts||[])))

      setStats({
        checkins:       checkins.length,
        streak:         streak.current || 0,
        longestStreak:  streak.longest || 0,
        activePlans:    plans.filter(p => p.status === 'active').length,
        completedPlans: plans.filter(p => p.status === 'completed').length,
        communities:    communities.filter(c => c.joined).length,
        nuggets:        nuggets.length,
        posts:          allPosts.length,
        userName:       user?.name || 'Not set',
        companion:      user?.companionId || 'david',
        joinedAt:       user?.joinedAt || 'Unknown',
      })
    } catch {}
  }, [])

  if (!stats) return <p className="text-center py-8" style={{ color:'#9CA3AF' }}>Loading...</p>

  const metrics = [
    { icon:BookOpen,    label:'Total check-ins',       value:stats.checkins,       color:'#5B4FCF' },
    { icon:TrendingUp,  label:'Current streak',        value:`${stats.streak} days`,  color:'#E8A838' },
    { icon:TrendingUp,  label:'Longest streak',        value:`${stats.longestStreak} days`, color:'#E8A838' },
    { icon:Eye,         label:'Active plans',          value:stats.activePlans,    color:'#4A7C5F' },
    { icon:CheckCircle2,label:'Completed plans',       value:stats.completedPlans, color:'#4A7C5F' },
    { icon:Users,       label:'Communities joined',    value:stats.communities,    color:'#C77DFF' },
    { icon:Sparkles,    label:'Nuggets saved',         value:stats.nuggets,        color:'#E8A838' },
    { icon:BarChart2,   label:'Posts written',         value:stats.posts,          color:'#5B4FCF' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* User summary */}
      <div className="bg-white rounded-[20px] p-5 border" style={{ borderColor:'#E8E5E0' }}>
        <p className="font-bold text-[15px] mb-3" style={{ color:'#1A1A2E' }}>This device</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[13px]">
            <span style={{ color:'#6B7280' }}>User name</span>
            <span className="font-semibold" style={{ color:'#1A1A2E' }}>{stats.userName}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color:'#6B7280' }}>Companion</span>
            <span className="font-semibold capitalize" style={{ color:'#1A1A2E' }}>{stats.companion}</span>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-[16px] p-4 flex flex-col gap-2 border"
            style={{ borderColor:'#F0EDE8' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:`${m.color}18` }}>
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <p className="font-bold text-[22px]" style={{ color:'#1A1A2E' }}>{m.value}</p>
            <p className="text-[11px]" style={{ color:'#9CA3AF' }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-[14px] border text-center" style={{ borderColor:'#E8E5E0', background:'white' }}>
        <p className="font-semibold text-[13px]" style={{ color:'#6B7280' }}>
          📊 These are device-level stats from localStorage.
        </p>
        <p className="text-[12px] mt-1" style={{ color:'#9CA3AF' }}>
          Once Supabase is connected, this panel will show real-time aggregate stats across all users.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Ads tab (placeholder for future)
// ─────────────────────────────────────────────
function AdsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-[20px] p-6 border text-center flex flex-col items-center gap-4"
        style={{ borderColor:'#E8E5E0' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background:'#EDE9FF' }}>
          <Megaphone size={28} style={{ color:'#5B4FCF' }} />
        </div>
        <div>
          <p className="font-bold text-[18px]" style={{ color:'#1A1A2E' }}>Ads Management</p>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color:'#6B7280' }}>
            This is where you'll manage sponsored content, promoted communities, and partner integrations when Daily Walk scales.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2 text-left">
          {[
            'Banner ads in the For You feed',
            'Sponsored Bible reading plans',
            'Promoted communities from churches',
            'CPM/CPC reporting dashboard',
            'Ad approval workflow',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b last:border-0"
              style={{ borderColor:'#F5F5F5' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:'#C4C1BC' }} />
              <p className="text-[13px]" style={{ color:'#6B7280' }}>{item}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] font-semibold px-4 py-2 rounded-full"
          style={{ background:'#EDE9FF', color:'#5B4FCF' }}>
          Coming in v2.0
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main admin panel
// ─────────────────────────────────────────────
function AdminPanel() {
  const [tab, setTab] = useState('plans')

  const TABS = [
    { key:'plans',     label:'Plans',     icon:BookOpen  },
    { key:'analytics', label:'Analytics', icon:BarChart2 },
    { key:'ads',       label:'Ads',       icon:Megaphone },
  ]

  return (
    <div className="min-h-screen" style={{ background:'#FAF8F5' }}>
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b" style={{ borderColor:'#F0EDE8' }}>
        <p className="font-bold text-[20px]" style={{ color:'#1A1A2E' }}>Daily Walk Admin</p>
        <p className="text-[12px] mt-0.5" style={{ color:'#9CA3AF' }}>
          {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 px-4 pt-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold transition-all"
            style={tab===t.key
              ? { background:'#5B4FCF', color:'white' }
              : { background:'white', color:'#6B7280', border:'1.5px solid #E5E7EB' }}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 pb-16">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:0.15 }}>
            {tab === 'plans'     && <PlansTab />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'ads'       && <AdsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <ToastContainer />
    </div>
  )
}

// ─────────────────────────────────────────────
export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try { if (sessionStorage.getItem('dw_admin_auth') === '1') setAuthed(true) } catch {}
    setChecking(false)
  }, [])

  if (checking) return null
  if (!authed)  return <PasswordGate onAuth={() => setAuthed(true)} />
  return <AdminPanel />
}