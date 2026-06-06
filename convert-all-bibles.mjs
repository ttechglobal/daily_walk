// ── convert-all-bibles.mjs ──
// Converts ALL .bib files in your ./bibles/ folder in one command.
// No need to run convert-bib.mjs separately for each translation.
//
// SETUP (one time only):
//   npm install mdb-reader
//
// USAGE:
//   node convert-all-bibles.mjs

import { default as MDBReader } from 'mdb-reader'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, resolve, basename, extname } from 'path'
import { createInterface } from 'readline'

const BOOK_ID = {
  1:'GEN',2:'EXO',3:'LEV',4:'NUM',5:'DEU',6:'JOS',7:'JDG',8:'RUT',
  9:'1SA',10:'2SA',11:'1KI',12:'2KI',13:'1CH',14:'2CH',15:'EZR',
  16:'NEH',17:'EST',18:'JOB',19:'PSA',20:'PRO',21:'ECC',22:'SNG',
  23:'ISA',24:'JER',25:'LAM',26:'EZK',27:'DAN',28:'HOS',29:'JOL',
  30:'AMO',31:'OBA',32:'JON',33:'MIC',34:'NAM',35:'HAB',36:'ZEP',
  37:'HAG',38:'ZEC',39:'MAL',
  40:'MAT',41:'MRK',42:'LUK',43:'JHN',44:'ACT',45:'ROM',
  46:'1CO',47:'2CO',48:'GAL',49:'EPH',50:'PHP',51:'COL',
  52:'1TH',53:'2TH',54:'1TI',55:'2TI',56:'TIT',57:'PHM',
  58:'HEB',59:'JAS',60:'1PE',61:'2PE',62:'1JN',63:'2JN',
  64:'3JN',65:'JUD',66:'REV',
}

const BOOK_NAME = {
  1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numbers',5:'Deuteronomy',
  6:'Joshua',7:'Judges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
  11:'1 Kings',12:'2 Kings',13:'1 Chronicles',14:'2 Chronicles',
  15:'Ezra',16:'Nehemiah',17:'Esther',18:'Job',19:'Psalms',20:'Proverbs',
  21:'Ecclesiastes',22:'Song of Solomon',23:'Isaiah',24:'Jeremiah',
  25:'Lamentations',26:'Ezekiel',27:'Daniel',28:'Hosea',29:'Joel',
  30:'Amos',31:'Obadiah',32:'Jonah',33:'Micah',34:'Nahum',
  35:'Habakkuk',36:'Zephaniah',37:'Haggai',38:'Zechariah',39:'Malachi',
  40:'Matthew',41:'Mark',42:'Luke',43:'John',44:'Acts',45:'Romans',
  46:'1 Corinthians',47:'2 Corinthians',48:'Galatians',49:'Ephesians',
  50:'Philippians',51:'Colossians',52:'1 Thessalonians',53:'2 Thessalonians',
  54:'1 Timothy',55:'2 Timothy',56:'Titus',57:'Philemon',58:'Hebrews',
  59:'James',60:'1 Peter',61:'2 Peter',62:'1 John',63:'2 John',
  64:'3 John',65:'Jude',66:'Revelation',
}

function stripHtml(text) {
  if (!text) return ''
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

function getTranslationInfo(db) {
  try {
    const rows = db.getTable('Info').getData()
    const info = {}
    for (const row of rows) {
      if (row.Parameter && row.Value) {
        info[row.Parameter.toLowerCase()] = row.Value
      }
    }
    return info
  } catch { return {} }
}

function convertBib(bibPath, abbr) {
  console.log(`\n  📖  Reading file...`)
  const buf  = readFileSync(bibPath)
  const db   = new MDBReader(buf)
  const rows = db.getTable('Bible').getData()
  console.log(`  ✅  Found ${rows.length.toLocaleString()} verses`)
  console.log(`  ⚙️   Converting...`)

  const chapters = {}
  let verseCount = 0

  for (const row of rows) {
    const bookId   = BOOK_ID[row.Book]
    const bookName = BOOK_NAME[row.Book]
    if (!bookId) continue
    const text = stripHtml(row.Scripture || '')
    if (!text) continue
    const key = `${bookId}.${row.Chapter}`
    if (!chapters[key]) {
      chapters[key] = { book: bookName, bookId, chapter: row.Chapter, verses: [] }
    }
    chapters[key].verses.push({ n: row.Verse, t: text })
    verseCount++
  }

  const outDir = join('output', abbr.toLowerCase())
  mkdirSync(outDir, { recursive: true })

  let fileCount = 0
  for (const [key, data] of Object.entries(chapters)) {
    writeFileSync(join(outDir, `${key}.json`), JSON.stringify(data), 'utf8')
    fileCount++
    if (fileCount % 200 === 0) {
      process.stdout.write(`  ✍️   Writing... ${fileCount} / ${Object.keys(chapters).length}\r`)
    }
  }

  const totalBytes = Object.values(chapters)
    .reduce((sum, d) => sum + JSON.stringify(d).length, 0)
  const mb = (totalBytes / 1024 / 1024).toFixed(2)
  console.log(`  ✅  Done! ${fileCount} chapter files, ${mb} MB                    `)
  return { fileCount, verseCount, mb }
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

function guessAbbr(filename) {
  const name     = basename(filename, extname(filename))
  const stripped = name.replace(/^[a-z]{2}[-_]/i, '')
  const upper    = stripped.replace(/[0-9]/g, '').toUpperCase()
  return upper.slice(0, 5).trim() || stripped.toUpperCase().slice(0, 5)
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   Daily Walk — Bible Batch Converter   ║')
  console.log('╚════════════════════════════════════════╝\n')

  const bibsDir = resolve('./bibles')
  if (!existsSync(bibsDir)) {
    console.error('❌  No ./bibles/ folder found.')
    console.error('    Create a folder called "bibles" in your project root')
    console.error('    and put your .bib files inside it.\n')
    process.exit(1)
  }

  const bibFiles = readdirSync(bibsDir)
    .filter(f => f.toLowerCase().endsWith('.bib'))
    .map(f => join(bibsDir, f))

  if (bibFiles.length === 0) {
    console.error('❌  No .bib files found in ./bibles/')
    console.error('    Copy your .bib files into the bibles/ folder and try again.\n')
    process.exit(1)
  }

  console.log(`Found ${bibFiles.length} .bib file(s):\n`)
  bibFiles.forEach((f, i) => console.log(`  ${i + 1}. ${basename(f)}`))

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n─────────────────────────────────────────')
  console.log('Confirm the abbreviation for each file.')
  console.log('This becomes the folder name in Supabase.')
  console.log('─────────────────────────────────────────\n')

  const toConvert = []

  for (const bibPath of bibFiles) {
    const filename = basename(bibPath)
    const guess    = guessAbbr(filename)

    let infoAbbr = ''
    try {
      const buf  = readFileSync(bibPath)
      const db   = new MDBReader(buf)
      const info = getTranslationInfo(db)
      infoAbbr   = info.abbreviation || info.abbr || ''
    } catch {}

    const suggested = infoAbbr || guess
    const answer    = await prompt(rl, `  ${filename}  →  abbreviation [${suggested}]: `)
    const abbr      = (answer.trim().toUpperCase() || suggested).toUpperCase()

    const outDir = join('output', abbr.toLowerCase())
    if (existsSync(outDir)) {
      const skip = await prompt(rl, `  ⚠️  output/${abbr.toLowerCase()}/ already exists. Skip? (y/n) [y]: `)
      if (skip.trim().toLowerCase() !== 'n') {
        console.log(`  ⏭️  Skipped ${abbr}\n`)
        continue
      }
    }

    toConvert.push({ bibPath, abbr })
    console.log(`  ✅  Will convert as: ${abbr}\n`)
  }

  rl.close()

  if (toConvert.length === 0) {
    console.log('Nothing to convert.\n')
    process.exit(0)
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`Converting ${toConvert.length} translation(s)...`)
  console.log('─────────────────────────────────────────')

  const results = []
  for (const { bibPath, abbr } of toConvert) {
    console.log(`\n▶  ${abbr} (${basename(bibPath)})`)
    try {
      const result = convertBib(bibPath, abbr)
      results.push({ abbr, ...result, success: true })
    } catch (err) {
      console.error(`  ❌  Failed: ${err.message}`)
      results.push({ abbr, success: false, error: err.message })
    }
  }

  console.log('\n╔════════════════════════════════════════╗')
  console.log('║              All Done!                 ║')
  console.log('╚════════════════════════════════════════╝\n')

  for (const r of results) {
    if (r.success) {
      console.log(`  ✅  ${r.abbr.padEnd(8)} ${r.fileCount} chapters, ${r.mb} MB → output/${r.abbr.toLowerCase()}/`)
    } else {
      console.log(`  ❌  ${r.abbr.padEnd(8)} FAILED — ${r.error}`)
    }
  }

  const successful = results.filter(r => r.success)
  if (successful.length > 0) {
    console.log('\n─────────────────────────────────────────')
    console.log('Next step — upload to Supabase Storage:\n')
    console.log('  1. Go to your Supabase dashboard → Storage')
    console.log('  2. Create a bucket called "bible-translations" (set to Public)')
    for (const r of successful) {
      console.log(`  3. Upload output/${r.abbr.toLowerCase()}/ → create folder "${r.abbr.toLowerCase()}" in the bucket`)
    }
    console.log('')
  }
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message)
  process.exit(1)
})