const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SOURCE_IMAGE = path.join(__dirname, '../public/african_ai_square.png')
const ICONS_DIR = path.join(__dirname, '../public/icons')
const PUBLIC_DIR = path.join(__dirname, '../public')

const SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]

async function generateIcons() {
  console.log('🚀 Starting icon generation...')

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
  }

  // 1. Generate PWA icons
  for (const size of SIZES) {
    const filename = `icon-${size}x${size}.png`
    const outputPath = path.join(ICONS_DIR, filename)

    await sharp(SOURCE_IMAGE).resize(size, size).toFile(outputPath)

    console.log(`✅ Generated ${filename}`)
  }

  // 2. Generate Favicons
  await sharp(SOURCE_IMAGE)
    .resize(32, 32)
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'))
  console.log('✅ Generated favicon.png (32x32)')

  // For favicon.ico, we'll just use the 32x32 png (most browsers support this now)
  // or we can try to use a 32x32 ico if sharp supports it (usually doesn't by default)
  await sharp(SOURCE_IMAGE)
    .resize(32, 32)
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'))
  console.log('✅ Generated favicon.ico (32x32)')

  // 3. Replace common LearnHouse assets with African AI Network versions
  // Use map-only icon for things that expect a square icon
  await sharp(SOURCE_IMAGE)
    .resize(512, 512)
    .toFile(path.join(PUBLIC_DIR, 'learnhouse_icon.png'))

  await sharp(SOURCE_IMAGE)
    .resize(512, 512)
    .toFile(path.join(PUBLIC_DIR, 'learnhouse_bigicon.png'))

  // Use full logo for things that expect a full logo
  const FULL_LOGO = path.join(PUBLIC_DIR, 'african_ai_network_logo.png')
  if (fs.existsSync(FULL_LOGO)) {
    fs.copyFileSync(FULL_LOGO, path.join(PUBLIC_DIR, 'learnhouse_logo.png'))
    fs.copyFileSync(
      FULL_LOGO,
      path.join(PUBLIC_DIR, 'learnhouse_text_white.png')
    ) // Fallback
    console.log('✅ Replaced learnhouse_logo.png and other text assets')
  }

  console.log('✨ Icon generation and replacement complete!')
}

generateIcons().catch((err) => {
  console.error('❌ Error generating icons:', err)
  process.exit(1)
})
