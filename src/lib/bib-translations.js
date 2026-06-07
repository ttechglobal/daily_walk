// ── src/lib/bib-translations.js ── v4
//
// CHANGE: Show ALL translations — no enabled filter.
// The user said: "show me all translations, I can't see NIV, Amplified, Message".
// TRANSLATIONS now exports every translation. The TranslationSheet and
// translations/page show all of them. The user downloads whichever they want.
// KJV is the only one that is alwaysOnline (reads from Supabase Storage without download).

export const DEFAULT_TRANSLATION = 'KJV'
const ACTIVE_KEY   = 'dw_active_translation'
const DOWNLOAD_KEY = 'dw_downloaded_translations'

// ─────────────────────────────────────────────
//  ALL translations — shown in the UI.
//  No enabled flag filtering — show everything.
//  alwaysOnline: true = reads from Supabase Storage without downloading
// ─────────────────────────────────────────────
export const TRANSLATIONS = [
  { id: 'KJV',    abbreviation: 'KJV',    name: 'King James Version',          language: 'English', fileSizeKB: 4300, alwaysOnline: true  },
  { id: 'KJ2000', abbreviation: 'KJ2000', name: 'King James 2000',             language: 'English', fileSizeKB: 4300, alwaysOnline: false },
  { id: 'AMP',    abbreviation: 'AMP',    name: 'Amplified Bible',             language: 'English', fileSizeKB: 5200, alwaysOnline: false },
  { id: 'AMPC',   abbreviation: 'AMPC',   name: 'Amplified Classic Edition',   language: 'English', fileSizeKB: 5300, alwaysOnline: false },
  { id: 'CEV',    abbreviation: 'CEV',    name: 'Contemporary English',        language: 'English', fileSizeKB: 4100, alwaysOnline: false },
  { id: 'GNT',    abbreviation: 'GNT',    name: 'Good News Translation',       language: 'English', fileSizeKB: 4000, alwaysOnline: false },
  { id: 'ICB',    abbreviation: 'ICB',    name: "Int'l Children's Bible",      language: 'English', fileSizeKB: 3900, alwaysOnline: false },
  { id: 'MSG',    abbreviation: 'MSG',    name: 'The Message',                 language: 'English', fileSizeKB: 4800, alwaysOnline: false },
  { id: 'NIV',    abbreviation: 'NIV',    name: 'New International Version',   language: 'English', fileSizeKB: 4500, alwaysOnline: false },
  { id: 'NKJV',   abbreviation: 'NKJV',   name: 'New King James Version',      language: 'English', fileSizeKB: 4400, alwaysOnline: false },
  { id: 'NLT',    abbreviation: 'NLT',    name: 'New Living Translation',      language: 'English', fileSizeKB: 4600, alwaysOnline: false },
  { id: 'NRSV',   abbreviation: 'NRSV',   name: 'New Revised Standard',        language: 'English', fileSizeKB: 4400, alwaysOnline: false },
  { id: 'RSV',    abbreviation: 'RSV',    name: 'Revised Standard Version',    language: 'English', fileSizeKB: 4300, alwaysOnline: false },
  { id: 'TLB',    abbreviation: 'TLB',    name: 'The Living Bible',            language: 'English', fileSizeKB: 4600, alwaysOnline: false },
  { id: 'TPT',    abbreviation: 'TPT',    name: 'The Passion Translation',     language: 'English', fileSizeKB: 5100, alwaysOnline: false },
  { id: 'EASY',   abbreviation: 'EASY',   name: 'EasyEnglish Bible',           language: 'English', fileSizeKB: 4000, alwaysOnline: false },
]

// ─────────────────────────────────────────────
//  fetchTranslations — async, upgrades the list from Supabase DB
//  Falls back to static TRANSLATIONS if offline/unavailable
// ─────────────────────────────────────────────
export async function fetchTranslations() {
  try {
    const { createClient } = await import('./supabase/client')
    const sb = createClient()
    if (!sb) return TRANSLATIONS

    const { data, error } = await sb
      .from('bible_translations')
      .select('id, abbreviation, name, language, file_size_kb, always_online')
      .order('abbreviation')

    if (error || !data?.length) return TRANSLATIONS

    return data.map(r => ({
      id:           r.id || r.abbreviation,
      abbreviation: r.abbreviation,
      name:         r.name,
      language:     r.language || 'English',
      fileSizeKB:   r.file_size_kb || 4000,
      alwaysOnline: r.always_online || false,
    }))
  } catch {
    return TRANSLATIONS
  }
}

// ─────────────────────────────────────────────
//  Active translation preference
// ─────────────────────────────────────────────
export function getActiveTranslation() {
  try { return localStorage.getItem(ACTIVE_KEY) || DEFAULT_TRANSLATION } catch { return DEFAULT_TRANSLATION }
}
export function setActiveTranslation(id) {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
}

// ─────────────────────────────────────────────
//  Downloaded set
// ─────────────────────────────────────────────
export function getDownloadedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(DOWNLOAD_KEY) || '[]')) } catch { return new Set() }
}
export function markDownloaded(id) {
  try { const s = getDownloadedSet(); s.add(String(id)); localStorage.setItem(DOWNLOAD_KEY, JSON.stringify([...s])) } catch {}
}
export function markDeleted(id) {
  try { const s = getDownloadedSet(); s.delete(String(id)); localStorage.setItem(DOWNLOAD_KEY, JSON.stringify([...s])) } catch {}
}
export function isTranslationDownloaded(id) { return getDownloadedSet().has(String(id)) }

// ─────────────────────────────────────────────
//  Chapter URL — Supabase Storage
// ─────────────────────────────────────────────
export function getChapterUrl(translationId, bookId, chapter) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const abbr = String(translationId).toLowerCase()
  return `${base}/storage/v1/object/public/bible-translations/${abbr}/${bookId}.${chapter}.json`
}

// ─────────────────────────────────────────────
//  Backwards compat — bible.js imports these
// ─────────────────────────────────────────────
export const BIB_FILE_MAP = {
  'AMP2015.bib':  'AMP',
  'AMPC1987.bib': 'AMPC',
  'CEV1995.bib':  'CEV',
  'EASY2018.bib': 'EASY',
  'GNT1976.bib':  'GNT',
  'ICB2015.bib':  'ICB',
  'KJ2000.bib':   'KJ2000',
  'KJV1769.bib':  'KJV',
  'MSG2018.bib':  'MSG',
  'NIV2011.bib':  'NIV',
  'NKJV1982.bib': 'NKJV',
  'NLT2015.bib':  'NLT',
  'NRSV1989.bib': 'NRSV',
  'RSV1971.bib':  'RSV',
  'TLB1971.bib':  'TLB',
  'TPT2025.bib':  'TPT',
}