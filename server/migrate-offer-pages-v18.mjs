/**
 * Przepisuje podstronę „Strony, aplikacje i autorskie CMS-y” prostym
 * językiem i rozbudowuje ją: rodzaje projektów, galeria, co obejmuje każdy
 * projekt, przebieg współpracy i przejście do portfolio. Zmienia też tytuł
 * i opis karty podstrony o infrastrukturze oraz nagłówek sekcji na stronie
 * głównej. Adresy podstron zostają bez zmian, żeby nie zepsuć linków.
 *
 * Działa raz (znacznik), żeby nie nadpisać późniejszych zmian z panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR || '/app/data'
const pagesFile = path.join(dataDir, 'pages.json')
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-offer-pages-v18')
const here = path.dirname(fileURLToPath(import.meta.url))
const copy = JSON.parse(await fs.readFile(path.join(here, 'copy', 'offer-pages-v18.json'), 'utf8'))

const exists = file => fs.access(file).then(() => true).catch(() => false)

async function writeJson(file, data) {
  const temp = `${file}.tmp`
  await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`)
  await fs.rename(temp, file)
}

if (await exists(markerFile)) process.exit(0)

const now = new Date().toISOString()

if (await exists(pagesFile)) {
  const pages = JSON.parse(await fs.readFile(pagesFile, 'utf8'))
  const next = pages.map(page => {
    if (page.slug === copy.software.slug) {
      const { slug: _slug, blocks, ...fields } = copy.software
      return {
        ...page,
        ...fields,
        blocks: blocks.map(block => ({ id: crypto.randomUUID(), ...block })),
        updatedAt: now,
      }
    }
    if (page.slug === copy.infra.slug) {
      const { slug: _slug, ...fields } = copy.infra
      return { ...page, ...fields, updatedAt: now }
    }
    return page
  })
  await writeJson(pagesFile, next)
  console.log('Podstrony oferty: pages.json')
}

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  content.pagesSection = { ...content.pagesSection, ...copy.pagesSection }
  await writeJson(contentFile, content)
  console.log('Nagłówek podstron: content.json')
}

await fs.writeFile(markerFile, now)
