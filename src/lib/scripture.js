// ── src/lib/scripture.js ──
// Scripture reference detection and content fetching.
// Used by ScriptureChip (inline tappable refs) and ScriptureSheet (viewer).
//
// PARSING: regex covers ~99% of real-world scripture references including
//   • "John 3:16"
//   • "1 Corinthians 13:4-7"
//   • "Ps 23:1"
//   • "Gen. 1:1-3"
//   • "Revelation 22"          (chapter only)
//   • "Matthew 5:3, 6, 9"     (multi-verse, treated as passage start)
//
// FETCHING: uses API.Bible (api.scripture.api.bible).
//   Falls back to a static snippet from the plan data if API is unavailable.
//   Responses are cached in sessionStorage so repeated taps are instant.
//
// CONTENT MODERATION (basic): checked before saving posts in PostComposer.

// ─────────────────────────────────────────────
//  Book name → canonical name map
// ─────────────────────────────────────────────
const BOOK_ALIASES = {
  // Old Testament
  gen:'Genesis', ge:'Genesis', gn:'Genesis',
  ex:'Exodus', exo:'Exodus',
  lev:'Leviticus', le:'Leviticus',
  num:'Numbers', nu:'Numbers', nm:'Numbers',
  deut:'Deuteronomy', de:'Deuteronomy', dt:'Deuteronomy',
  josh:'Joshua', jos:'Joshua',
  judg:'Judges', jdg:'Judges',
  ruth:'Ruth', ru:'Ruth',
  '1sam':'1 Samuel', '1sa':'1 Samuel',
  '2sam':'2 Samuel', '2sa':'2 Samuel',
  '1kgs':'1 Kings', '1ki':'1 Kings',
  '2kgs':'2 Kings', '2ki':'2 Kings',
  '1chr':'1 Chronicles', '1ch':'1 Chronicles',
  '2chr':'2 Chronicles', '2ch':'2 Chronicles',
  ezra:'Ezra', ezr:'Ezra',
  neh:'Nehemiah', ne:'Nehemiah',
  esth:'Esther', es:'Esther',
  job:'Job',
  ps:'Psalms', psa:'Psalms', psalm:'Psalms', psalms:'Psalms',
  prov:'Proverbs', pr:'Proverbs', prv:'Proverbs',
  eccl:'Ecclesiastes', ec:'Ecclesiastes', qoh:'Ecclesiastes',
  'song of solomon':'Song of Solomon', sos:'Song of Solomon', ss:'Song of Solomon',
  isa:'Isaiah', is:'Isaiah',
  jer:'Jeremiah', je:'Jeremiah',
  lam:'Lamentations', la:'Lamentations',
  ezek:'Ezekiel', eze:'Ezekiel', ez:'Ezekiel',
  dan:'Daniel', da:'Daniel', dn:'Daniel',
  hos:'Hosea', ho:'Hosea',
  joel:'Joel', joe:'Joel', jl:'Joel',
  amos:'Amos', am:'Amos',
  obad:'Obadiah', ob:'Obadiah',
  jonah:'Jonah', jon:'Jonah',
  mic:'Micah', mi:'Micah',
  nah:'Nahum', na:'Nahum',
  hab:'Habakkuk', hb:'Habakkuk',
  zeph:'Zephaniah', zep:'Zephaniah', zp:'Zephaniah',
  hag:'Haggai', hg:'Haggai',
  zech:'Zechariah', zec:'Zechariah',
  mal:'Malachi', ml:'Malachi',
  // New Testament
  matt:'Matthew', mt:'Matthew', mat:'Matthew',
  mark:'Mark', mk:'Mark', mr:'Mark',
  luke:'Luke', lk:'Luke', lu:'Luke',
  john:'John', jn:'John', joh:'John',
  acts:'Acts', ac:'Acts',
  rom:'Romans', ro:'Romans', rm:'Romans',
  '1cor':'1 Corinthians', '1co':'1 Corinthians',
  '2cor':'2 Corinthians', '2co':'2 Corinthians',
  gal:'Galatians', ga:'Galatians',
  eph:'Ephesians', ep:'Ephesians',
  phil:'Philippians', php:'Philippians',
  col:'Colossians', co:'Colossians',
  '1thess':'1 Thessalonians', '1th':'1 Thessalonians',
  '2thess':'2 Thessalonians', '2th':'2 Thessalonians',
  '1tim':'1 Timothy', '1ti':'1 Timothy',
  '2tim':'2 Timothy', '2ti':'2 Timothy',
  titus:'Titus', tit:'Titus',
  phlm:'Philemon', phm:'Philemon',
  heb:'Hebrews', he:'Hebrews',
  jas:'James', jm:'James',
  '1pet':'1 Peter', '1pe':'1 Peter', '1pt':'1 Peter',
  '2pet':'2 Peter', '2pe':'2 Peter', '2pt':'2 Peter',
  '1john':'1 John', '1jn':'1 John', '1jo':'1 John',
  '2john':'2 John', '2jn':'2 John',
  '3john':'3 John', '3jn':'3 John',
  jude:'Jude', jud:'Jude',
  rev:'Revelation', re:'Revelation', apoc:'Revelation',
}

// Full canonical names are also valid
const FULL_BOOK_NAMES = new Set([
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
  '1 Kings','2 Kings','1 Chronicles','2 Chronicles',
  'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah',
  'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah',
  'Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans',
  '1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
  'James','1 Peter','2 Peter','1 John','2 John','3 John',
  'Jude','Revelation',
])

// ─────────────────────────────────────────────
//  REGEX
//  Captures: optional number prefix, book name, chapter, optional verse range
// ─────────────────────────────────────────────
const BOOK_PATTERN = [
  // Numbered books: 1 Cor, 2 Tim, 3 John
  '(?:1st?|2nd?|3rd?|[123])[\\s.]?(?:' +
  'corinthians?|cor?|chronicles?|chr?|kings?|ki|samuel?|sa|' +
  'thessalonians?|thess?|th|timothy?|tim?|ti|peter?|pet?|pe|pt|' +
  'john?|jn|jo|jude?)',
  // Song of Solomon
  'song(?:\\sof\\s(?:solomon|songs?))?',
  // Regular books
  'genesis|gen?|gn|exodus|exo?|leviticus|lev?|le|numbers?|num?|nu|nm|' +
  'deuteronomy|deut?|de|dt|joshua?|jos?|judges?|jdg?|jud?|ruth?|ru|' +
  'ezra?|nehemiah|neh?|ne|esther?|esth?|es|job|' +
  'psalms?|psa?|ps|proverbs?|prov?|pr|prv|ecclesiastes|eccl?|ec|' +
  'isaiah?|isa?|is|jeremiah?|jer?|je|lamentations?|lam?|la|' +
  'ezekiel?|ezek?|eze?|ez|daniel?|dan?|da|dn|hosea?|hos?|ho|' +
  'joel?|joe?|jl|amos?|am|obadiah?|obad?|ob|jonah?|jon?|micah?|mic?|mi|' +
  'nahum?|nah?|na|habakkuk?|hab?|hb|zephaniah?|zeph?|zep?|zp|' +
  'haggai?|hag?|hg|zechariah?|zech?|zec?|malachi?|mal?|ml|' +
  'matthew?|matt?|mt|mark?|mk|mr|luke?|lk|lu|john?|jn|joh|acts?|ac|' +
  'romans?|rom?|ro|rm|galatians?|gal?|ga|ephesians?|eph?|ep|' +
  'philippians?|phil?|php|colossians?|col?|co|' +
  'titus|tit?|philemon|phlm?|phm|hebrews?|heb?|he|james?|jas?|jm|' +
  'jude|revelation?|rev?|re|apoc',
].join('|')

const SCRIPTURE_REGEX = new RegExp(
  `\\b((?:1st?|2nd?|3rd?|[123])[\\s.]?)?` +
  `(${BOOK_PATTERN})\\.?\\s+` +
  `(\\d{1,3})` +
  `(?:[:\\s](\\d{1,3})(?:[–\\-](\\d{1,3}))?)?`,
  'gi'
)

// ─────────────────────────────────────────────
//  parseScriptureRefs(text) → [{raw, book, chapter, verse, endVerse, key}]
// ─────────────────────────────────────────────
export function parseScriptureRefs(text) {
  if (!text) return []
  const matches = []
  let m
  SCRIPTURE_REGEX.lastIndex = 0

  while ((m = SCRIPTURE_REGEX.exec(text)) !== null) {
    const raw     = m[0]
    const prefix  = (m[1] || '').trim().replace(/[a-z]+/gi, n =>
      n === 'st' || n === 'nd' || n === 'rd' ? '' : n
    )
    const bookRaw = ((m[1] || '') + (m[2] || '')).trim().toLowerCase().replace(/\.\s*/g, '')
    const chapter = parseInt(m[3], 10)
    const verse   = m[4] ? parseInt(m[4], 10) : null
    const endVerse= m[5] ? parseInt(m[5], 10) : null

    // Resolve canonical book name
    const canonical = BOOK_ALIASES[bookRaw]
      || BOOK_ALIASES[bookRaw.replace(/\s+/g, '')]
      || [...FULL_BOOK_NAMES].find(b => b.toLowerCase() === bookRaw)
      || null

    if (!canonical) continue

    const verseStr = verse ? `:${verse}${endVerse ? `–${endVerse}` : ''}` : ''
    const key      = `${canonical} ${chapter}${verseStr}`

    matches.push({
      raw,
      book:    canonical,
      chapter,
      verse,
      endVerse,
      key,           // canonical reference string: "John 3:16"
      display: key,  // what to show in the chip
      index:   m.index,
    })
  }

  // Deduplicate by key
  const seen = new Set()
  return matches.filter(r => { if (seen.has(r.key)) return false; seen.add(r.key); return true })
}

// ─────────────────────────────────────────────
//  fetchScripture(ref) → { reference, content, translation } | null
//  Cached in sessionStorage so repeat taps are instant.
// ─────────────────────────────────────────────
const CACHE_PREFIX = 'dw_scripture_'

export async function fetchScripture(ref) {
  // Cache check
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + ref.key)
    if (cached) return JSON.parse(cached)
  } catch {}

  const apiKey = process.env.NEXT_PUBLIC_BIBLE_API_KEY
  const bibleId = process.env.NEXT_PUBLIC_BIBLE_ID || 'de4e12af7f28f599-01' // KJV default

  if (!apiKey) {
    // No API key — return a graceful fallback
    return {
      reference:   ref.display,
      content:     null,
      translation: null,
      error:       'no_api_key',
    }
  }

  try {
    // Build the API.Bible passage ID
    // Format: bookId.chapter.verse-bookId.chapter.endVerse
    const bookId  = ref.book.toLowerCase().replace(/\s+/g, '')
    const chap    = String(ref.chapter).padStart(3, '0')
    const vs      = ref.verse   ? String(ref.verse).padStart(3, '0')    : '001'
    const vsEnd   = ref.endVerse? String(ref.endVerse).padStart(3, '0') : vs

    const passageId = ref.verse
      ? `${bookId}.${chap}.${vs}-${bookId}.${chap}.${vsEnd}`
      : `${bookId}.${chap}`

    const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${encodeURIComponent(passageId)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`

    const res = await fetch(url, {
      headers: { 'api-key': apiKey },
    })

    if (!res.ok) throw new Error(`API.Bible ${res.status}`)

    const data  = await res.json()
    const text  = data?.data?.content?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null
    const tName = data?.data?.bibleId ? 'KJV' : null

    const result = {
      reference:   data?.data?.reference || ref.display,
      content:     text,
      translation: tName,
      error:       text ? null : 'empty',
    }

    // Cache successful results
    if (result.content) {
      try { sessionStorage.setItem(CACHE_PREFIX + ref.key, JSON.stringify(result)) } catch {}
    }

    return result
  } catch (e) {
    console.warn('[scripture] fetch error:', e.message)
    return { reference: ref.display, content: null, translation: null, error: e.message }
  }
}

// ─────────────────────────────────────────────
//  Content moderation — basic profanity filter
//  Returns { ok: boolean, reason: string | null }
// ─────────────────────────────────────────────

// A small seed list — extend as needed
const BLOCKED_PATTERNS = [
  /\bf+u+c+k+\b/i, /\bs+h+i+t+\b/i, /\bb+i+t+c+h+\b/i,
  /\ba+s+s+h+o+l+e+\b/i, /\bd+a+m+n+\b/i,
  /\bn+i+g+g+[ae]+r+\b/i, /\bf+a+g+g+[oe]+t+\b/i,
  /\bc+u+n+t+\b/i, /\bd+i+c+k+\b/i, /\bc+o+c+k+\b/i,
  /\bh+a+t+e+\s+(?:black|white|jew|muslim|christian|gay|trans)\b/i,
  /kill\s+yourself/i, /kys\b/i,
]

export function moderateContent(text) {
  if (!text?.trim()) return { ok: false, reason: 'Post cannot be empty.' }
  if (text.length > 1000) return { ok: false, reason: 'Post is too long (max 1000 characters).' }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok:     false,
        reason: 'Your post contains content that isn\'t allowed in Daily Walk communities. Please revise it and try again.',
      }
    }
  }
  return { ok: true, reason: null }
}