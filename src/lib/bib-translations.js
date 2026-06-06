// ── src/lib/bib-translations.js ──
// Single source of truth for all Bible translations in Daily Walk.
//
// ⚠️  IMPORTANT — LICENSE NOTES:
// ─────────────────────────────────────────────────────────────────────────────
// FREELY DISTRIBUTABLE (safe to ship in the app):
//   KJV1769  — Public Domain ✅
//   KJ2000   — Free for non-commercial use ✅ (keep app free)
//
// REQUIRE A LICENSE BEFORE DISTRIBUTING:
//   AMP2015  — © The Lockman Foundation (lockman.org)
//   AMPC1987 — © The Lockman Foundation (lockman.org)
//   CEV1995  — © American Bible Society
//   EASY2018 — © MissionAssist UK (contact easyenglish.bible — non-commercial friendly)
//   GNT1976  — © American Bible Society
//   ICB2015  — © Tommy Nelson / Thomas Nelson
//   MSG2018  — © Eugene H. Peterson / NavPress
//   NIV2011  — © Biblica, Inc.
//   NKJV1982 — © Thomas Nelson
//   NLT2015  — © Tyndale House Foundation
//   NRSV1989 — © National Council of Churches (petradi rights)
//   RSV1971  — © National Council of Churches (petradi rights)
//   TLB1971  — © Tyndale House Publishers
//   TPT2025  — © Passion & Fire Ministries / BroadStreet Publishing
//   BM2010   — Unknown — check Info table in the .bib file before distributing
//
// RECOMMENDATION FOR LAUNCH:
//   Ship only KJV1769 and KJ2000 by default.
//   Add WEB (World English Bible — public domain) and BSB (Berean Standard Bible —
//   free with attribution) as they are free and you can get the .bib files from BibleShow.
//   Apply for licenses for NIV/NLT if you want them later.
//
// HOW TO ADD A TRANSLATION:
//   1. Convert: node convert-all-bibles.mjs
//   2. Upload output/<abbr>/ to Supabase Storage → bible-translations/<abbr>/
//   3. Add entry below
//   4. Update TRANSLATION_GROUPS if needed
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSLATIONS = [

  // ── ✅ FREELY DISTRIBUTABLE ──────────────────────────────────────────────

  {
    id:            'KJV',
    abbreviation:  'KJV',
    name:          'King James Version',
    year:          '1769',
    language:      'English',
    license:       'Public Domain',
    licenseStatus: 'free',   // 'free' | 'noncommercial' | 'licensed' | 'unknown'
    description:   'The classic 1769 Blayney revision. Timeless, literary, and authoritative.',
    fileSizeKB:    4300,
    totalChapters: 1189,
    enabled:       true,   // show in the app
  },

  {
    id:            'KJ2000',
    abbreviation:  'KJ2000',
    name:          'King James 2000',
    year:          '2000',
    language:      'English',
    license:       'Free for non-commercial use',
    licenseStatus: 'noncommercial',
    description:   'The KJV updated for 21st-century readability. Same text, modern pronouns.',
    fileSizeKB:    4300,
    totalChapters: 1189,
    enabled:       true,
  },

  // ── ⚠️  REQUIRES LICENSE — disabled until you have permission ────────────
  // To enable: get the license, set enabled: true

  {
    id:            'NIV',
    abbreviation:  'NIV',
    name:          'New International Version',
    year:          '2011',
    language:      'English',
    license:       '© Biblica, Inc. — license required',
    licenseStatus: 'licensed',
    description:   'The world\'s most popular modern Bible translation. Clear and accurate.',
    fileSizeKB:    4500,
    totalChapters: 1189,
    enabled:       false,   // ← set true after getting license from biblica.com
  },

  {
    id:            'NKJV',
    abbreviation:  'NKJV',
    name:          'New King James Version',
    year:          '1982',
    language:      'English',
    license:       '© Thomas Nelson — license required',
    licenseStatus: 'licensed',
    description:   'Modernises KJV language while preserving the Textus Receptus tradition.',
    fileSizeKB:    4400,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'NLT',
    abbreviation:  'NLT',
    name:          'New Living Translation',
    year:          '2015',
    language:      'English',
    license:       '© Tyndale House Foundation — license required',
    licenseStatus: 'licensed',
    description:   'Warm, readable thought-for-thought translation. Great for daily reading.',
    fileSizeKB:    4600,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'AMP',
    abbreviation:  'AMP',
    name:          'Amplified Bible',
    year:          '2015',
    language:      'English',
    license:       '© The Lockman Foundation — license required',
    licenseStatus: 'licensed',
    description:   'Expands key words with bracketed definitions for deeper word study.',
    fileSizeKB:    5200,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'AMPC',
    abbreviation:  'AMPC',
    name:          'Amplified Bible, Classic Edition',
    year:          '1987',
    language:      'English',
    license:       '© The Lockman Foundation — license required',
    licenseStatus: 'licensed',
    description:   'The original Amplified with fuller bracketed amplifications.',
    fileSizeKB:    5400,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'MSG',
    abbreviation:  'MSG',
    name:          'The Message',
    year:          '2018',
    language:      'English',
    license:       '© Eugene H. Peterson / NavPress — license required',
    licenseStatus: 'licensed',
    description:   'Eugene Peterson\'s contemporary language paraphrase. Conversational and vivid.',
    fileSizeKB:    5000,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'CEV',
    abbreviation:  'CEV',
    name:          'Contemporary English Version',
    year:          '1995',
    language:      'English',
    license:       '© American Bible Society — license required',
    licenseStatus: 'licensed',
    description:   'Simple, clear English. Ideal for new readers and younger audiences.',
    fileSizeKB:    4200,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'GNT',
    abbreviation:  'GNT',
    name:          'Good News Translation',
    year:          '1976',
    language:      'English',
    license:       '© American Bible Society — license required',
    licenseStatus: 'licensed',
    description:   'Straightforward everyday English. One of the first modern translations.',
    fileSizeKB:    4100,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'ICB',
    abbreviation:  'ICB',
    name:          "International Children's Bible",
    year:          '2015',
    language:      'English',
    license:       '© Tommy Nelson / Thomas Nelson — license required',
    licenseStatus: 'licensed',
    description:   'Simple vocabulary for children, grade 3 and up. Great for families.',
    fileSizeKB:    4000,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'NRSV',
    abbreviation:  'NRSV',
    name:          'New Revised Standard Version',
    year:          '1989',
    language:      'English',
    license:       '© National Council of Churches — license required (petradirights.com)',
    licenseStatus: 'licensed',
    description:   'Scholarly, ecumenical translation widely used in seminaries and churches.',
    fileSizeKB:    4400,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'RSV',
    abbreviation:  'RSV',
    name:          'Revised Standard Version',
    year:          '1971',
    language:      'English',
    license:       '© National Council of Churches — license required (petradirights.com)',
    licenseStatus: 'licensed',
    description:   'Classic mid-century scholarly translation. Precursor to the NRSV.',
    fileSizeKB:    4300,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'TLB',
    abbreviation:  'TLB',
    name:          'The Living Bible',
    year:          '1971',
    language:      'English',
    license:       '© Tyndale House Publishers — license required',
    licenseStatus: 'licensed',
    description:   'Kenneth Taylor\'s paraphrase. Warm, accessible, and devotional.',
    fileSizeKB:    4600,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'TPT',
    abbreviation:  'TPT',
    name:          'The Passion Translation',
    year:          '2025',
    language:      'English',
    license:       '© Passion & Fire Ministries / BroadStreet — license required',
    licenseStatus: 'licensed',
    description:   'Brian Simmons\' heart-level paraphrase. Poetic and expressive.',
    fileSizeKB:    5100,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'EASY',
    abbreviation:  'EASY',
    name:          'EasyEnglish Bible',
    year:          '2018',
    language:      'English',
    license:       '© MissionAssist UK — contact for permission (easyenglish.bible)',
    licenseStatus: 'licensed',
    description:   'Simple English for learners and ESL readers. Wycliffe-affiliated.',
    fileSizeKB:    4000,
    totalChapters: 1189,
    enabled:       false,
  },

  {
    id:            'BM',
    abbreviation:  'BM',
    name:          'BM2010 — Translation Unknown',
    year:          '2010',
    language:      'English',
    license:       'Unknown — check .bib Info table before enabling',
    licenseStatus: 'unknown',
    description:   'Open the BM2010.bib file and check the Info table to identify this translation.',
    fileSizeKB:    4200,
    totalChapters: 1189,
    enabled:       false,   // ← don't enable until identified and licensed
  },

]

// ── Only show enabled translations in the app
export function getEnabledTranslations() {
  return TRANSLATIONS.filter(t => t.enabled)
}

// ── Default translation
export const DEFAULT_TRANSLATION = 'KJV'

// ── localStorage keys
const ACTIVE_KEY   = 'dw_active_translation'
const DOWNLOAD_KEY = 'dw_downloaded_translations'

// ── Active translation preference
export function getActiveTranslation() {
  try {
    const v = localStorage.getItem(ACTIVE_KEY)
    // Must be an enabled translation
    if (v && TRANSLATIONS.find(t => t.id === v && t.enabled)) return v
  } catch {}
  return DEFAULT_TRANSLATION
}

export function setActiveTranslation(id) {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
}

// ── Downloaded set
export function getDownloadedSet() {
  try {
    const raw = localStorage.getItem(DOWNLOAD_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

export function isTranslationDownloaded(id) {
  return getDownloadedSet().has(String(id))
}

export function markDownloaded(id) {
  try {
    const s = getDownloadedSet()
    s.add(String(id))
    localStorage.setItem(DOWNLOAD_KEY, JSON.stringify([...s]))
  } catch {}
}

export function markDeleted(id) {
  try {
    const s = getDownloadedSet()
    s.delete(String(id))
    localStorage.setItem(DOWNLOAD_KEY, JSON.stringify([...s]))
  } catch {}
}

// ── Get one translation by id/abbreviation
export function getTranslation(id) {
  return TRANSLATIONS.find(t => t.id === id || t.abbreviation === id) || TRANSLATIONS[0]
}

// ── Supabase Storage URL for a chapter file
// Folder name = translation id lowercased
// e.g. getChapterUrl('KJV', 'GEN', 1)
//   → https://xxx.supabase.co/storage/v1/object/public/bible-translations/kjv/GEN.1.json
export function getChapterUrl(translationId, bookId, chapter) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const abbr = String(translationId).toLowerCase()
  return `${base}/storage/v1/object/public/bible-translations/${abbr}/${bookId}.${chapter}.json`
}

// ── File name map — what your .bib files are named
// Use this when running convert-all-bibles.mjs to confirm abbreviations
export const BIB_FILE_MAP = {
  'AMP2015.bib':  'AMP',
  'AMPC1987.bib': 'AMPC',
  'BM2010.bib':   'BM',
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