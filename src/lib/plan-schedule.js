// ── src/lib/plan-schedule.js ──
// Core scheduling engine for Daily Walk reading plans.
//
// DESIGN PRINCIPLES:
//   • Pure functions only — no DB, no localStorage, no side effects
//   • Deterministic — same inputs always produce same output
//   • Zero storage — schedule is computed on demand, never persisted
//   • O(1) day lookup via getSliceForDay (offset math, no array iteration)
//
// FREQUENCY MODEL:
//   unit:  'verse'   → slice every N verses from the flat content array
//   unit:  'chapter' → group content by chapter, slice every N chapters
//   count: 1 | 2 | 3 | 5 | 10
//
// CONTENT MODEL:
//   Each item in content[]:
//     { reference: string, book: string, chapter: number, verse?: number, text?: string }
//   For verse-unit plans: verse is present
//   For chapter-unit plans: verse is omitted (each item = one chapter)

// ─────────────────────────────────────────────
//  Types (JSDoc)
// ─────────────────────────────────────────────
/**
 * @typedef {{ unit: 'verse'|'chapter', count: 1|2|3|5|10 }} Frequency
 * @typedef {{ reference: string, book: string, chapter: number, verse?: number, text?: string }} ContentItem
 * @typedef {{ day: number, content: ContentItem[], totalDays: number }} DaySlice
 */

// ─────────────────────────────────────────────
//  Frequency options — single source of truth
// ─────────────────────────────────────────────
export const FREQUENCY_OPTIONS = [
  { id: '1verse',    label: '1 verse/day',    unit: 'verse',   count: 1  },
  { id: '2verses',   label: '2 verses/day',   unit: 'verse',   count: 2  },
  { id: '3verses',   label: '3 verses/day',   unit: 'verse',   count: 3  },
  { id: '5verses',   label: '5 verses/day',   unit: 'verse',   count: 5  },
  { id: '10verses',  label: '10 verses/day',  unit: 'verse',   count: 10 },
  { id: '1chapter',  label: '1 chapter/day',  unit: 'chapter', count: 1  },
  { id: '2chapters', label: '2 chapters/day', unit: 'chapter', count: 2  },
  { id: '3chapters', label: '3 chapters/day', unit: 'chapter', count: 3  },
]

export function getFrequencyById(id) {
  return FREQUENCY_OPTIONS.find(f => f.id === id) || FREQUENCY_OPTIONS[5] // default: 1 chapter/day
}

export function getFrequencyLabel(unit, count) {
  const f = FREQUENCY_OPTIONS.find(f => f.unit === unit && f.count === count)
  return f?.label || `${count} ${unit}${count > 1 ? 's' : ''}/day`
}

// ─────────────────────────────────────────────
//  Core: group content by chapter
//  Used for chapter-unit frequency.
//  Returns array of chapters, each chapter is an array of ContentItems.
// ─────────────────────────────────────────────
function groupByChapter(content) {
  if (!content?.length) return []
  const chapters = []
  let current = null

  for (const item of content) {
    const key = `${item.book}|${item.chapter}`
    if (!current || current.key !== key) {
      current = { key, book: item.book, chapter: item.chapter, items: [] }
      chapters.push(current)
    }
    current.items.push(item)
  }
  return chapters
}

// ─────────────────────────────────────────────
//  Core: compute total days
//  Deterministic — same inputs, same number.
// ─────────────────────────────────────────────
export function computePersonalDays(content, frequency) {
  if (!content?.length || !frequency) return 0
  const { unit, count } = frequency

  if (unit === 'verse') {
    return Math.ceil(content.length / count)
  }

  if (unit === 'chapter') {
    const chapters = groupByChapter(content)
    return Math.ceil(chapters.length / count)
  }

  return 0
}

// ─────────────────────────────────────────────
//  Core: get content slice for a specific day
//  O(1) — no iteration needed, pure offset math.
//  dayNumber is 1-indexed.
//  Returns null if dayNumber is out of range.
// ─────────────────────────────────────────────
export function getSliceForDay(content, frequency, dayNumber) {
  if (!content?.length || !frequency || dayNumber < 1) return null
  const { unit, count } = frequency

  if (unit === 'verse') {
    const start = (dayNumber - 1) * count
    if (start >= content.length) return null
    const slice = content.slice(start, start + count)
    return slice.length ? slice : null
  }

  if (unit === 'chapter') {
    const chapters = groupByChapter(content)
    const startChapter = (dayNumber - 1) * count
    if (startChapter >= chapters.length) return null
    const chapterSlice = chapters.slice(startChapter, startChapter + count)
    const flat = chapterSlice.flatMap(ch => ch.items)
    return flat.length ? flat : null
  }

  return null
}

// ─────────────────────────────────────────────
//  Core: get today's day number for a member
//  Based on: start_date + days already completed
//  Returns the current_day as stored in plan_members.
//  This is just a display helper — the source of truth is DB current_day.
// ─────────────────────────────────────────────
export function getCurrentDayFromDate(startDate, completedDays = 0) {
  if (!startDate) return 1
  const start = new Date(startDate)
  const now   = new Date()
  const elapsed = Math.floor((now - start) / 86400000) // days since start
  // Day is whichever is smaller: elapsed+1 or completedDays+1
  // We use DB current_day as the authoritative value — this is only for display estimation
  return Math.max(1, Math.min(elapsed + 1, completedDays + 1))
}

// ─────────────────────────────────────────────
//  Reference formatter
//  Takes a slice of ContentItems and returns a readable reference string.
//  Examples:
//    [Proverbs 1:1] → "Proverbs 1:1"
//    [Proverbs 1:1, Proverbs 1:2, Proverbs 1:3] → "Proverbs 1:1–3"
//    [Proverbs 31:30, Proverbs 31:31] → "Proverbs 31:30–31"
//    [John 3:16, John 3:17] → "John 3:16–17"
//    [John 3:36, John 4:1] → "John 3:36 – 4:1"  (cross-chapter)
// ─────────────────────────────────────────────
export function formatSliceReference(slice) {
  if (!slice?.length) return ''
  if (slice.length === 1) return slice[0].reference

  const first = slice[0]
  const last  = slice[slice.length - 1]

  // Chapter-level items (no verse)
  if (first.verse == null) {
    if (first.book === last.book) {
      if (first.chapter === last.chapter) return `${first.book} ${first.chapter}`
      return `${first.book} ${first.chapter}–${last.chapter}`
    }
    return `${first.book} ${first.chapter} – ${last.book} ${last.chapter}`
  }

  // Verse-level items
  if (first.book === last.book) {
    if (first.chapter === last.chapter) {
      if (first.verse === last.verse) return `${first.book} ${first.chapter}:${first.verse}`
      return `${first.book} ${first.chapter}:${first.verse}–${last.verse}`
    }
    return `${first.book} ${first.chapter}:${first.verse} – ${last.chapter}:${last.verse}`
  }
  return `${first.book} ${first.chapter}:${first.verse} – ${last.book} ${last.chapter}:${last.verse}`
}

// ─────────────────────────────────────────────
//  Mixed plan builder
//  Takes 2–3 sources (each is a content array).
//  Interleaves them on alternating days:
//    Day 1 → source[0], Day 2 → source[1], Day 3 → source[2], Day 4 → source[0]...
//  The frequency applies equally to all sources.
//  Each source is consumed independently — no source is skipped.
//  Returns a flat merged content array with a sourceIndex tag on each item.
//  This merged content is stored in shared_plans.content.
// ─────────────────────────────────────────────
export function buildMixedContent(sources) {
  // sources: Array<{ items: ContentItem[], label: string }>
  if (!sources?.length) return []

  // Tag each item with its source index
  const tagged = sources.map((src, idx) =>
    (src.items || []).map(item => ({ ...item, sourceIndex: idx, sourceLabel: src.label }))
  )

  const result  = []
  const indices = new Array(tagged.length).fill(0) // current position in each source
  let sourcePtr = 0 // which source to read from next

  // Keep cycling through sources, taking one "day unit" at a time
  // We don't know frequency here — just interleave items one-by-one
  // The frequency slicing happens at read time via getSliceForDay
  // So here we just interleave whole chapters (for chapter plans) or
  // individual verses (for verse plans) in round-robin order

  // Strategy: flatten each source, then round-robin item by item
  // The frequency will then group them naturally into days
  const totalItems = tagged.reduce((sum, src) => sum + src.length, 0)

  while (result.length < totalItems) {
    let advanced = false
    for (let attempt = 0; attempt < tagged.length; attempt++) {
      const src = tagged[sourcePtr]
      const idx = indices[sourcePtr]
      if (idx < src.length) {
        result.push(src[idx])
        indices[sourcePtr]++
        advanced = true
      }
      sourcePtr = (sourcePtr + 1) % tagged.length
      if (advanced) break
    }
    if (!advanced) break // all sources exhausted
  }

  return result
}

// ─────────────────────────────────────────────
//  Content builders from reading-data structures
//  These turn book/topic/character data into the
//  flat ContentItem[] array stored in shared_plans.content
// ─────────────────────────────────────────────

/**
 * Build content array from selected Bible books (chapter-unit).
 * Each item represents one chapter.
 * @param {Array<{name:string, chapters:number}>} books
 * @returns {ContentItem[]}
 */
export function buildBookContent(books) {
  const content = []
  for (const book of books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      content.push({
        reference: `${book.name} ${ch}`,
        book:      book.name,
        chapter:   ch,
        // verse omitted — chapter-level item
      })
    }
  }
  return content
}

/**
 * Build content array from a topic's passages (verse-unit).
 * Each item represents one passage reference (treated as a verse-level item).
 * @param {Array<{ref:string, title?:string}>} passages
 * @returns {ContentItem[]}
 */
export function buildTopicalContent(passages) {
  return (passages || []).map(p => {
    // Parse "Book Chapter:Verse" or "Book Chapter"
    const refStr = p.ref || p.reference || ''
    const match  = refStr.match(/^(.+?)\s+(\d+)(?::(\d+))?$/)
    return {
      reference: refStr,
      book:      match?.[1] || refStr,
      chapter:   parseInt(match?.[2]) || 1,
      verse:     match?.[3] ? parseInt(match[3]) : undefined,
      title:     p.title || refStr,
    }
  })
}

/**
 * Build content from a community plan paste.
 * Accepts lines like "Genesis 1", "John 3:16", "Psalm 23:1-6"
 * @param {string} rawText
 * @returns {ContentItem[]}
 */
export function buildCommunityContent(rawText) {
  if (!rawText?.trim()) return []
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    const match = line.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
    if (!match) return { reference: line, book: line, chapter: 1 }
    return {
      reference: line,
      book:      match[1].trim(),
      chapter:   parseInt(match[2]),
      verse:     match[3] ? parseInt(match[3]) : undefined,
      verseEnd:  match[4] ? parseInt(match[4]) : undefined,
    }
  })
}

// ─────────────────────────────────────────────
//  Duration preview helper
//  Used in the UI to show "X days" before creating the plan.
//  @param {ContentItem[]} content
//  @param {Frequency} frequency
//  @returns {string}  e.g. "31 days"
// ─────────────────────────────────────────────
export function getDurationPreview(content, frequency) {
  if (!content?.length || !frequency) return '—'
  const days = computePersonalDays(content, frequency)
  if (!days) return '—'
  if (days === 1) return '1 day'
  if (days < 7)   return `${days} days`
  const weeks = Math.round(days / 7)
  if (days % 7 === 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  return `${days} days (~${weeks} ${weeks === 1 ? 'week' : 'weeks'})`
}

// ─────────────────────────────────────────────
//  Completion % helper
// ─────────────────────────────────────────────
export function getCompletionPct(currentDay, personalDays) {
  if (!personalDays || personalDays <= 0) return 0
  return Math.min(100, Math.round(((currentDay - 1) / personalDays) * 100))
}