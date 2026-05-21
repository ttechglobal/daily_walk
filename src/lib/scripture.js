// ── src/lib/scripture.js ──
// Bible reference parser and verse fetcher.

const BOOK_ALIASES = {
  gen:'Genesis',ex:'Exodus',lev:'Leviticus',num:'Numbers',deut:'Deuteronomy',
  josh:'Joshua',judg:'Judges',ruth:'Ruth','1sam':'1 Samuel','2sam':'2 Samuel',
  '1kgs':'1 Kings','2kgs':'2 Kings','1chr':'1 Chronicles','2chr':'2 Chronicles',
  ezra:'Ezra',neh:'Nehemiah',esth:'Esther',job:'Job',
  ps:'Psalms',psa:'Psalms',psalm:'Psalms',psalms:'Psalms',
  prov:'Proverbs',pr:'Proverbs',eccl:'Ecclesiastes',ec:'Ecclesiastes',
  isa:'Isaiah',is:'Isaiah',jer:'Jeremiah',lam:'Lamentations',
  ezek:'Ezekiel',eze:'Ezekiel',dan:'Daniel',da:'Daniel',
  hos:'Hosea',joel:'Joel',amos:'Amos',obad:'Obadiah',jonah:'Jonah',
  mic:'Micah',nah:'Nahum',hab:'Habakkuk',zeph:'Zephaniah',hag:'Haggai',
  zech:'Zechariah',mal:'Malachi',
  matt:'Matthew',mt:'Matthew',mark:'Mark',mk:'Mark',luke:'Luke',lk:'Luke',
  john:'John',jn:'John',acts:'Acts',rom:'Romans',ro:'Romans',
  '1cor':'1 Corinthians','1co':'1 Corinthians','2cor':'2 Corinthians','2co':'2 Corinthians',
  gal:'Galatians',eph:'Ephesians',phil:'Philippians',php:'Philippians',
  col:'Colossians','1thess':'1 Thessalonians','1th':'1 Thessalonians',
  '2thess':'2 Thessalonians','2th':'2 Thessalonians',
  '1tim':'1 Timothy','1ti':'1 Timothy','2tim':'2 Timothy','2ti':'2 Timothy',
  titus:'Titus',tit:'Titus',phlm:'Philemon',phm:'Philemon',
  heb:'Hebrews',he:'Hebrews',jas:'James',jm:'James',
  '1pet':'1 Peter','1pe':'1 Peter','1pt':'1 Peter',
  '2pet':'2 Peter','2pe':'2 Peter','2pt':'2 Peter',
  '1john':'1 John','1jn':'1 John','2john':'2 John','2jn':'2 John',
  '3john':'3 John','3jn':'3 John',jude:'Jude',rev:'Revelation',re:'Revelation',
}

const SCRIPTURE_RE = /\b((?:1st?|2nd?|3rd?|[123])[\s.]?)?([A-Za-z]+)\.?\s+(\d{1,3})(?:[:\s](\d{1,3})(?:[–\-](\d{1,3}))?)?/g

export function parseScriptureRefs(text) {
  if (!text) return []
  const matches = []
  let m
  SCRIPTURE_RE.lastIndex = 0
  while ((m = SCRIPTURE_RE.exec(text)) !== null) {
    const prefix  = (m[1] || '').replace(/[a-z]+/gi, '').trim()
    const raw     = ((m[1] || '') + (m[2] || '')).toLowerCase().replace(/[\s.]/g, '')
    const chapter = parseInt(m[3], 10)
    const verse   = m[4] ? parseInt(m[4], 10) : null
    const endVerse= m[5] ? parseInt(m[5], 10) : null
    const canonical = BOOK_ALIASES[raw] || null
    if (!canonical) continue
    const verseStr = verse ? `:${verse}${endVerse ? `–${endVerse}` : ''}` : ''
    const key = `${canonical} ${chapter}${verseStr}`
    matches.push({ raw:m[0], book:canonical, chapter, verse, endVerse, key, display:key, index:m.index })
  }
  const seen = new Set()
  return matches.filter(r => { if (seen.has(r.key)) return false; seen.add(r.key); return true })
}

export async function fetchScripture(ref) {
  try {
    const cached = sessionStorage.getItem('dw_sc_' + ref.key)
    if (cached) return JSON.parse(cached)
  } catch {}
  try {
    const book = ref.book.toLowerCase().replace(/\s+/g, '+')
    const verseStr = ref.verse ? `+${ref.chapter}:${ref.verse}${ref.endVerse?'-'+ref.endVerse:''}` : `+${ref.chapter}`
    const url = `https://bible-api.com/${book}${verseStr}?translation=kjv`
    const res = await fetch(url)
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    const content = data.text?.trim() || null
    const result = { reference: data.reference || ref.display, content, translation: 'KJV', error: content ? null : 'empty' }
    if (content) { try { sessionStorage.setItem('dw_sc_' + ref.key, JSON.stringify(result)) } catch {} }
    return result
  } catch (e) {
    return { reference: ref.display, content: null, translation: null, error: e.message }
  }
}

export function moderateContent(text) {
  if (!text?.trim()) return { ok: false, reason: 'Post cannot be empty.' }
  if (text.length > 1000) return { ok: false, reason: 'Post is too long (max 1000 characters).' }
  return { ok: true, reason: null }
}