// ── lib/bible.js ──
//
// SOURCE MAP (exactly as specified):
//
//  YouVersion SDK  — NIV11, ESV, BSB, NASB, CSB, AMP  (downloadable + offline)
//  API.Bible       — NLT, Good News (GNT), The Message (MSG)  (online only, no download)
//  bible-api.com   — KJV  (free, no download button, but fetches are cached)
//
// DEFAULT: NIV11 (YouVersion id:111) — downloadable, works offline
// FALLBACK: if any version fails → silently retry with NIV11

// ─────────────────────────────────────────────
//  Version registry
// ─────────────────────────────────────────────

export const DEFAULT_VERSION_ID   = 111    // NIV11 — YouVersion
export const DEFAULT_ABBR         = 'NIV11'

// YouVersion — downloadable, fully offline after download
export const YV_VERSIONS = [
  { id: 111,  abbreviation: 'NIV11', name: 'New International Version',      downloadable: true,  source: 'youversion' },
  { id: 59,   abbreviation: 'ESV',   name: 'English Standard Version',       downloadable: true,  source: 'youversion' },
  { id: 3034, abbreviation: 'BSB',   name: 'Berean Standard Bible',          downloadable: true,  source: 'youversion' },
  { id: 37,   abbreviation: 'NASB',  name: 'New American Standard Bible',    downloadable: true,  source: 'youversion' },
  { id: 2016, abbreviation: 'CSB',   name: 'Christian Standard Bible',       downloadable: true,  source: 'youversion' },
  { id: 1,    abbreviation: 'AMP',   name: 'Amplified Bible',                downloadable: true,  source: 'youversion' },
]

// API.Bible — online only, no download button
// Correct Bible IDs from API.Bible docs
export const APIBIBLE_VERSIONS = [
  { bibleId: '65eec8e0b60e656b-01', abbreviation: 'NLT',  name: 'New Living Translation',  downloadable: false, source: 'apibible' },
  { bibleId: '9879dbb7cfe39e4d-01', abbreviation: 'GNT',  name: 'Good News Translation',   downloadable: false, source: 'apibible' },
  { bibleId: '65eec8e0b60e656b-02', abbreviation: 'MSG',  name: 'The Message',             downloadable: false, source: 'apibible' },
]

// bible-api.com — free REST, no download, but every fetch is cached
export const BIBLEAPI_VERSIONS = [
  { abbreviation: 'KJV', name: 'King James Version', downloadable: false, source: 'bibleapi' },
]

// Combined list for the UI
export function getAllVersions() {
  return [
    ...YV_VERSIONS,
    ...APIBIBLE_VERSIONS,
    ...BIBLEAPI_VERSIONS,
  ]
}

// ─────────────────────────────────────────────
//  Cache
// ─────────────────────────────────────────────

const cacheKey = (source, id, usfm) =>
  `dw_b_${source}_${String(id).replace(/[^a-zA-Z0-9_-]/g,'_')}_${usfm.replace(/\./g,'_')}`

function readCache(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─────────────────────────────────────────────
//  Resolve version from id or abbreviation
// ─────────────────────────────────────────────

function resolveVersion(v) {
  // Numeric → YouVersion
  if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) {
    const id  = parseInt(v)
    const yv  = YV_VERSIONS.find(x => x.id === id)
    return { type: 'youversion', id, abbreviation: yv?.abbreviation || 'NIV11' }
  }

  // Check API.Bible
  const apib = APIBIBLE_VERSIONS.find(x => x.abbreviation === v || x.bibleId === v)
  if (apib) return { type: 'apibible', bibleId: apib.bibleId, abbreviation: apib.abbreviation }

  // Check bible-api.com
  const bapi = BIBLEAPI_VERSIONS.find(x => x.abbreviation === v)
  if (bapi) return { type: 'bibleapi', abbreviation: bapi.abbreviation }

  // Check YouVersion by abbreviation
  const yv = YV_VERSIONS.find(x => x.abbreviation === v)
  if (yv) return { type: 'youversion', id: yv.id, abbreviation: yv.abbreviation }

  // Default
  return { type: 'youversion', id: DEFAULT_VERSION_ID, abbreviation: DEFAULT_ABBR }
}

// ─────────────────────────────────────────────
//  YouVersion SDK
// ─────────────────────────────────────────────

let _yvClient = null
function getYVClient() {
  if (_yvClient) return _yvClient
  try {
    const { ApiClient, BibleClient } = require('@youversion/platform-core')
    const appKey = process.env.NEXT_PUBLIC_YOUVERSION_APP_KEY
    if (!appKey) return null
    _yvClient = new BibleClient(new ApiClient({ appKey }))
    return _yvClient
  } catch { return null }
}

async function fetchYouVersion(id, usfm) {
  const client = getYVClient()
  if (!client) throw new Error('YouVersion SDK not configured')
  const passage = await client.getPassage(id, usfm, 'html')
  const verses  = parseYVHtml(passage.content || '')
  return {
    usfm,
    reference: passage.reference || usfm,
    content:   passage.content   || '',
    verses,
    source: 'youversion',
  }
}

function parseYVHtml(html) {
  if (!html) return []
  const verses = []
  const parts  = html.split(/<span[^>]*class="[^"]*yv-vlbl[^"]*"[^>]*>/)
  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(/^(\d+)<\/span>(.*)$/s)
    if (!m) continue
    const text = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
    if (text) verses.push({ number: parseInt(m[1]), text })
  }
  if (!verses.length && html) {
    const plain = html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
    if (plain) verses.push({ number: 0, text: plain })
  }
  return verses
}

// ─────────────────────────────────────────────
//  API.Bible (rest.api.bible)
// ─────────────────────────────────────────────

const APIBIBLE_BASE = 'https://rest.api.bible/v1'

function getApiBibleKey() {
  return process.env.NEXT_PUBLIC_API_BIBLE_KEY || null
}

async function fetchApiBible(bibleId, usfm) {
  const apiKey = getApiBibleKey()
  if (!apiKey) throw new Error('API.Bible key not set (NEXT_PUBLIC_API_BIBLE_KEY)')

  // Chapters: GEN.1  →  /chapters/GEN.1
  // Passages: GEN.1.1-5  →  /passages/GEN.1.1-GEN.1.5
  const isChapter = /^[A-Z0-9]+\.\d+$/.test(usfm)
  const endpoint  = isChapter
    ? `${APIBIBLE_BASE}/bibles/${bibleId}/chapters/${usfm}`
    : `${APIBIBLE_BASE}/bibles/${bibleId}/passages/${usfm}`

  const params = new URLSearchParams({
    'content-type':            'text',
    'include-notes':           'false',
    'include-titles':          'false',
    'include-chapter-numbers': 'false',
    'include-verse-numbers':   'true',
    'include-verse-spans':     'false',
  })

  const res = await fetch(`${endpoint}?${params}`, {
    headers: { 'api-key': apiKey },
  })

  if (!res.ok) throw new Error(`API.Bible HTTP ${res.status}`)

  const data    = await res.json()
  const content = data?.data?.content   || ''
  const ref     = data?.data?.reference || usfm
  const verses  = parseApiBibleText(content)

  return { usfm, reference: ref, content, verses, source: 'apibible' }
}

function parseApiBibleText(text) {
  if (!text) return []
  const clean = text.replace(/¶\s*/g, '').trim()
  const parts = clean.split(/(?=\[\d+\])/)
  if (parts.length > 1) {
    return parts
      .map(p => {
        const m = p.match(/^\[(\d+)\]\s*(.+)$/s)
        return m ? { number: parseInt(m[1]), text: m[2].replace(/\n+/g,' ').trim() } : null
      })
      .filter(Boolean)
  }
  return clean ? [{ number: 0, text: clean }] : []
}

// ─────────────────────────────────────────────
//  bible-api.com (KJV only)
// ─────────────────────────────────────────────

async function fetchBibleApiCom(usfm) {
  // bible-api.com uses format like "john+3:16" or "john+3"
  // Convert USFM to their format
  const ref = usfmToHumanRef(usfm)
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`bible-api.com HTTP ${res.status}`)
  const data   = await res.json()
  const verses = (data.verses || []).map(v => ({
    number: v.verse,
    text:   v.text.trim().replace(/\n/g,' '),
  }))
  // If no verse breakdown, use the whole text
  if (!verses.length && data.text) {
    verses.push({ number: 0, text: data.text.trim() })
  }
  return {
    usfm,
    reference: data.reference || ref,
    content:   data.text || '',
    verses,
    source: 'bibleapi',
  }
}

// Convert "JHN.3" → "john 3" or "JHN.3.16" → "john 3:16"
function usfmToHumanRef(usfm) {
  const parts  = usfm.split('.')
  const bookId = parts[0]
  const book   = BIBLE_BOOK_LIST.find(b => b.id === bookId)
  const name   = book?.name || bookId
  if (parts.length === 2) return `${name} ${parts[1]}`
  if (parts.length >= 3)  return `${name} ${parts[1]}:${parts[2]}`
  return name
}

// ─────────────────────────────────────────────
//  getPassage — main entry point
// ─────────────────────────────────────────────

export async function getPassage(ref, versionIdOrAbbr = DEFAULT_VERSION_ID) {
  const usfm    = passageToUsfm(ref)
  if (!usfm) return { error: `Cannot parse: "${ref}"`, verses: [], content: '' }

  const version = resolveVersion(versionIdOrAbbr)
  const ck      = cacheKey(version.type, version.bibleId || version.id || version.abbreviation, usfm)

  // Cache first — never hit API twice for the same passage
  const cached = readCache(ck)
  if (cached) return { ...cached, fromCache: true }

  // Offline — only YouVersion downloaded versions work
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  if (offline) return { error: 'offline', offline: true, verses: [], content: '' }

  // Fetch
  try {
    let result
    if (version.type === 'youversion') {
      result = await fetchYouVersion(version.id, usfm)
    } else if (version.type === 'apibible') {
      result = await fetchApiBible(version.bibleId, usfm)
    } else {
      result = await fetchBibleApiCom(usfm)
    }
    writeCache(ck, result)
    return { ...result, fromCache: false }
  } catch (err) {
    // Fallback → NIV11 (YouVersion), unless that's already what we tried
    const isAlreadyDefault = version.type === 'youversion' && version.id === DEFAULT_VERSION_ID
    if (!isAlreadyDefault) {
      try {
        const defaultCk = cacheKey('youversion', DEFAULT_VERSION_ID, usfm)
        const defaultCached = readCache(defaultCk)
        if (defaultCached) return { ...defaultCached, fromCache: true, isFallback: true }
        const fallback = await fetchYouVersion(DEFAULT_VERSION_ID, usfm)
        writeCache(defaultCk, fallback)
        return { ...fallback, fromCache: false, isFallback: true }
      } catch { /* fallback also failed */ }
    }
    return { error: err.message, offline: false, verses: [], content: '' }
  }
}

export async function getChapter(versionIdOrAbbr, book, chapter) {
  const bookId = normaliseBookId(book)
  const usfm   = `${bookId}.${chapter}`
  return getPassage(usfm, versionIdOrAbbr)
}

// ─────────────────────────────────────────────
//  USFM converter
// ─────────────────────────────────────────────

export function passageToUsfm(ref) {
  if (!ref) return null
  ref = ref.trim()
  if (/^[A-Z0-9]{2,3}\.\d/.test(ref)) return ref  // already USFM
  const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
  if (!m) return null
  const bookId = normaliseBookId(m[1].trim())
  if (!bookId) return null
  const ch = m[2]
  if (!m[3]) return `${bookId}.${ch}`
  if (!m[4]) return `${bookId}.${ch}.${m[3]}`
  return `${bookId}.${ch}.${m[3]}-${m[4]}`
}

// ─────────────────────────────────────────────
//  Versions list for picker
// ─────────────────────────────────────────────

export async function getAvailableVersions() {
  return getAllVersions()
}

// ─────────────────────────────────────────────
//  Download (YouVersion only)
// ─────────────────────────────────────────────

export async function downloadVersion(versionIdOrAbbr, onProgress) {
  const version = resolveVersion(versionIdOrAbbr)
  if (version.type !== 'youversion') {
    throw new Error('Only YouVersion translations can be downloaded for offline use')
  }
  const { startBackgroundDownload } = await import('./downloadManager')
  async function fetchChapter(vid, bookName, chapter) {
    const bookId = normaliseBookId(bookName)
    const usfm   = `${bookId}.${chapter}`
    const ck     = cacheKey('youversion', vid, usfm)
    if (readCache(ck)) return
    await getPassage(usfm, vid)
  }
  if (onProgress) {
    const total = BIBLE_BOOK_LIST.reduce((s, b) => s + b.chapters, 0)
    let done = 0
    for (const book of BIBLE_BOOK_LIST) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        await fetchChapter(version.id, book.name, ch).catch(() => null)
        done++
        onProgress(done, total, book.name, ch)
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    writeCache(`dw_dl_${version.id}`, true)
  } else {
    await startBackgroundDownload(version.id, fetchChapter, BIBLE_BOOK_LIST)
  }
}

export function isVersionDownloaded(versionIdOrAbbr) {
  const version = resolveVersion(versionIdOrAbbr)
  if (version.type !== 'youversion') return false
  try { return localStorage.getItem(`dw_dl_${version.id}`) === 'true' } catch { return false }
}

export function isPassageCached(ref, versionIdOrAbbr = DEFAULT_VERSION_ID) {
  const usfm    = passageToUsfm(ref)
  if (!usfm) return false
  const version = resolveVersion(versionIdOrAbbr)
  const ck      = cacheKey(version.type, version.bibleId || version.id || version.abbreviation, usfm)
  return !!readCache(ck)
}

export async function prefetchPlanPassages(days, versionIdOrAbbr = DEFAULT_VERSION_ID) {
  for (const day of (days || [])) {
    if (!day.passage || isPassageCached(day.passage, versionIdOrAbbr)) continue
    await getPassage(day.passage, versionIdOrAbbr).catch(() => null)
    await new Promise(r => setTimeout(r, 500))
  }
}

export async function seedDefaultVersionIfNeeded() {}
export const seedKJVIfNeeded = seedDefaultVersionIfNeeded

// ─────────────────────────────────────────────
//  User preferences
// ─────────────────────────────────────────────

export function getPreferredVersionId() {
  try {
    const v = localStorage.getItem('dw_yv_version')
    if (!v) return DEFAULT_VERSION_ID
    if (/^\d+$/.test(v)) return parseInt(v)
    return v
  } catch { return DEFAULT_VERSION_ID }
}
export function setPreferredVersionId(id) {
  try { localStorage.setItem('dw_yv_version', String(id)) } catch {}
}
export function getPreferredTranslation() {
  const id = getPreferredVersionId()
  if (typeof id === 'number') return YV_VERSIONS.find(v => v.id === id)?.abbreviation || DEFAULT_ABBR
  return id
}
export function setPreferredTranslation(abbr) { setPreferredVersionId(abbr) }

// ─────────────────────────────────────────────
//  Book normalisation
// ─────────────────────────────────────────────

function normaliseBookId(book) {
  if (!book) return null
  const found = BIBLE_BOOK_LIST.find(b =>
    b.name.toLowerCase()  === book.toLowerCase() ||
    b.id.toLowerCase()    === book.toLowerCase() ||
    b.abbr?.toLowerCase() === book.toLowerCase()
  )
  if (found) return found.id
  return BIBLE_BOOK_LIST.find(b => b.id === book.replace(/\s+/g,'').toUpperCase().slice(0,3))?.id || null
}

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

export function getCacheStats(versionIdOrAbbr = DEFAULT_VERSION_ID) {
  try {
    const v      = resolveVersion(versionIdOrAbbr)
    const prefix = `dw_b_${v.type}_${String(v.bibleId || v.id || v.abbreviation).replace(/[^a-zA-Z0-9_-]/g,'_')}_`
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(prefix)) count++
    }
    return count
  } catch { return 0 }
}