// ── scripts/generate-icons.mjs ──
// Reads public/app-icon.png and generates all required icon sizes.
// Run: npm run generate-icons
// Requires: npm install --save-dev sharp
//
// TO USE YOUR REAL ICON:
// 1. Drop your 1024×1024 PNG into public/app-icon.png
// 2. Run: npm run generate-icons
// 3. All icons in public/icons/ are updated automatically

import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const INPUT  = 'public/app-icon.png'
const OUTDIR = 'public/icons'

if (!existsSync(INPUT)) {
  console.error(`❌ ${INPUT} not found. Drop your 1024×1024 icon there first.`)
  process.exit(1)
}

mkdirSync(OUTDIR, { recursive: true })

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of SIZES) {
  await sharp(INPUT).resize(size, size).png().toFile(join(OUTDIR, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)

  if (size === 192 || size === 512) {
    await sharp(INPUT).resize(size, size).png().toFile(join(OUTDIR, `icon-${size}-maskable.png`))
    console.log(`✓ icon-${size}-maskable.png`)
  }
}

// Favicons
await sharp(INPUT).resize(32, 32).png().toFile(join(OUTDIR, 'favicon-32.png'))
await sharp(INPUT).resize(16, 16).png().toFile(join(OUTDIR, 'favicon-16.png'))
console.log('✓ favicon-32.png, favicon-16.png')
console.log('\n🎉 All icons generated from', INPUT)
console.log('   Deploy and your new icon will appear everywhere.')
