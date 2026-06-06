// ── upload-bibles.mjs ──
// Uploads already-converted JSON files from ./output/ to Supabase Storage.
//
// SETUP:   npm install @supabase/supabase-js
// USAGE:   node upload-bibles.mjs

import { createClient }  from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { createInterface } from 'readline'

const BUCKET = 'bible-translations'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function prompt(rl, q) { return new Promise(r => rl.question(q, r)) }

function readEnvLocal() {
  const env = {}
  if (!existsSync('.env.local')) return env
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    env[k] = v
  }
  return env
}

async function uploadFolder(supabase, abbr, folderPath) {
  const files  = readdirSync(folderPath).filter(f => f.endsWith('.json'))
  const total  = files.length
  let uploaded = 0
  let failed   = 0
  const BATCH  = 20

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH)
    await Promise.all(batch.map(async (filename) => {
      const storagePath = `${abbr.toLowerCase()}/${filename}`
      const content     = readFileSync(join(folderPath, filename))
      const { error }   = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, content, {
          contentType:  'application/json',
          upsert:       true,
          cacheControl: '31536000',
        })
      if (error) { failed++; if (failed <= 3) console.error(`  ✗ ${filename}: ${error.message}`) }
      else uploaded++
    }))
    process.stdout.write(`  ${Math.min(i + BATCH, total)}/${total} uploaded\r`)
    await sleep(80)
  }
  return { uploaded, failed, total }
}

async function main() {
  console.log('\n=== Daily Walk — Upload Bibles to Supabase ===\n')

  const env        = readEnvLocal()
  let url          = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
  let serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
  const rl         = createInterface({ input: process.stdin, output: process.stdout })

  if (!url) {
    url = (await prompt(rl, 'Supabase URL (Settings → API → Project URL): ')).trim()
  } else {
    console.log('✅ URL:', url)
  }

  if (!serviceKey) {
    console.log('\nNeed SERVICE ROLE key — Supabase dashboard → Settings → API → service_role\n')
    serviceKey = (await prompt(rl, 'Service role key: ')).trim()
  } else {
    console.log('✅ Service key found')
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Create bucket if needed
  console.log('\nChecking bucket...')
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.error('❌ Cannot connect:', listErr.message)
    rl.close(); process.exit(1)
  }

  if (!(buckets || []).some(b => b.name === BUCKET)) {
    console.log('Creating bucket...')
    const { error: ce } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (ce) { console.error('❌ Bucket error:', ce.message); rl.close(); process.exit(1) }
    console.log('✅ Bucket created (public)')
  } else {
    console.log('✅ Bucket exists')
  }

  // Find output folders
  const outputDir = resolve('./output')
  if (!existsSync(outputDir)) {
    console.error('\n❌ No ./output/ folder. Run convert-all-bibles.mjs first.\n')
    rl.close(); process.exit(1)
  }

  const folders = readdirSync(outputDir)
    .filter(f => statSync(join(outputDir, f)).isDirectory())

  console.log(`\nFound ${folders.length} translation(s) in ./output/:`)
  folders.forEach((f, i) => {
    const count = readdirSync(join(outputDir, f)).filter(x => x.endsWith('.json')).length
    console.log(`  ${i+1}. ${f.toUpperCase()} — ${count} files`)
  })

  const ok = await prompt(rl, '\nUpload all? (y/n) [y]: ')
  if (ok.trim().toLowerCase() === 'n') { rl.close(); process.exit(0) }
  rl.close()

  // Upload
  for (const folder of folders) {
    const abbr = folder.toUpperCase()
    console.log(`\n▶ Uploading ${abbr}...`)
    const { uploaded, failed, total } = await uploadFolder(supabase, abbr, join(outputDir, folder))
    console.log(`✅ ${uploaded}/${total} files uploaded${failed > 0 ? ` (${failed} failed)` : ''}        `)

    // Verify
    const testUrl = `${url}/storage/v1/object/public/${BUCKET}/${folder}/JHN.3.json`
    const check   = await fetch(testUrl).catch(() => ({ status: 0 }))
    if (check.status === 200) {
      console.log('✅ Verified — files are publicly accessible')
    } else {
      console.log(`⚠️  Verify failed (HTTP ${check.status})`)
      console.log('   Fix: Supabase → Storage → bible-translations → Edit → Enable Public bucket')
    }
  }

  console.log('\n=== Done! ===')
  console.log('\n⚠️  IMPORTANT: Clear IndexedDB before testing in the app.')
  console.log('   Browser console: indexedDB.deleteDatabase("daily_walk_bible")')
  console.log('   Then go to Translations → Download KJV\n')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })