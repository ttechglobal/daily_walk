'use client'

// ── src/app/admin/topical-plans/page.js ──
// Admin page for uploading curated topical Bible plans.
// Writes to the `topical_plans` table (NOT shared_plans).
//
// WORKFLOW:
//   1. Use the Claude converter prompt to turn a raw plan doc → JSON
//   2. Paste the JSON here
//   3. Preview auto-populates from the JSON
//   4. Press Upload — it validates + inserts into Supabase
//   5. Existing plans are listed below — can be deleted

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Trash2, Loader2, Check, X, ChevronDown,
  ChevronUp, BookOpen, AlertCircle, Copy, RefreshCw, Plus,
} from 'lucide-react'
import { useTheme } from '../../../lib/theme'
import { createClient } from '../../../lib/supabase/client'

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function Badge({ children, color = '#5B4FCF', bg = '#EDE9FF' }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: bg, color }}>
      {children}
    </span>
  )
}

function safeParseJSON(str) {
  try { return { data: JSON.parse(str), error: null } }
  catch (e) { return { data: null, error: e.message } }
}

function validatePlan(plan) {
  const errors = []
  if (!plan.id || typeof plan.id !== 'string')
    errors.push('Missing `id` — must be a slug string like "prayer-30-dw"')
  if (plan.id && !/^[a-z0-9-]+$/.test(plan.id))
    errors.push('`id` must be lowercase letters, numbers, and hyphens only')
  if (!plan.title)         errors.push('Missing `title`')
  if (!plan.topic)         errors.push('Missing `topic`')
  if (!plan.description)   errors.push('Missing `description`')
  if (!plan.cover_emoji)   errors.push('Missing `cover_emoji`')
  if (!plan.total_days || plan.total_days < 1)
    errors.push('`total_days` must be a positive integer')
  if (!Array.isArray(plan.days_json) || plan.days_json.length === 0)
    errors.push('`days_json` must be a non-empty array')
  if (Array.isArray(plan.days_json)) {
    plan.days_json.forEach((day, i) => {
      if (!day.day) errors.push(`Day ${i + 1}: missing \`day\` number`)
      if (!day.title) errors.push(`Day ${i + 1}: missing \`title\``)
      if (!Array.isArray(day.passages) || day.passages.length === 0)
        errors.push(`Day ${i + 1}: missing \`passages\` array`)
    })
  }
  return errors
}

// ─────────────────────────────────────────────
//  Plan preview card
// ─────────────────────────────────────────────
function PlanPreview({ plan, t }) {
  const [expanded, setExpanded] = useState(false)
  const shownDays = expanded ? plan.days_json : plan.days_json.slice(0, 3)

  return (
    <div className="rounded-[20px] overflow-hidden"
      style={{ border: `1px solid ${t.border}`, background: t.bgCard }}>

      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b"
        style={{ borderColor: t.border }}>
        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: t.bgMuted }}>
          {plan.cover_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[16px]" style={{ color: t.text }}>{plan.title}</p>
            <Badge>{plan.topic}</Badge>
          </div>
          <p className="text-[13px] mt-0.5 line-clamp-2" style={{ color: t.textMuted }}>
            {plan.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="font-bold text-[18px]" style={{ color: '#5B4FCF' }}>
            {plan.total_days}
          </span>
          <span className="text-[11px]" style={{ color: t.textFaint }}>days</span>
        </div>
      </div>

      {/* Days */}
      <div className="px-5 py-3 flex flex-col gap-2">
        {shownDays.map((day) => (
          <div key={day.day} className="flex items-start gap-3">
            <span className="text-[11px] font-bold w-7 flex-shrink-0 pt-0.5"
              style={{ color: '#5B4FCF' }}>
              D{day.day}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: t.text }}>
                {day.title}
              </p>
              <p className="text-[11px]" style={{ color: t.textFaint }}>
                {day.passages?.map(p =>
                  `${p.book} ${p.chapter}${p.verses ? ':' + p.verses : ''}`
                ).join(' · ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      {plan.days_json.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-3 flex items-center justify-center gap-1.5 border-t text-[12px] font-semibold"
          style={{ borderColor: t.border, color: t.textMuted }}>
          {expanded
            ? <><ChevronUp size={14} /> Show less</>
            : <><ChevronDown size={14} /> Show all {plan.days_json.length} days</>
          }
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Existing plan row
// ─────────────────────────────────────────────
function ExistingPlanRow({ plan, onDelete, t }) {
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${plan.title}"? This cannot be undone and will remove it from all users' libraries.`)) return
    setDeleting(true)
    try {
      const sb = createClient()
      await sb.from('topical_plans').delete().eq('id', plan.id)
      onDelete(plan.id)
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-[16px] overflow-hidden"
      style={{ border: `1px solid ${t.border}`, background: t.bgCard }}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="text-xl flex-shrink-0">{plan.cover_emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[14px] truncate" style={{ color: t.text }}>
              {plan.title}
            </p>
            <Badge>{plan.topic}</Badge>
          </div>
          <p className="text-[11px] font-mono mt-0.5" style={{ color: t.textFaint }}>
            {plan.id} · {plan.total_days} days
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            {expanded
              ? <ChevronUp size={14} style={{ color: t.textMuted }} />
              : <ChevronDown size={14} style={{ color: t.textMuted }} />
            }
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#FEE2E2' }}>
            {deleting
              ? <Loader2 size={13} className="animate-spin" style={{ color: '#EF4444' }} />
              : <Trash2 size={13} style={{ color: '#EF4444' }} />
            }
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t px-4 py-3"
            style={{ borderColor: t.border }}>
            <p className="text-[13px] mb-3" style={{ color: t.textMuted }}>
              {plan.description}
            </p>
            <div className="flex flex-col gap-1.5">
              {(plan.days_json || []).map(day => (
                <div key={day.day} className="flex items-start gap-3">
                  <span className="text-[11px] font-bold w-6 flex-shrink-0 pt-0.5"
                    style={{ color: '#5B4FCF' }}>
                    D{day.day}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: t.text }}>
                      {day.title}
                    </p>
                    <p className="text-[11px]" style={{ color: t.textFaint }}>
                      {day.passages?.map(p =>
                        `${p.book} ${p.chapter}${p.verses ? ':' + p.verses : ''}`
                      ).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export default function TopicalPlansAdminPage() {
  const { t } = useTheme()

  const [jsonInput,    setJsonInput]    = useState('')
  const [parsed,       setParsed]       = useState(null)    // parsed plan object
  const [parseError,   setParseError]   = useState(null)    // JSON parse error
  const [validErrors,  setValidErrors]  = useState([])      // schema validation errors
  const [uploading,    setUploading]    = useState(false)
  const [uploadResult, setUploadResult] = useState(null)    // 'success' | 'duplicate' | Error
  const [existingPlans,setExistingPlans]= useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [promptCopied, setPromptCopied] = useState(false)
  const textareaRef = useRef(null)

  // ── Load existing plans ──
  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    setLoadingPlans(true)
    try {
      const sb = createClient()
      const { data, error } = await sb
        .from('topical_plans')
        .select('id, title, topic, cover_emoji, total_days, description, days_json, created_at')
        .order('created_at', { ascending: false })
      if (!error) setExistingPlans(data || [])
    } catch {}
    finally { setLoadingPlans(false) }
  }

  // ── Parse JSON as user types ──
  function handleJsonChange(val) {
    setJsonInput(val)
    setUploadResult(null)

    if (!val.trim()) {
      setParsed(null); setParseError(null); setValidErrors([]); return
    }

    const { data, error } = safeParseJSON(val.trim())
    if (error) {
      setParsed(null)
      setParseError(error)
      setValidErrors([])
      return
    }

    setParseError(null)
    const errors = validatePlan(data)
    setValidErrors(errors)
    setParsed(errors.length === 0 ? data : null)
  }

  // ── Upload ──
  async function handleUpload() {
    if (!parsed) return
    setUploading(true)
    setUploadResult(null)

    try {
      const sb = createClient()
      if (!sb) throw new Error('Supabase client not available')

      // Check for duplicate ID
      const { data: existing } = await sb
        .from('topical_plans')
        .select('id')
        .eq('id', parsed.id)
        .maybeSingle()

      if (existing) {
        setUploadResult('duplicate')
        setUploading(false)
        return
      }

      const { error } = await sb.from('topical_plans').insert({
        id:          parsed.id,
        title:       parsed.title,
        topic:       parsed.topic,
        author:      parsed.author || 'Daily Walk Team',
        description: parsed.description,
        cover_emoji: parsed.cover_emoji,
        total_days:  parsed.total_days,
        days_json:   parsed.days_json,
      })

      if (error) throw error

      setUploadResult('success')
      setJsonInput('')
      setParsed(null)
      setParseError(null)
      setValidErrors([])
      loadPlans()
    } catch (e) {
      setUploadResult(e)
    } finally {
      setUploading(false)
    }
  }

  // ── Force overwrite (replace existing) ──
  async function handleOverwrite() {
    if (!parsed) return
    setUploading(true)
    setUploadResult(null)

    try {
      const sb = createClient()
      if (!sb) throw new Error('Supabase client not available')

      const { error } = await sb.from('topical_plans').upsert({
        id:          parsed.id,
        title:       parsed.title,
        topic:       parsed.topic,
        author:      parsed.author || 'Daily Walk Team',
        description: parsed.description,
        cover_emoji: parsed.cover_emoji,
        total_days:  parsed.total_days,
        days_json:   parsed.days_json,
      }, { onConflict: 'id' })

      if (error) throw error

      setUploadResult('success')
      setJsonInput('')
      setParsed(null)
      loadPlans()
    } catch (e) {
      setUploadResult(e)
    } finally {
      setUploading(false)
    }
  }

  function handleDeleteExisting(id) {
    setExistingPlans(prev => prev.filter(p => p.id !== id))
  }

  async function copyPrompt() {
    const prompt = buildConverterPrompt()
    await navigator.clipboard.writeText(prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2500)
  }

  const isValid    = parsed !== null && validErrors.length === 0
  const hasContent = jsonInput.trim().length > 0

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-bold text-[22px]" style={{ color: t.text }}>
          Topical Plans
        </h1>
        <p className="text-[13px] mt-1" style={{ color: t.textMuted }}>
          Upload curated Bible reading plans to the public catalog.
          Plans appear in the app immediately after upload.
        </p>
      </div>

      {/* ── Step 1: Get the converter prompt ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: '#5B4FCF' }}>1</div>
          <p className="font-bold text-[15px]" style={{ color: t.text }}>
            Convert your plan with Claude
          </p>
        </div>

        <div className="rounded-[16px] p-4 flex flex-col gap-3"
          style={{ background: '#EDE9FF30', border: '1px solid #5B4FCF30' }}>
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            Got a plan document from a pastor, contributor, or your own notes?
            Copy the prompt below, open a new Claude chat, paste your plan document,
            then paste the prompt. Claude will output the exact JSON you need.
          </p>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold self-start transition-all"
            style={{
              background: promptCopied ? '#22C55E' : '#5B4FCF',
              color: 'white',
            }}>
            {promptCopied
              ? <><Check size={14} /> Prompt copied!</>
              : <><Copy size={14} /> Copy converter prompt</>
            }
          </button>
        </div>
      </section>

      {/* ── Step 2: Paste JSON ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: '#5B4FCF' }}>2</div>
          <p className="font-bold text-[15px]" style={{ color: t.text }}>
            Paste the JSON output
          </p>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={jsonInput}
            onChange={e => handleJsonChange(e.target.value)}
            placeholder={`Paste the JSON from Claude here…\n\n{\n  "id": "prayer-30-dw",\n  "title": "30 Days of Prayer",\n  ...\n}`}
            className="w-full h-48 px-4 py-3.5 rounded-[16px] text-[13px] font-mono focus:outline-none resize-none leading-relaxed"
            style={{
              background:   t.bgCard,
              color:        t.text,
              border:       `1px solid ${
                parseError ? '#EF4444'
                : validErrors.length ? '#F59E0B'
                : isValid ? '#22C55E'
                : t.border
              }`,
            }}
          />
          {hasContent && (
            <button
              onClick={() => handleJsonChange('')}
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: t.bgMuted }}>
              <X size={12} style={{ color: t.textMuted }} />
            </button>
          )}
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px]"
            style={{ background: '#FEE2E220', border: '1px solid #EF444430' }}>
            <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[12px] font-bold" style={{ color: '#EF4444' }}>Invalid JSON</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#EF4444' }}>{parseError}</p>
            </div>
          </div>
        )}

        {/* Validation errors */}
        {validErrors.length > 0 && !parseError && (
          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-[12px]"
            style={{ background: '#FEF3C720', border: '1px solid #F59E0B30' }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#F59E0B' }} />
              <p className="text-[12px] font-bold" style={{ color: '#F59E0B' }}>
                {validErrors.length} issue{validErrors.length > 1 ? 's' : ''} found
              </p>
            </div>
            <ul className="flex flex-col gap-1">
              {validErrors.map((err, i) => (
                <li key={i} className="text-[12px]" style={{ color: '#F59E0B' }}>
                  • {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Valid indicator */}
        {isValid && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
            style={{ background: '#DCFCE720', border: '1px solid #22C55E30' }}>
            <Check size={14} style={{ color: '#22C55E' }} />
            <p className="text-[12px] font-bold" style={{ color: '#22C55E' }}>
              JSON is valid — {parsed.total_days}-day plan ready to upload
            </p>
          </div>
        )}
      </section>

      {/* ── Step 3: Preview ── */}
      {isValid && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{ background: '#5B4FCF' }}>3</div>
            <p className="font-bold text-[15px]" style={{ color: t.text }}>
              Preview & upload
            </p>
          </div>

          <PlanPreview plan={parsed} t={t} />

          {/* Upload result messages */}
          <AnimatePresence>
            {uploadResult === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-[12px]"
                style={{ background: '#DCFCE7', border: '1px solid #22C55E30' }}>
                <Check size={16} style={{ color: '#16A34A' }} />
                <p className="text-[13px] font-bold" style={{ color: '#16A34A' }}>
                  Plan uploaded successfully — it's now live in the app catalog.
                </p>
              </motion.div>
            )}

            {uploadResult === 'duplicate' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3 px-4 py-3 rounded-[12px]"
                style={{ background: '#FEF3C7', border: '1px solid #F59E0B30' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: '#D97706' }}>
                      A plan with id "{parsed?.id}" already exists.
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#D97706' }}>
                      Overwriting will replace all days and metadata for this plan.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOverwrite}
                    disabled={uploading}
                    className="px-4 py-2 rounded-full text-[12px] font-bold text-white"
                    style={{ background: '#D97706' }}>
                    {uploading ? 'Overwriting…' : 'Yes, overwrite it'}
                  </button>
                  <button
                    onClick={() => setUploadResult(null)}
                    className="px-4 py-2 rounded-full text-[12px] font-bold"
                    style={{ background: t.bgMuted, color: t.textMuted }}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {uploadResult instanceof Error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 px-4 py-3 rounded-[12px]"
                style={{ background: '#FEE2E2', border: '1px solid #EF444430' }}>
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#DC2626' }}>Upload failed</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#DC2626' }}>
                    {uploadResult.message}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload button */}
          {uploadResult !== 'success' && uploadResult !== 'duplicate' && (
            <button
              onClick={handleUpload}
              disabled={uploading || !isValid}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
              {uploading
                ? <><Loader2 size={18} className="animate-spin" /> Uploading…</>
                : <><Upload size={18} /> Upload to catalog</>
              }
            </button>
          )}
        </motion.section>
      )}

      {/* ── Existing plans ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-[15px]" style={{ color: t.text }}>
            Existing plans
            <span className="ml-2 text-[13px] font-normal" style={{ color: t.textMuted }}>
              {existingPlans.length} in catalog
            </span>
          </p>
          <button
            onClick={loadPlans}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <RefreshCw size={14} style={{ color: t.textMuted }} />
          </button>
        </div>

        {loadingPlans ? (
          <div className="h-24 rounded-[16px] animate-pulse" style={{ background: t.bgCard }} />
        ) : existingPlans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 rounded-[16px]"
            style={{ border: `1px dashed ${t.border}` }}>
            <BookOpen size={24} style={{ color: t.textFaint }} />
            <p className="text-[13px]" style={{ color: t.textFaint }}>
              No topical plans yet — upload your first one above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {existingPlans.map(plan => (
              <ExistingPlanRow
                key={plan.id}
                plan={plan}
                onDelete={handleDeleteExisting}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Converter prompt string
//  Exported so it can be copied from the button above.
//  Also used by the standalone prompt file.
// ─────────────────────────────────────────────
export function buildConverterPrompt() {
  return `You are converting a Bible reading plan document into a specific JSON format for the Daily Walk app.

The output must be a single valid JSON object — nothing else. No explanation, no markdown fences, no preamble.

Here is the required JSON structure:

{
  "id": "topic-days-dw",
  "title": "Plan Title",
  "topic": "Topic Name",
  "author": "Author Name",
  "description": "Short description shown on the catalog card (1-2 sentences max).",
  "cover_emoji": "🙏",
  "total_days": 30,
  "days_json": [
    {
      "day": 1,
      "title": "Day title — meaningful, not just 'Day 1'",
      "passages": [
        { "book": "Romans", "chapter": 8, "verses": "26-27" },
        { "book": "Matthew", "chapter": 6, "verses": "9-13" }
      ]
    }
  ]
}

Rules:
- "id" must be a URL-safe slug: lowercase, hyphens only, ends in "-dw". Example: "prayer-30-dw", "faith-14-dw"
- "topic" should be a single capitalised word or short phrase: "Prayer", "Faith", "Purity", "God's Word", etc.
- "cover_emoji" should be one emoji that fits the topic
- "total_days" must equal the number of items in "days_json"
- Each day must have a "day" number (integer, 1-indexed), a "title" (meaningful phrase, not just "Day 1"), and a "passages" array
- "passages" items: "book" is the full English book name (e.g. "1 Corinthians", "Song of Solomon"), "chapter" is an integer, "verses" is a string like "1-10" or "3" (omit if the whole chapter)
- All passage references must be KJV-compatible book names
- Day titles must be real, descriptive phrases — not generic labels
- The description must be 1-3 sentences, warm and faith-based in tone

Now convert the following plan document into this JSON format:

[PASTE YOUR PLAN DOCUMENT HERE]`
}