'use client'

// ── src/components/PlanPasteParser.js ──
// Custom plan creation from pasted text or uploaded document.
// Flow:
//   1. User pastes free-form text OR uploads PDF/DOCX/TXT
//   2. parseReferences() extracts Bible references
//   3. Confirmation screen shows extracted days — user can edit/remove
//   4. onConfirm(parsedDays) called with cleaned day array
//
// Handles formats like:
//   "Day 1: Genesis 1"
//   "Genesis 1-3"
//   "Week 1 - John 1:1-18, John 1:19-51"
//   "Monday: Psalms 23, Tuesday: Proverbs 3:5-6"
//   Free prose with Bible references scattered throughout

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, X, Check, ChevronDown, ChevronUp,
  AlertCircle, Plus, Trash2, Loader2,
} from 'lucide-react'
import { useTheme } from '../lib/theme'

// ─────────────────────────────────────────────
//  Bible book aliases — for reference detection
// ─────────────────────────────────────────────
const BOOK_ALIASES = {
  // OT
  gen:'Genesis',genesis:'Genesis',
  exo:'Exodus',ex:'Exodus',exodus:'Exodus',
  lev:'Leviticus',leviticus:'Leviticus',
  num:'Numbers',numbers:'Numbers',
  deu:'Deuteronomy',deut:'Deuteronomy',deuteronomy:'Deuteronomy',
  jos:'Joshua',josh:'Joshua',joshua:'Joshua',
  jdg:'Judges',judg:'Judges',judges:'Judges',
  rut:'Ruth',ruth:'Ruth',
  '1sa':'1 Samuel','1sam':'1 Samuel','1samuel':'1 Samuel',
  '2sa':'2 Samuel','2sam':'2 Samuel','2samuel':'2 Samuel',
  '1ki':'1 Kings','1kgs':'1 Kings','1kings':'1 Kings',
  '2ki':'2 Kings','2kgs':'2 Kings','2kings':'2 Kings',
  '1ch':'1 Chronicles','1chr':'1 Chronicles','1chronicles':'1 Chronicles',
  '2ch':'2 Chronicles','2chr':'2 Chronicles','2chronicles':'2 Chronicles',
  ezr:'Ezra',ezra:'Ezra',
  neh:'Nehemiah',nehemiah:'Nehemiah',
  est:'Esther',esther:'Esther',
  job:'Job',
  ps:'Psalms',psa:'Psalms',pss:'Psalms',psalm:'Psalms',psalms:'Psalms',
  pro:'Proverbs',prov:'Proverbs',proverbs:'Proverbs',pr:'Proverbs',
  ecc:'Ecclesiastes',eccl:'Ecclesiastes',ecclesiastes:'Ecclesiastes',
  sng:'Song of Solomon','song':'Song of Solomon','sos':'Song of Solomon',
  isa:'Isaiah',is:'Isaiah',isaiah:'Isaiah',
  jer:'Jeremiah',jeremiah:'Jeremiah',
  lam:'Lamentations',lamentations:'Lamentations',
  ezk:'Ezekiel',eze:'Ezekiel',ezek:'Ezekiel',ezekiel:'Ezekiel',
  dan:'Daniel',da:'Daniel',daniel:'Daniel',
  hos:'Hosea',hosea:'Hosea',
  joel:'Joel',jol:'Joel',
  amo:'Amos',amos:'Amos',
  oba:'Obadiah',obadiah:'Obadiah',
  jon:'Jonah',jonah:'Jonah',
  mic:'Micah',micah:'Micah',
  nam:'Nahum',nahum:'Nahum',
  hab:'Habakkuk',habakkuk:'Habakkuk',
  zep:'Zephaniah',zeph:'Zephaniah',zephaniah:'Zephaniah',
  hag:'Haggai',haggai:'Haggai',
  zec:'Zechariah',zech:'Zechariah',zechariah:'Zechariah',
  mal:'Malachi',malachi:'Malachi',
  // NT
  mat:'Matthew',matt:'Matthew',matthew:'Matthew',mt:'Matthew',
  mrk:'Mark',mark:'Mark',mk:'Mark',
  luk:'Luke',luke:'Luke',lk:'Luke',
  jhn:'John',john:'John',jn:'John',
  act:'Acts',acts:'Acts',
  rom:'Romans',romans:'Romans',ro:'Romans',
  '1co':'1 Corinthians','1cor':'1 Corinthians','1corinthians':'1 Corinthians',
  '2co':'2 Corinthians','2cor':'2 Corinthians','2corinthians':'2 Corinthians',
  gal:'Galatians',galatians:'Galatians',
  eph:'Ephesians',ephesians:'Ephesians',
  php:'Philippians',phil:'Philippians',philippians:'Philippians',
  col:'Colossians',colossians:'Colossians',
  '1th':'1 Thessalonians','1thess':'1 Thessalonians','1thessalonians':'1 Thessalonians',
  '2th':'2 Thessalonians','2thess':'2 Thessalonians','2thessalonians':'2 Thessalonians',
  '1ti':'1 Timothy','1tim':'1 Timothy','1timothy':'1 Timothy',
  '2ti':'2 Timothy','2tim':'2 Timothy','2timothy':'2 Timothy',
  tit:'Titus',titus:'Titus',
  phm:'Philemon',phlm:'Philemon',philemon:'Philemon',
  heb:'Hebrews',hebrews:'Hebrews',he:'Hebrews',
  jas:'James',james:'James',jm:'James',
  '1pe':'1 Peter','1pet':'1 Peter','1pt':'1 Peter','1peter':'1 Peter',
  '2pe':'2 Peter','2pet':'2 Peter','2pt':'2 Peter','2peter':'2 Peter',
  '1jn':'1 John','1john':'1 John',
  '2jn':'2 John','2john':'2 John',
  '3jn':'3 John','3john':'3 John',
  jud:'Jude',jude:'Jude',
  rev:'Revelation',revelation:'Revelation',re:'Revelation',
}

// ─────────────────────────────────────────────
//  parseReferences
//  Extracts Bible references from free text.
//  Returns array of { reference, book, chapter, verse?, verseEnd?, raw }
//  Deduplicates. Preserves order.
// ─────────────────────────────────────────────
const REF_RE = /\b((?:[123](?:st|nd|rd)?|first|second|third)\s*)?([A-Za-z]+)\.?\s+(\d{1,3})(?::(\d{1,3})(?:[–\-](\d{1,3}))?)?(?:\s*[-–]\s*(\d{1,3})(?::(\d{1,3}))?)?\b/gi

export function parseReferences(text) {
  if (!text?.trim()) return []
  const results = []
  const seen    = new Set()

  // Split into lines first — helps with "Day N:" structured plans
  const lines = text.split(/\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect day label: "Day 1:", "Week 1", "Monday:", "January 1:" etc.
    const dayLabel = trimmed.match(/^(?:day|week|session|lesson|date|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\s*\d*\s*[:.\-–]?\s*/i)?.[0]?.trim() || null

    REF_RE.lastIndex = 0
    let m
    while ((m = REF_RE.exec(trimmed)) !== null) {
      const prefix = (m[1] || '').toLowerCase().replace(/st|nd|rd|first|second|third/i, '').trim()
      const bookRaw = (prefix + m[2]).toLowerCase().replace(/[\s.]/g, '')
      const canonical = BOOK_ALIASES[bookRaw]
      if (!canonical) continue

      const chapter  = parseInt(m[3])
      const verse    = m[4] ? parseInt(m[4]) : null
      const verseEnd = m[5] ? parseInt(m[5]) : null
      // Handle "Genesis 1-3" (chapter range)
      const chapterEnd = (!verse && m[6]) ? parseInt(m[6]) : null

      // Build display reference
      let reference = `${canonical} ${chapter}`
      if (verse)      reference += `:${verse}`
      if (verseEnd)   reference += `–${verseEnd}`
      if (chapterEnd) reference += `–${chapterEnd}`

      // Deduplicate
      const key = reference.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      results.push({
        reference,
        book:       canonical,
        chapter,
        chapterEnd: chapterEnd || null,
        verse:      verse || null,
        verseEnd:   verseEnd || null,
        raw:        m[0],
        dayLabel,
      })
    }
  }

  return results
}

// ─────────────────────────────────────────────
//  Group parsed references into days
//  If the text has "Day N:" labels → use those as day boundaries
//  Otherwise → one reference per day (or N per day based on frequency)
// ─────────────────────────────────────────────
export function groupIntoDays(references) {
  if (!references.length) return []

  const hasLabels = references.some(r => r.dayLabel)

  if (hasLabels) {
    // Group by dayLabel
    const groups = {}
    let labelOrder = []
    for (const ref of references) {
      const label = ref.dayLabel || 'ungrouped'
      if (!groups[label]) { groups[label] = []; labelOrder.push(label) }
      groups[label].push(ref.reference)
    }
    return labelOrder.map((label, i) => ({
      day_number:        i + 1,
      passage_reference: groups[label].join(', '),
      title:             label || `Day ${i + 1}`,
      references:        groups[label],
    }))
  }

  // No labels — one reference per day
  return references.map((ref, i) => ({
    day_number:        i + 1,
    passage_reference: ref.reference,
    title:             `Day ${i + 1} — ${ref.reference}`,
    references:        [ref.reference],
  }))
}

// ─────────────────────────────────────────────
//  Read text from uploaded file
//  Supports: .txt, .md, .csv, .pdf (via text extraction)
//  PDF: reads text content only — no OCR
// ─────────────────────────────────────────────
async function readFileAsText(file) {
  const name = file.name.toLowerCase()

  // Plain text files
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = e => resolve(e.target.result)
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsText(file)
    })
  }

  // PDF — extract text using PDF.js (loaded on demand)
  if (name.endsWith('.pdf')) {
    try {
      // Dynamic import of PDF.js — only loads when needed
      const pdfjsLib = await import('pdfjs-dist/build/pdf')
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const arrayBuffer = await file.arrayBuffer()
      const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const textParts   = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i)
        const content = await page.getTextContent()
        const text    = content.items.map(item => item.str).join(' ')
        textParts.push(text)
      }

      return textParts.join('\n')
    } catch {
      throw new Error('Could not extract text from PDF. Try pasting the content instead.')
    }
  }

  // DOCX — basic extraction (reads raw XML, strips tags)
  if (name.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      // Use mammoth for DOCX parsing (loaded on demand)
      const mammoth = await import('mammoth')
      const result  = await mammoth.extractRawText({ arrayBuffer })
      return result.value || ''
    } catch {
      throw new Error('Could not read Word document. Try pasting the content instead.')
    }
  }

  throw new Error(`Unsupported file type. Use .txt, .pdf, or .docx — or just paste your plan.`)
}

// ─────────────────────────────────────────────
//  PlanPasteParser component
//  Props:
//    onConfirm  : (days: ParsedDay[]) => void
//    onCancel   : () => void
// ─────────────────────────────────────────────
export default function PlanPasteParser({ onConfirm, onCancel }) {
  const { t } = useTheme()
  const fileInputRef = useRef(null)

  const [step,        setStep]        = useState('input')   // 'input' | 'review'
  const [rawText,     setRawText]     = useState('')
  const [parsedDays,  setParsedDays]  = useState([])
  const [parsing,     setParsing]     = useState(false)
  const [fileError,   setFileError]   = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)

  // ── Parse ──
  function handleParse() {
    if (!rawText.trim()) return
    setParsing(true)
    setTimeout(() => {
      const refs = parseReferences(rawText)
      const days = groupIntoDays(refs)
      setParsedDays(days)
      setStep(days.length ? 'review' : 'empty')
      setParsing(false)
    }, 50) // yield to render before heavy parse
  }

  // ── File upload ──
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    setParsing(true)
    try {
      const text = await readFileAsText(file)
      setRawText(text)
      const refs = parseReferences(text)
      const days = groupIntoDays(refs)
      setParsedDays(days)
      setStep(days.length ? 'review' : 'empty')
    } catch (err) {
      setFileError(err.message)
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Edit day title ──
  function updateDayTitle(index, title) {
    setParsedDays(prev => prev.map((d, i) => i === index ? { ...d, title } : d))
  }

  // ── Remove day ──
  function removeDay(index) {
    setParsedDays(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.map((d, i) => ({ ...d, day_number: i + 1 }))
    })
  }

  // ── Add empty day ──
  function addDay() {
    setParsedDays(prev => [...prev, {
      day_number: prev.length + 1,
      passage_reference: '',
      title: `Day ${prev.length + 1}`,
      references: [],
    }])
  }

  // ── Update passage ──
  function updatePassage(index, passage) {
    setParsedDays(prev => prev.map((d, i) =>
      i === index ? { ...d, passage_reference: passage, references: [passage] } : d
    ))
  }

  // ─────────────────────────────────────────────
  //  Render: input step
  // ─────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[17px]" style={{ color: t.text }}>Import your plan</p>
            <p className="text-[13px]" style={{ color: t.textMuted }}>
              Paste a plan or upload a document
            </p>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: t.bgMuted }}>
            <X size={16} style={{ color: t.textMuted }} />
          </button>
        </div>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.docx,.csv"
          className="hidden"
          onChange={handleFile}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 px-4 py-4 rounded-[16px] border-2 border-dashed transition-all"
          style={{ borderColor: '#5B4FCF40', background: '#EDE9FF20' }}
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: '#EDE9FF' }}>
            <Upload size={18} style={{ color: '#5B4FCF' }} />
          </div>
          <div className="text-left">
            <p className="font-bold text-[14px]" style={{ color: t.text }}>
              Upload a file
            </p>
            <p className="text-[12px]" style={{ color: t.textFaint }}>
              .txt · .pdf · .docx — we'll extract the readings
            </p>
          </div>
        </button>

        {fileError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px]"
            style={{ background: '#FDECEA' }}>
            <AlertCircle size={14} style={{ color: '#E84060', flexShrink: 0, marginTop: 2 }} />
            <p className="text-[12px]" style={{ color: '#E84060' }}>{fileError}</p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: t.border }} />
          <span className="text-[12px] font-semibold" style={{ color: t.textFaint }}>or paste below</span>
          <div className="flex-1 h-px" style={{ background: t.border }} />
        </div>

        {/* Paste area */}
        <div className="flex flex-col gap-2">
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Paste your reading plan here. Any format works:\n\nDay 1: Genesis 1\nDay 2: Genesis 2-3\n\nor free text:\n\nWeek 1 — Start with John 1:1-18, then read Psalm 1...`}
            rows={10}
            className="w-full resize-none rounded-[14px] px-4 py-3 text-[13px] leading-relaxed focus:outline-none"
            style={{
              background:  t.bgInput,
              border:      `1.5px solid ${rawText ? '#5B4FCF' : t.borderInput}`,
              color:       t.text,
              fontFamily:  'monospace',
            }}
          />
        </div>

        {/* Parse button */}
        <button
          onClick={handleParse}
          disabled={!rawText.trim() || parsing}
          className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
        >
          {parsing
            ? <><Loader2 size={18} className="animate-spin" /> Extracting readings…</>
            : <><FileText size={16} /> Extract Bible readings</>
          }
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: empty parse result
  // ─────────────────────────────────────────────
  if (step === 'empty') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle size={36} style={{ color: '#E8A838' }} />
        <div>
          <p className="font-bold text-[16px] mb-1" style={{ color: t.text }}>
            No Bible references found
          </p>
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            We couldn't detect any Bible passages. Try a format like "Genesis 1" or "John 3:16".
          </p>
        </div>
        <button onClick={() => setStep('input')}
          className="px-5 py-2.5 rounded-full font-bold text-[14px]"
          style={{ background: '#EDE9FF', color: '#5B4FCF' }}>
          Try again
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: review step
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[17px]" style={{ color: t.text }}>
            Review your plan
          </p>
          <p className="text-[13px]" style={{ color: t.textMuted }}>
            {parsedDays.length} days found — edit or remove any
          </p>
        </div>
        <button onClick={() => setStep('input')}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{ background: t.bgMuted, color: t.textMuted }}>
          Re-paste
        </button>
      </div>

      {/* Days list */}
      <div className="flex flex-col gap-2 max-h-[50dvh] overflow-y-auto pr-1">
        {parsedDays.map((day, index) => (
          <motion.div
            key={index}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="rounded-[14px] overflow-hidden"
            style={{ border: `1px solid ${t.border}`, background: t.bgCard }}
          >
            {/* Day header row */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-[11px] font-bold w-12 flex-shrink-0"
                style={{ color: '#5B4FCF' }}>
                Day {day.day_number}
              </span>

              {expandedDay === index ? (
                <input
                  value={day.passage_reference}
                  onChange={e => updatePassage(index, e.target.value)}
                  className="flex-1 text-[13px] font-semibold focus:outline-none bg-transparent"
                  style={{ color: t.text }}
                />
              ) : (
                <span className="flex-1 text-[13px] font-semibold truncate" style={{ color: t.text }}>
                  {day.passage_reference || <span style={{ color: t.textFaint }}>No passage</span>}
                </span>
              )}

              <button onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                {expandedDay === index
                  ? <ChevronUp size={14} style={{ color: t.textFaint }} />
                  : <ChevronDown size={14} style={{ color: t.textFaint }} />
                }
              </button>
              <button onClick={() => removeDay(index)}
                className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Trash2 size={13} style={{ color: '#E84060' }} />
              </button>
            </div>

            {/* Expanded: edit title */}
            <AnimatePresence>
              {expandedDay === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-3 pb-3"
                >
                  <input
                    value={day.title}
                    onChange={e => updateDayTitle(index, e.target.value)}
                    placeholder="Day title (optional)"
                    className="w-full text-[12px] px-3 py-2 rounded-[10px] focus:outline-none"
                    style={{
                      background:  t.bgInput,
                      border:      `1px solid ${t.borderInput}`,
                      color:       t.text,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Add day */}
        <button
          onClick={addDay}
          className="flex items-center justify-center gap-2 py-3 rounded-[14px] border-2 border-dashed transition-all"
          style={{ borderColor: t.border, color: t.textFaint }}
        >
          <Plus size={14} />
          <span className="text-[13px] font-semibold">Add a day</span>
        </button>
      </div>

      {/* Confirm */}
      <button
        onClick={() => onConfirm(parsedDays.filter(d => d.passage_reference?.trim()))}
        disabled={!parsedDays.some(d => d.passage_reference?.trim())}
        className="w-full py-4 rounded-full text-white font-bold text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
      >
        <Check size={18} />
        Use this plan ({parsedDays.filter(d => d.passage_reference?.trim()).length} days)
      </button>
    </div>
  )
}