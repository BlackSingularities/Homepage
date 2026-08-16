/**
 * Dodaje wzmiankę o fotografii i projekt galerii do istniejącej treści.
 * Pozostałe treści edytowane w panelu pozostają bez zmian.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-gallery-integration-v1')
const backupFile = path.join(dataDir, 'content.before-gallery-integration-v1.json')

const defaults = JSON.parse(
  await fs.readFile(new URL('./content.default.json', import.meta.url), 'utf8'),
)

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const gallery = defaults.work.items.find(item => item.id === 'prj-gallery')
  const items = Array.isArray(content.work?.items) ? content.work.items : []
  const withoutOldGallery = items.filter(item => item.id !== 'prj-gallery')
  const next = {
    ...content,
    work: {
      ...content.work,
      lead: defaults.work.lead,
      items: [...withoutOldGallery, structuredClone(gallery)],
    },
    about: {
      ...content.about,
      lead: defaults.about.lead,
      text: defaults.about.text,
    },
  }

  if (!await exists(backupFile)) await fs.copyFile(contentFile, backupFile)
  const temporary = `${contentFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, contentFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
