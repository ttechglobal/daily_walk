// ── convert-bib.mjs ──
// Converts a single .bib file to per-chapter JSON files.
// Usage: node convert-bib.mjs ./bibles/KJV1769.bib KJV

import { default as MDBReader } from 'mdb-reader'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'

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

const [,, bibPath, abbr] = process.argv

if (!bibPath || !abbr) {
  console.error('\nUsage: node convert-bib.mjs <path-to-file.bib> <ABBREVIATION>')
  console.error('Example: node convert-bib.mjs ./bibles/KJV1769.bib KJV\n')
  process.exit(1)
}

const absPath = resolve(bibPath)
if (!existsSync(absPath)) {
  console.error(`\nFile not found: ${absPath}\n`)
  process.exit(1)
}

console.log(`\n📖  Reading: ${absPath}`)
console.log(`📝  Translation: ${abbr}\n`)

const buf  = readFileSync(absPath)
const db   = new MDBReader(buf)
const rows = db.getTable('Bible').getData()
console.log(`✅  Found ${rows.length.toLocaleString()} verses\n`)

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
  if (fileCount % 100 === 0) {
    process.stdout.write(`   Writing... ${fileCount} / ${Object.keys(chapters).length}\r`)
  }
}

const totalBytes = Object.values(chapters).reduce((sum, d) => sum + JSON.stringify(d).length, 0)
const mb = (totalBytes / 1024 / 1024).toFixed(2)

console.log(`\n✅  Done!`)
console.log(`    Verses  : ${verseCount.toLocaleString()}`)
console.log(`    Chapters: ${fileCount}`)
console.log(`    Size    : ${mb} MB total`)
console.log(`    Output  : ./output/${abbr.toLowerCase()}/\n`)
console.log(`Next: upload ./output/${abbr.toLowerCase()}/ to Supabase Storage → bible-translations bucket\n`)