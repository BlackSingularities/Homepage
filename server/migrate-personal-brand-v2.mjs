/**
 * Jednorazowo przenosi istniejącą treść produkcyjną na nową, osobistą narrację.
 * Zachowuje dane kontaktowe, realizacje i pozostałe dane tworzone w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-personal-brand-v2')
const backupFile = path.join(dataDir, 'content.before-personal-brand-v2.json')

const defaultContent = JSON.parse(
  await fs.readFile(new URL('./content.default.json', import.meta.url), 'utf8'),
)

const replacedSections = [
  'hero',
  'manifesto',
  'services',
  'intelligence',
  'process',
  'about',
  'faq',
  'pagesSection',
  'contact',
]

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const next = structuredClone(content)

  next.brand = {
    ...(content.brand || {}),
    role: defaultContent.brand.role,
    tagline: defaultContent.brand.tagline,
    location: defaultContent.brand.location,
  }

  for (const section of replacedSections) {
    next[section] = structuredClone(defaultContent[section])
  }

  const labels = new Map(defaultContent.work.items.map(item => [item.id, item.label]))
  next.work = {
    ...(content.work || {}),
    kicker: defaultContent.work.kicker,
    title: defaultContent.work.title,
    accent: defaultContent.work.accent,
    lead: defaultContent.work.lead,
    items: Array.isArray(content.work?.items)
      ? content.work.items.map(item => labels.has(item.id) ? { ...item, label: labels.get(item.id) } : item)
      : structuredClone(defaultContent.work.items),
  }

  if (!await exists(backupFile)) await fs.copyFile(contentFile, backupFile)
  const temporary = `${contentFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, contentFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
