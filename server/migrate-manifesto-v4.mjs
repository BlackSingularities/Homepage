/** Aktualizuje wyłącznie manifest, zachowując pozostałą treść z panelu. */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const contentFile = path.join(dataDir, 'content.json')
const markerFile = path.join(dataDir, '.migration-manifesto-v4')
const backupFile = path.join(dataDir, 'content.before-manifesto-v4.json')
const defaults = JSON.parse(await fs.readFile(new URL('./content.default.json', import.meta.url), 'utf8'))

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(contentFile)) {
  const content = JSON.parse(await fs.readFile(contentFile, 'utf8'))
  const next = { ...content, manifesto: structuredClone(defaults.manifesto) }
  if (!await exists(backupFile)) await fs.copyFile(contentFile, backupFile)
  const temporary = `${contentFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, contentFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
