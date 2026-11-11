#!/usr/bin/env node
/**
 * Plakaty aplikacji w stylu redzikowski.com.
 *
 *   node scripts/posters/build.mjs <katalog-repozytorium> [platforma…]
 *
 * Czyta <repo>/docs/posters/posters.json, składa każdy plakat z szablonu
 * template.html i renderuje go bezgłowym Chrome do <repo>/docs/posters/<file>.
 * Ten sam plik posters.json jest manifestem, który strona czyta z GitHuba.
 *
 * Format posters.json:
 * {
 *   "name": "OpenCalc", "label": "…", "icon": "icon.png", "url": "https://redzikowski.com/portfolio/opencalc",
 *   "posters": [{
 *     "platform": "android", "file": "android.png", "title": "Tekst z *akcentem*", "lead": "…",
 *     "shots": [{ "src": "../screenshots/android/01.png", "caption": "…", "sub": "…" }],
 *     "features": ["…"], "meta": "Android 8+ · APK 12 MB"
 *   }]
 * }
 * Ścieżki obrazów są względne wobec katalogu docs/posters.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const brand = resolve(here, '../../public/assets/brand')
const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(path => path && existsSync(path))

const [repoArg, ...only] = process.argv.slice(2)
if (!repoArg) {
  console.error('Użycie: node scripts/posters/build.mjs <repo> [platforma…]')
  process.exit(1)
}
const postersDir = join(resolve(repoArg), 'docs', 'posters')
const manifest = JSON.parse(readFileSync(join(postersDir, 'posters.json'), 'utf8'))
const fileUrl = path => pathToFileURL(isAbsolute(path) ? path : join(postersDir, path)).href

async function size(path) {
  const meta = await sharp(isAbsolute(path) ? path : join(postersDir, path)).metadata()
  return { width: meta.width, height: meta.height }
}

function chrome(html, png) {
  return new Promise((ok, fail) => {
    const child = spawn(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1080,1920',
      '--virtual-time-budget=8000', '--run-all-compositor-stages-before-draw',
      `--user-data-dir=${join(here, '.chrome-profile')}`,
      `--screenshot=${png}`, pathToFileURL(html).href,
    ], { stdio: 'ignore', windowsHide: true })
    child.on('error', fail)
    child.on('exit', code => (code === 0 ? ok() : fail(new Error(`Chrome zakończył się kodem ${code}`))))
  })
}

const template = readFileSync(join(here, 'template.html'), 'utf8')
const url = manifest.url
const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0c0b0aff', light: '#00000000' } })

for (const poster of manifest.posters) {
  if (only.length && !only.includes(poster.platform)) continue
  const layout = poster.layout || (poster.platform === 'windows' || poster.platform === 'linux' ? 'windows' : 'phones')
  const shots = []
  for (const shot of poster.shots) {
    const { width, height } = await size(shot.src)
    shots.push({ ...shot, src: fileUrl(shot.src), ratio: height / width })
  }
  const spec = {
    slug: manifest.slug || manifest.name,
    platform: poster.platform,
    layout,
    name: manifest.name,
    label: poster.label || manifest.label,
    icon: fileUrl(manifest.icon),
    title: poster.title,
    lead: poster.lead,
    shots,
    ratio: layout === 'phones' ? Math.min(2.3, Math.max(1.6, shots[0].ratio)) : undefined,
    features: poster.features || [],
    ctaKicker: poster.ctaKicker,
    ctaTitle: poster.ctaTitle || `${manifest.name} na ${({ android: 'Androida', windows: 'Windows', ios: 'iPhone’a i iPada', linux: 'Linuksa' })[poster.platform] || poster.platform}`,
    url,
    meta: poster.meta,
    qr,
    wordmark: pathToFileURL(join(brand, 'wordmark-redzikowski-com.png')).href,
    mark: pathToFileURL(join(brand, 'favicon-r-512.png')).href,
  }
  const html = join(here, `.render-${spec.slug}-${poster.platform}.html`)
  writeFileSync(html, template.replace(/<script>\r?\nconst S = window.SPEC/, () => `<script>window.SPEC = ${JSON.stringify(spec)}</script>\n<script>\nconst S = window.SPEC`))
  const out = join(postersDir, poster.file)
  mkdirSync(dirname(out), { recursive: true })
  const raw = `${out}.raw.png`
  await chrome(html, raw)
  // PNG z paletą trzyma plakat w rozsądnym rozmiarze w repozytorium i README.
  await sharp(raw).png({ compressionLevel: 9, palette: true, quality: 92, effort: 8 }).toFile(out)
  rmSync(raw)
  rmSync(html)
  console.log(`✓ ${out}`)
}
