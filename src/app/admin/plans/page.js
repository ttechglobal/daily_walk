'use client'

// ── src/app/admin/plans/page.js ──
// Admin plan builder — create topical/curated plans with Bible references.
// Accessible from the admin sidebar at /admin → Plans.
//
// FEATURES:
//   • List all plans (shared_plans table)
//   • Create new plan: name, type (book/topic/character/custom), passages
//   • Passage builder: type a reference like "John 3:16" → parsed + validated
//   • Bulk paste: paste a list of references, one per line — auto-parsed
//   • Preview: see the plan structure before publishing
//   • Publish as public (discoverable) or private
//   • Edit / deactivate existing plans

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Eye, Edit2, Globe, Lock, Check,
  ChevronDown, ChevronUp, Loader2, Copy, X,
  BookOpen, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { createClient } from '../../../lib/supabase/client'
import { generateInviteCode, parsePassageRef } from '../../../lib/reading-data'

function todayStr() { return new Date().toISOString().split('T')[0] }

// ─────────────────────────────────────────────
//  Parse a text block of references
//  Handles formats:
//    John 3:16
//    John 3:16-17
//    Romans 8:28
//    Genesis 1
//    Psalm 23:1-6
// ─────────────────────────────────────────────
function parseRefBlock(text) {
  const lines = text.split(/\n|;|,/).map(l => l.trim()).filter(Boolean)
  return lines.map((line, i) => {
    const parsed = parsePassageRef(line)
    return {
      id:        `passage_${Date.now()}_${i}`,
      reference: line,
      book:      parsed.book      || '',
      chapter:   parsed.chapter   || 0,
      verse:     parsed.verse     || null,
      verseEnd:  parsed.verseEnd  || null,
      title:     '',
      focus:     '',
      valid:     !!(parsed.book && parsed.chapter),
    }
  })
}

// ─────────────────────────────────────────────
//  Single passage row
// ─────────────────────────────────────────────
function PassageRow({ item, index, total, onChange, onDelete, onMove, t }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-[14px] overflow-hidden"
      style={{ background: t.bgCard, border: `1px solid ${item.valid ? t.border : '#EF4444'}` }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Index */}
        <span className="text-[11px] font-bold w-6 flex-shrink-0"
          style={{ color: t.textFaint }}>{index + 1}</span>

        {/* Reference */}
        <input
          value={item.reference}
          onChange={e => {
            const parsed = parsePassageRef(e.target.value)
            onChange(item.id, {
              reference: e.target.value,
              book:      parsed.book    || '',
              chapter:   parsed.chapter || 0,
              verse:     parsed.verse   || null,
              verseEnd:  parsed.verseEnd|| null,
              valid:     !!(parsed.book && parsed.chapter),
            })
          }}
          placeholder="e.g. John 3:16"
          className="flex-1 text-[14px] font-semibold focus:outline-none bg-transparent"
          style={{ color: item.valid ? t.text : '#EF4444' }}
        />

        {/* Valid indicator */}
        {item.valid && <Check size={14} style={{ color: '#4A7C5F', flexShrink: 0 }} />}

        {/* Move up/down */}
        <div className="flex gap-0.5 flex-shrink-0">
          <button onClick={() => onMove(index, -1)} disabled={index === 0}
            className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30"
            style={{ background: t.bgMuted }}>
            <ArrowUp size={12} style={{ color: t.textMuted }} />
          </button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1}
            className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30"
            style={{ background: t.bgMuted }}>
            <ArrowDown size={12} style={{ color: t.textMuted }} />
          </button>
        </div>

        {/* Expand for title/focus */}
        <button onClick={() => setExpanded(v => !v)}
          className="w-6 h-6 flex items-center justify-center rounded-md"
          style={{ background: t.bgMuted }}>
          {expanded
            ? <ChevronUp  size={12} style={{ color: t.textMuted }} />
            : <ChevronDown size={12} style={{ color: t.textMuted }} />}
        </button>

        {/* Delete */}
        <button onClick={() => onDelete(item.id)}
          className="w-6 h-6 flex items-center justify-center rounded-md"
          style={{ background: '#FEE2E2' }}>
          <Trash2 size={12} style={{ color: '#EF4444' }} />
        </button>
      </div>

      {/* Expanded: title + focus */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-3 flex flex-col gap-2 border-t" style={{ borderColor: t.border }}>
              <input
                value={item.title || ''}
                onChange={e => onChange(item.id, { title: e.target.value })}
                placeholder="Day title (e.g. God so loved the world)"
                className="w-full text-[13px] py-2 px-3 rounded-[10px] focus:outline-none"
                style={{ background: t.bgMuted, color: t.text, border: `1px solid ${t.border}` }} />
              <textarea
                value={item.focus || ''}
                onChange={e => onChange(item.id, { focus: e.target.value })}
                placeholder="Focus note — what is the key insight for this passage?"
                rows={2}
                className="w-full text-[13px] py-2 px-3 rounded-[10px] focus:outline-none resize-none"
                style={{ background: t.bgMuted, color: t.text, border: `1px solid ${t.border}` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Plan creator modal
// ─────────────────────────────────────────────
function CreatePlanModal({ onClose, onCreated, t }) {
  const [step,        setStep]       = useState(1) // 1=meta 2=passages 3=confirm
  const [name,        setName]       = useState('')
  const [description, setDescription]= useState('')
  const [subtype,     setSubtype]    = useState('topic') // book|topic|character|custom
  const [visibility,  setVisibility] = useState('public')
  const [passages,    setPassages]   = useState([])
  const [bulkText,    setBulkText]   = useState('')
  const [saving,      setSaving]     = useState(false)
  const textRef = useRef(null)

  const validPassages = passages.filter(p => p.valid)

  function addBlank() {
    setPassages(prev => [...prev, {
      id: `p_${Date.now()}`,
      reference: '', book: '', chapter: 0, verse: null, verseEnd: null,
      title: '', focus: '', valid: false,
    }])
  }

  function importBulk() {
    const parsed = parseRefBlock(bulkText)
    setPassages(prev => [...prev, ...parsed])
    setBulkText('')
  }

  function updatePassage(id, patch) {
    setPassages(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function deletePassage(id) {
    setPassages(prev => prev.filter(p => p.id !== id))
  }

  function movePassage(index, direction) {
    setPassages(prev => {
      const next = [...prev]
      const to   = index + direction
      if (to < 0 || to >= next.length) return prev
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || validPassages.length === 0) return
    setSaving(true)
    try {
      const sb = createClient()
      if (!sb) throw new Error('Supabase not configured')

      // Build content array
      const content = validPassages.map(p => ({
        reference: p.reference,
        book:      p.book,
        chapter:   p.chapter,
        verse:     p.verse    || null,
        verseEnd:  p.verseEnd || null,
        title:     p.title    || null,
        focus:     p.focus    || null,
      }))

      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await sb.from('shared_plans').insert({
        name:         name.trim(),
        description:  description.trim() || null,
        creator_id:   user.id,
        visibility,
        status:       'active',
        start_date:   todayStr(),
        invite_code:  generateInviteCode(name),
        plan_subtype: subtype,
        content,
        total_items:  content.length,
        item_unit:    'passage',
      }).select('id, name').single()

      if (error) throw error
      onCreated(data)
      onClose()
    } catch (e) {
      console.error(e)
      alert(`Failed to create plan: ${e.message}`)
    } finally { setSaving(false) }
  }

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/60 z-[80]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        className="fixed inset-4 md:inset-8 rounded-[24px] z-[90] flex flex-col overflow-hidden"
        style={{ background: t.bg, maxWidth: 720, margin: 'auto' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: t.border, background: t.bgCard }}>
          <h2 className="font-bold text-[18px]" style={{ color: t.text }}>New Reading Plan</h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className="rounded-full"
                  style={{ width: s === step ? 20 : 7, height: 7,
                    background: s <= step ? '#5B4FCF' : t.bgMuted, transition: 'all 0.2s' }} />
              ))}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.bgMuted }}>
              <X size={15} style={{ color: t.textMuted }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1 — Metadata */}
          {step === 1 && (
            <div className="flex flex-col gap-4 max-w-lg">
              <div>
                <label className="text-[13px] font-bold block mb-1.5" style={{ color: t.textMuted }}>
                  Plan name *
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. 30 Days of Faith"
                  className="w-full px-4 py-3 rounded-[12px] border text-[14px] focus:outline-none"
                  style={{ background: t.bgMuted, borderColor: name ? '#5B4FCF' : t.border, color: t.text }} />
              </div>

              <div>
                <label className="text-[13px] font-bold block mb-1.5" style={{ color: t.textMuted }}>
                  Description
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What is this plan about? Who is it for?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-[12px] border text-[14px] focus:outline-none resize-none"
                  style={{ background: t.bgMuted, borderColor: t.border, color: t.text }} />
              </div>

              <div>
                <label className="text-[13px] font-bold block mb-1.5" style={{ color: t.textMuted }}>
                  Plan type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['topic', 'book', 'character', 'custom'].map(type => (
                    <button key={type} onClick={() => setSubtype(type)}
                      className="px-3.5 py-2 rounded-full text-[12px] font-bold border-2 capitalize transition-all"
                      style={{
                        background:  subtype === type ? '#5B4FCF' : t.bgMuted,
                        borderColor: subtype === type ? '#5B4FCF' : t.border,
                        color:       subtype === type ? 'white'   : t.text,
                      }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold block mb-1.5" style={{ color: t.textMuted }}>
                  Visibility
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'public',  Icon: Globe, label: 'Public'  },
                    { key: 'private', Icon: Lock,  label: 'Private' },
                  ].map(({ key, Icon, label }) => (
                    <button key={key} onClick={() => setVisibility(key)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all"
                      style={{
                        background:  visibility === key ? '#5B4FCF' : t.bgMuted,
                        borderColor: visibility === key ? '#5B4FCF' : t.border,
                        color:       visibility === key ? 'white'   : t.text,
                      }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Passages */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[16px]" style={{ color: t.text }}>
                  Bible passages
                  {validPassages.length > 0 && (
                    <span className="ml-2 text-[12px] font-semibold" style={{ color: '#5B4FCF' }}>
                      {validPassages.length} valid
                    </span>
                  )}
                </p>
                <button onClick={addBlank}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold text-white"
                  style={{ background: '#5B4FCF' }}>
                  <Plus size={13} /> Add passage
                </button>
              </div>

              {/* Bulk import */}
              <div className="rounded-[14px] p-4"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <p className="text-[13px] font-bold mb-2" style={{ color: t.text }}>
                  Bulk import
                </p>
                <p className="text-[12px] mb-2" style={{ color: t.textMuted }}>
                  Paste multiple references, one per line. e.g:<br />
                  <span className="font-mono">John 3:16{'\n'}Romans 8:28{'\n'}Psalm 23:1-4</span>
                </p>
                <textarea ref={textRef}
                  value={bulkText} onChange={e => setBulkText(e.target.value)}
                  placeholder={"John 3:16\nRomans 8:28\nPsalm 23:1-4\n..."}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-[10px] border text-[13px] font-mono focus:outline-none resize-none"
                  style={{ background: t.bgMuted, borderColor: t.border, color: t.text }} />
                <button onClick={importBulk} disabled={!bulkText.trim()}
                  className="mt-2 px-4 py-2 rounded-full text-[12px] font-bold text-white disabled:opacity-40"
                  style={{ background: '#4A7C5F' }}>
                  Import {bulkText.trim() ? `(${bulkText.trim().split('\n').filter(Boolean).length} lines)` : ''}
                </button>
              </div>

              {/* Passage list */}
              {passages.length === 0 ? (
                <div className="text-center py-8 rounded-[14px]"
                  style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                  <p style={{ fontSize: 28 }}>📖</p>
                  <p className="text-[14px] mt-2" style={{ color: t.textMuted }}>
                    Add passages above or use bulk import
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {passages.map((item, i) => (
                    <PassageRow key={item.id}
                      item={item} index={i} total={passages.length}
                      onChange={updatePassage}
                      onDelete={deletePassage}
                      onMove={movePassage}
                      t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Preview & confirm */}
          {step === 3 && (
            <div className="flex flex-col gap-4 max-w-lg">
              <div className="rounded-[16px] p-4"
                style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                <p className="font-bold text-[16px]" style={{ color: t.text }}>{name}</p>
                {description && (
                  <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>{description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
                    {subtype}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: visibility === 'public' ? '#E8F5EE' : '#FFF3DC',
                             color:      visibility === 'public' ? '#4A7C5F' : '#E8A838' }}>
                    {visibility}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: t.bgMuted, color: t.textMuted }}>
                    {validPassages.length} passages
                  </span>
                </div>
              </div>

              {/* Passage summary */}
              <div>
                <p className="text-[13px] font-bold mb-2" style={{ color: t.textMuted }}>
                  Passages ({validPassages.length})
                </p>
                <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
                  {validPassages.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]"
                      style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
                      <span className="text-[11px] font-bold w-5 flex-shrink-0"
                        style={{ color: t.textFaint }}>{i + 1}</span>
                      <span className="font-semibold text-[13px]" style={{ color: '#5B4FCF' }}>
                        {p.reference}
                      </span>
                      {p.title && (
                        <span className="text-[12px] truncate flex-1" style={{ color: t.textMuted }}>
                          {p.title}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {validPassages.length === 0 && (
                <p className="text-[13px] font-semibold text-center py-4"
                  style={{ color: '#EF4444' }}>
                  No valid passages — go back and fix or add passages
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: t.border, background: t.bgCard }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: t.bgMuted, color: t.textMuted }}>
            {step > 1 ? '← Back' : 'Cancel'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !name.trim() : validPassages.length === 0}
              className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white disabled:opacity-40"
              style={{ background: '#5B4FCF' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || validPassages.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Publish plan 🚀'}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────
//  Plan list table
// ─────────────────────────────────────────────
function PlanRow({ plan, onDelete, t }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const sb = createClient()
      if (!sb) return
      await sb.from('shared_plans').delete().eq('id', plan.id)
      onDelete(plan.id)
    } catch {}
    finally { setDeleting(false) }
  }

  async function toggleStatus() {
    const sb = createClient()
    if (!sb) return
    const newStatus = plan.status === 'active' ? 'archived' : 'active'
    await sb.from('shared_plans').update({ status: newStatus }).eq('id', plan.id)
    onDelete(plan.id) // trigger refresh
  }

  return (
    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
      <td className="py-3 px-4">
        <p className="font-semibold text-[14px]" style={{ color: t.text }}>{plan.name}</p>
        {plan.description && (
          <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: t.textMuted }}>{plan.description}</p>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        <span className="px-2 py-1 rounded-full text-[11px] font-bold"
          style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
          {plan.plan_subtype || 'custom'}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>
          {plan.total_items || plan.duration_days || '?'}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-[13px] font-semibold" style={{ color: t.text }}>
          {plan.member_count || 0}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`px-2 py-1 rounded-full text-[11px] font-bold`}
          style={{
            background: plan.visibility === 'public' ? '#E8F5EE' : '#F3F4F6',
            color:      plan.visibility === 'public' ? '#4A7C5F' : '#6B7280',
          }}>
          {plan.visibility}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`px-2 py-1 rounded-full text-[11px] font-bold`}
          style={{
            background: plan.status === 'active' ? '#E8F5EE' : '#FEE2E2',
            color:      plan.status === 'active' ? '#4A7C5F' : '#EF4444',
          }}>
          {plan.status}
        </span>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={toggleStatus}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
            style={{ borderColor: t.border, color: t.textMuted }}>
            {plan.status === 'active' ? 'Archive' : 'Activate'}
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#FEE2E2' }}>
            {deleting ? <Loader2 size={12} className="animate-spin text-red-500" /> : <Trash2 size={12} style={{ color: '#EF4444' }} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────
//  Main admin plans page
// ─────────────────────────────────────────────
export default function AdminPlansPage() {
  const { t } = useTheme()
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    setLoading(true)
    try {
      const sb = createClient()
      if (!sb) return
      const { data } = await sb
        .from('shared_plans')
        .select('id, name, description, visibility, status, plan_subtype, total_items, duration_days, member_count, created_at, invite_code')
        .order('created_at', { ascending: false })
        .limit(100)
      setPlans(data || [])
    } catch {}
    finally { setLoading(false) }
  }

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.plan_subtype || '').includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[22px]" style={{ color: t.text }}>Reading Plans</h1>
          <p className="text-[13px] mt-0.5" style={{ color: t.textMuted }}>
            {plans.length} plan{plans.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px]"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Plus size={14} /> New plan
        </button>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search plans…"
        className="w-full max-w-sm px-4 py-2.5 rounded-[12px] border text-[14px] focus:outline-none"
        style={{ background: t.bgMuted, borderColor: t.border, color: t.text }} />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: '#5B4FCF' }} />
        </div>
      ) : (
        <div className="rounded-[16px] overflow-hidden"
          style={{ border: `1px solid ${t.border}`, background: t.bgCard }}>
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.bgMuted }}>
                {['Plan name', 'Type', 'Passages', 'Members', 'Visibility', 'Status', ''].map(h => (
                  <th key={h} className="py-2.5 px-3 md:px-4 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: t.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[13px]"
                  style={{ color: t.textFaint }}>
                  No plans yet — create the first one!
                </td></tr>
              ) : (
                filtered.map(plan => (
                  <PlanRow key={plan.id} plan={plan}
                    onDelete={id => { setPlans(prev => prev.filter(p => p.id !== id)); loadPlans() }}
                    t={t} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreatePlanModal
            onClose={() => setShowCreate(false)}
            onCreated={plan => {
              setShowCreate(false)
              loadPlans()
            }}
            t={t} />
        )}
      </AnimatePresence>
    </div>
  )
}