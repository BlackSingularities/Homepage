#!/usr/bin/env node
/**
 * Wstawia (albo odświeża) plakaty na początku README repozytorium aplikacji.
 *
 *   node scripts/posters/readme.mjs <katalog-repozytorium>
 *
 * Blok stoi między znacznikami <!-- posters:start --> i <!-- posters:end -->,
 * zaraz pod pierwszym nagłówkiem. Kolejne uruchomienia tylko go podmieniają.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repo = resolve(process.argv[2] || '.')
const manifest = JSON.parse(readFileSync(join(repo, 'docs/posters/posters.json'), 'utf8'))
const readmePath = ['README.md', 'readme.md', 'Readme.md'].map(name => join(repo, name)).find(existsSync) || join(repo, 'README.md')
const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n') : `# ${manifest.name}\n`

const NAMES = { android: 'Android', ios: 'iPhone i iPad', windows: 'Windows', linux: 'Linux' }
const width = manifest.posters.length === 1 ? 460 : manifest.posters.length === 2 ? 400 : 300
const images = manifest.posters
  .map(poster => `<img src="docs/posters/${poster.file}" alt="${manifest.name} – ${NAMES[poster.platform] || poster.platform}" width="${width}">`)
  .join('\n  ')
const block = `<!-- posters:start -->
<p align="center">
  ${images}
</p>

<p align="center"><a href="${manifest.url}">${manifest.url.replace(/^https?:\/\//, '')}</a></p>
<!-- posters:end -->`

let next
if (readme.includes('<!-- posters:start -->')) {
  next = readme.replace(/<!-- posters:start -->[\s\S]*?<!-- posters:end -->/, block)
} else {
  const lines = readme.split('\n')
  const heading = lines.findIndex(line => /^#\s/.test(line))
  const at = heading === -1 ? 0 : heading + 1
  lines.splice(at, 0, '', block)
  next = lines.join('\n')
}
writeFileSync(readmePath, next.replace(/\n{3,}/g, '\n\n'))
console.log(`✓ ${readmePath}`)
