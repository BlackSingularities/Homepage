/**
 * SEO każdej pracy w portfolio: własny tytuł i opis do wyników wyszukiwania, słowa kluczowe,
 * kategoria aplikacji (schema.org) i pytania FAQ – po polsku i angielsku. Treści leżą
 * w server/copy/seo-v62.json. Pola uzupełniamy tylko wtedy, gdy są puste, więc to,
 * co zostało już poprawione w panelu, zostaje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-seo-v62')
const copyFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'copy', 'seo-v62.json')

const exists = file => fs.access(file).then(() => true).catch(() => false)
const empty = value => (Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim())
const faq = list => list.map(([q, a]) => ({ q, a }))

function fill(target, source) {
  const next = { ...target }
  if (empty(next.seoTitle)) next.seoTitle = source.t
  if (empty(next.seoDescription)) next.seoDescription = source.d
  if (empty(next.keywords)) next.keywords = source.k
  if (empty(next.faq)) next.faq = faq(source.f)
  return next
}

if (await exists(markerFile)) process.exit(0)

if (await exists(projectsFile)) {
  const copy = JSON.parse(await fs.readFile(copyFile, 'utf8'))
  const current = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  let touched = 0
  const next = current.map(item => {
    const entry = copy[item?.slug]
    if (!entry) return item
    touched += 1
    return {
      ...fill(item, entry.pl),
      category: item.category || entry.c,
      en: fill(item.en || {}, entry.en),
      updatedAt: new Date().toISOString(),
    }
  })
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
  console.log(`SEO portfolio: uzupełniono ${touched} z ${current.length} prac.`)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
