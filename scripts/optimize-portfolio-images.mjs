// Dociska surowe zrzuty ekranu w public/assets/portfolio, żeby przeglądarka
// nie skalowała w locie kilkumegabajtowych PNG-ów do rozmiaru showreela/karty
// projektu (stąd rozmyta interpolacja). Uruchamiać ręcznie po dodaniu nowych
// screenów: npm run images:optimize
import sharp from 'sharp'
import { readdir, stat, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TARGET_DIR = path.join(__dirname, '..', 'public', 'assets', 'portfolio')
const MAX_DIMENSION = 2200

async function optimize(file) {
  const filePath = path.join(TARGET_DIR, file)
  const ext = path.extname(file).toLowerCase()
  const before = (await stat(filePath)).size

  const pipeline = sharp(filePath)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })

  const buffer = ext === '.png'
    ? await pipeline.png({ quality: 85, compressionLevel: 9, effort: 8 }).toBuffer()
    : await pipeline.jpeg({ quality: 85, progressive: true }).toBuffer()

  const tempPath = `${filePath}.tmp`
  await sharp(buffer).toFile(tempPath)
  await rename(tempPath, filePath)

  const after = buffer.length
  const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0
  console.log(`${file}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${saved}%)`)
}

const files = (await readdir(TARGET_DIR)).filter(name => /\.(png|jpe?g)$/i.test(name))
for (const file of files) {
  await optimize(file)
}
