// ── lib/bible.js — YouVersion Platform SDK ──
// SDK: @youversion/platform-core
// Docs: https://developers.youversion.com/sdks/javascript
//
// Setup: npm install @youversion/platform-core
// Get App Key: https://platform.youversion.com/
// Add to .env.local: NEXT_PUBLIC_YOUVERSION_APP_KEY=your_key
//
// Version IDs are numeric. KJV = 1, BSB = 3034.
// All passages cached in localStorage permanently (offline-first).
// USFM format: "JHN.3.16", "GEN.1", "ROM.8.28-39"

export const DEFAULT_VERSION_ID = 3034     // BSB — Berean Standard Bible (confirmed available)
export const DEFAULT_VERSION_NAME = 'BSB'
// NOTE: Change to 1 for KJV if your YouVersion app has KJV licensed

// ─────────────────────────────────────────────
//  SDK client — lazy initialised once
// ─────────────────────────────────────────────

let _bibleClient = null

function getBibleClient() {
  if (_bibleClient) return _bibleClient
  try {
    const { ApiClient, BibleClient } = require('@youversion/platform-core')
    const appKey = process.env.NEXT_PUBLIC_YOUVERSION_APP_KEY
    if (!appKey) throw new Error('NEXT_PUBLIC_YOUVERSION_APP_KEY not set')
    const apiClient = new ApiClient({ appKey })
    _bibleClient = new BibleClient(apiClient)
    return _bibleClient
  } catch (e) {
    console.warn('[Bible] SDK init failed:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────
//  Cache helpers
// ─────────────────────────────────────────────

const passageCacheKey = (versionId, usfm) =>
  `dw_yv_${versionId}_${usfm.replace(/\./g, '_')}`
const versionsCacheKey = () => 'dw_yv_versions'

function readCache(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─────────────────────────────────────────────
//  Passage → USFM converter
//  "John 3:16"     → "JHN.3.16"
//  "Romans 8:28-39" → "ROM.8.28-39"
//  "Genesis 1"     → "GEN.1"
// ─────────────────────────────────────────────

export function passageToUsfm(ref) {
  if (!ref) return null
  ref = ref.trim()

  // Already looks like USFM (e.g. "JHN.3.16")
  if (/^[A-Z0-9]{2,3}\.\d/.test(ref)) return ref

  const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
  if (!m) return null

  const bookId = normaliseBookId(m[1].trim())
  if (!bookId) return null

  const ch = m[2]
  if (!m[3]) return `${bookId}.${ch}`                         // whole chapter
  if (!m[4]) return `${bookId}.${ch}.${m[3]}`                 // single verse
  return `${bookId}.${ch}.${m[3]}-${m[4]}`                    // verse range
}

// ─────────────────────────────────────────────
//  Get English versions
// ─────────────────────────────────────────────

export async function getAvailableVersions() {
  const cached = readCache(versionsCacheKey())
  if (cached) return cached

  const client = getBibleClient()
  if (!client) return FALLBACK_VERSIONS

  try {
    const res     = await client.getVersions('en*')
    const versions = (res.data || []).map(v => ({
      id:           v.id,
      name:         v.title,
      abbreviation: v.abbreviation,
      copyright:    v.copyright || '',
    }))
    writeCache(versionsCacheKey(), versions)
    return versions
  } catch (e) {
    console.warn('[Bible] getVersions failed:', e.message)
    return FALLBACK_VERSIONS
  }
}

// ─────────────────────────────────────────────
//  Get passage — cache first, then SDK
// ─────────────────────────────────────────────

export async function getPassage(ref, versionId = DEFAULT_VERSION_ID) {
  const usfm = passageToUsfm(ref)
  if (!usfm) return { error: `Cannot parse passage: "${ref}"`, verses: [], content: '' }

  const key    = passageCacheKey(versionId, usfm)
  const cached = readCache(key)
  if (cached) return { ...cached, fromCache: true }

  const client = getBibleClient()
  if (!client) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    return { error: 'YouVersion SDK not initialised — check NEXT_PUBLIC_YOUVERSION_APP_KEY', offline: isOffline, verses: [], content: '' }
  }

  try {
    const passage = await client.getPassage(versionId, usfm, 'text')
    const result  = {
      usfm,
      versionId,
      reference: passage.reference || ref,
      content:   passage.content   || '',
      // Split content into verse-like chunks for display
      verses:    parseContentToVerses(passage.content || '', usfm),
    }
    writeCache(key, result)
    return { ...result, fromCache: false }
  } catch (err) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    return { error: err.message, offline: isOffline, verses: [], content: '' }
  }
}

// Get a full chapter
export async function getChapter(versionId, book, chapter) {
  const bookId = normaliseBookId(book)
  const usfm   = `${bookId}.${chapter}`
  return getPassage(usfm, versionId)
}

// ─────────────────────────────────────────────
//  Parse plain text content into verse objects
//  The SDK returns plain text — we split on verse numbers
// ─────────────────────────────────────────────

function parseContentToVerses(content, usfm) {
  if (!content) return []

  // Try to split on verse numbers: "1 In the beginning... 2 And the..."
  const parts = content.split(/(?=\b\d{1,3}\s+[A-Z])/)
  if (parts.length > 1) {
    return parts.map(p => {
      const m = p.match(/^(\d+)\s+(.+)/)
      if (m) return { number: parseInt(m[1]), text: m[2].trim() }
      return { number: 0, text: p.trim() }
    }).filter(v => v.text)
  }

  // Fallback: return as single block
  return [{ number: 0, text: content.trim() }]
}

// ─────────────────────────────────────────────
//  Pre-fetch passages for a plan (offline prep)
// ─────────────────────────────────────────────

export async function prefetchPlanPassages(days, versionId = DEFAULT_VERSION_ID) {
  for (const day of (days || [])) {
    if (!day.passage) continue
    const usfm = passageToUsfm(day.passage)
    if (!usfm) continue
    const key = passageCacheKey(versionId, usfm)
    if (readCache(key)) continue  // already cached
    await getPassage(day.passage, versionId).catch(() => null)
    await new Promise(r => setTimeout(r, 80))
  }
}

// ─────────────────────────────────────────────
//  Cache utilities
// ─────────────────────────────────────────────

export function isPassageCached(ref, versionId = DEFAULT_VERSION_ID) {
  const usfm = passageToUsfm(ref)
  if (!usfm) return false
  return !!readCache(passageCacheKey(versionId, usfm))
}

export function getCacheStats(versionId = DEFAULT_VERSION_ID) {
  try {
    const prefix = `dw_yv_${versionId}_`
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(prefix)) count++
    }
    return count
  } catch { return 0 }
}

// Download full version for offline — seeds all 1,189 chapters
export async function downloadVersion(versionId, onProgress) {
  const total = BIBLE_BOOK_LIST.reduce((s, b) => s + b.chapters, 0)
  let done = 0
  for (const book of BIBLE_BOOK_LIST) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const usfm = `${book.id}.${ch}`
      const key  = passageCacheKey(versionId, usfm)
      if (!readCache(key)) {
        await getPassage(usfm, versionId).catch(() => null)
      }
      done++
      if (onProgress) onProgress(done, total, book.name, ch)
      await new Promise(r => setTimeout(r, 80))
    }
  }
  writeCache(`dw_yv_downloaded_${versionId}`, true)
}

export function isVersionDownloaded(versionId) {
  return !!readCache(`dw_yv_downloaded_${versionId}`)
}

// Seed KJV on first open (background)
export async function seedDefaultVersionIfNeeded() {
  if (typeof window === 'undefined') return
  if (readCache('dw_yv_seeded')) return
  writeCache('dw_yv_seeded', true)
  downloadVersion(DEFAULT_VERSION_ID).catch(() => null)
}
// Legacy alias
export const seedKJVIfNeeded = seedDefaultVersionIfNeeded

// ─────────────────────────────────────────────
//  User preferences
// ─────────────────────────────────────────────

export function getPreferredVersionId() {
  try {
    const v = localStorage.getItem('dw_yv_version')
    return v ? parseInt(v) : DEFAULT_VERSION_ID
  } catch { return DEFAULT_VERSION_ID }
}
export function setPreferredVersionId(id) {
  try { localStorage.setItem('dw_yv_version', String(id)) } catch {}
}

// Legacy string-based helpers used elsewhere
export function getPreferredTranslation() {
  const id = getPreferredVersionId()
  const found = FALLBACK_VERSIONS.find(v => v.id === id)
  return found?.abbreviation || 'KJV'
}
export function setPreferredTranslation(abbr) {
  const found = FALLBACK_VERSIONS.find(v => v.abbreviation === abbr)
  if (found) setPreferredVersionId(found.id)
}

// ─────────────────────────────────────────────
//  Book list with USFM IDs
// ─────────────────────────────────────────────

function normaliseBookId(book) {
  if (!book) return null
  const found = BIBLE_BOOK_LIST.find(b =>
    b.name.toLowerCase()   === book.toLowerCase() ||
    b.id.toLowerCase()     === book.toLowerCase() ||
    b.abbr?.toLowerCase()  === book.toLowerCase()
  )
  if (found) return found.id
  // Handle numbered books like "1 Cor" → "1CO"
  const short = book.replace(/\s+/g, '').toUpperCase().slice(0, 3)
  return BIBLE_BOOK_LIST.find(b => b.id === short)?.id || null
}

// Fallback English versions shown when offline/SDK not ready
const FALLBACK_VERSIONS = [
  { id:3034, abbreviation:'BSB',  name:'Berean Standard Bible' },
  { id:1,    abbreviation:'KJV',  name:'King James Version' },
  { id:111,  abbreviation:'NIV',  name:'New International Version' },
  { id:59,   abbreviation:'ESV',  name:'English Standard Version' },
  { id:116,  abbreviation:'NLT',  name:'New Living Translation' },
  { id:100,  abbreviation:'MSG',  name:'The Message' },
  { id:2016, abbreviation:'CSB',  name:'Christian Standard Bible' },
  { id:406,  abbreviation:'NCV',  name:'New Century Version' },
  { id:37,   abbreviation:'NASB', name:'New American Standard Bible' },
]

export const BIBLE_BOOK_LIST = [
  {id:'GEN',name:'Genesis',abbr:'Gen',chapters:50},      {id:'EXO',name:'Exodus',abbr:'Exo',chapters:40},
  {id:'LEV',name:'Leviticus',abbr:'Lev',chapters:27},    {id:'NUM',name:'Numbers',abbr:'Num',chapters:36},
  {id:'DEU',name:'Deuteronomy',abbr:'Deu',chapters:34},  {id:'JOS',name:'Joshua',abbr:'Jos',chapters:24},
  {id:'JDG',name:'Judges',abbr:'Jdg',chapters:21},       {id:'RUT',name:'Ruth',abbr:'Rut',chapters:4},
  {id:'1SA',name:'1 Samuel',abbr:'1Sa',chapters:31},     {id:'2SA',name:'2 Samuel',abbr:'2Sa',chapters:24},
  {id:'1KI',name:'1 Kings',abbr:'1Ki',chapters:22},      {id:'2KI',name:'2 Kings',abbr:'2Ki',chapters:25},
  {id:'1CH',name:'1 Chronicles',abbr:'1Ch',chapters:29}, {id:'2CH',name:'2 Chronicles',abbr:'2Ch',chapters:36},
  {id:'EZR',name:'Ezra',abbr:'Ezr',chapters:10},         {id:'NEH',name:'Nehemiah',abbr:'Neh',chapters:13},
  {id:'EST',name:'Esther',abbr:'Est',chapters:10},       {id:'JOB',name:'Job',abbr:'Job',chapters:42},
  {id:'PSA',name:'Psalms',abbr:'Psa',chapters:150},      {id:'PRO',name:'Proverbs',abbr:'Pro',chapters:31},
  {id:'ECC',name:'Ecclesiastes',abbr:'Ecc',chapters:12}, {id:'SNG',name:'Song of Solomon',abbr:'Sng',chapters:8},
  {id:'ISA',name:'Isaiah',abbr:'Isa',chapters:66},       {id:'JER',name:'Jeremiah',abbr:'Jer',chapters:52},
  {id:'LAM',name:'Lamentations',abbr:'Lam',chapters:5},  {id:'EZK',name:'Ezekiel',abbr:'Ezk',chapters:48},
  {id:'DAN',name:'Daniel',abbr:'Dan',chapters:12},       {id:'HOS',name:'Hosea',abbr:'Hos',chapters:14},
  {id:'JOL',name:'Joel',abbr:'Joe',chapters:3},          {id:'AMO',name:'Amos',abbr:'Amo',chapters:9},
  {id:'OBA',name:'Obadiah',abbr:'Oba',chapters:1},       {id:'JON',name:'Jonah',abbr:'Jon',chapters:4},
  {id:'MIC',name:'Micah',abbr:'Mic',chapters:7},         {id:'NAM',name:'Nahum',abbr:'Nam',chapters:3},
  {id:'HAB',name:'Habakkuk',abbr:'Hab',chapters:3},      {id:'ZEP',name:'Zephaniah',abbr:'Zep',chapters:3},
  {id:'HAG',name:'Haggai',abbr:'Hag',chapters:2},        {id:'ZEC',name:'Zechariah',abbr:'Zec',chapters:14},
  {id:'MAL',name:'Malachi',abbr:'Mal',chapters:4},       {id:'MAT',name:'Matthew',abbr:'Mat',chapters:28},
  {id:'MRK',name:'Mark',abbr:'Mrk',chapters:16},         {id:'LUK',name:'Luke',abbr:'Luk',chapters:24},
  {id:'JHN',name:'John',abbr:'Jhn',chapters:21},         {id:'ACT',name:'Acts',abbr:'Act',chapters:28},
  {id:'ROM',name:'Romans',abbr:'Rom',chapters:16},       {id:'1CO',name:'1 Corinthians',abbr:'1Co',chapters:16},
  {id:'2CO',name:'2 Corinthians',abbr:'2Co',chapters:13},{id:'GAL',name:'Galatians',abbr:'Gal',chapters:6},
  {id:'EPH',name:'Ephesians',abbr:'Eph',chapters:6},     {id:'PHP',name:'Philippians',abbr:'Php',chapters:4},
  {id:'COL',name:'Colossians',abbr:'Col',chapters:4},    {id:'1TH',name:'1 Thessalonians',abbr:'1Th',chapters:5},
  {id:'2TH',name:'2 Thessalonians',abbr:'2Th',chapters:3},{id:'1TI',name:'1 Timothy',abbr:'1Ti',chapters:6},
  {id:'2TI',name:'2 Timothy',abbr:'2Ti',chapters:4},    {id:'TIT',name:'Titus',abbr:'Tit',chapters:3},
  {id:'PHM',name:'Philemon',abbr:'Phm',chapters:1},      {id:'HEB',name:'Hebrews',abbr:'Heb',chapters:13},
  {id:'JAS',name:'James',abbr:'Jas',chapters:5},         {id:'1PE',name:'1 Peter',abbr:'1Pe',chapters:5},
  {id:'2PE',name:'2 Peter',abbr:'2Pe',chapters:3},       {id:'1JN',name:'1 John',abbr:'1Jn',chapters:5},
  {id:'2JN',name:'2 John',abbr:'2Jn',chapters:1},        {id:'3JN',name:'3 John',abbr:'3Jn',chapters:1},
  {id:'JUD',name:'Jude',abbr:'Jud',chapters:1},          {id:'REV',name:'Revelation',abbr:'Rev',chapters:22},
]