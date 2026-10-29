/**
 * Wpis z repozytorium OpenFilePowerWin w portfolio nazywa się tak jak repozytorium,
 * a nie PowerDesk – zmienia nazwę, adres i wzmianki w opisie.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openfilepowerwin-v23')

const rename = value => (typeof value === 'string' ? value.replaceAll('PowerDesk', 'OpenFilePowerWin') : value)

function retitle(item) {
  const next = { ...item }
  for (const field of ['name', 'tagline', 'summary', 'body']) next[field] = rename(next[field])
  next.features = (next.features || []).map(rename)
  if (next.en) next.en = retitle(next.en)
  return next
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const next = current.map(item => {
  if (String(item?.repo || '').toLowerCase() !== 'blacksingularities/openfilepowerwin') return item
  return { ...retitle(item), slug: item.slug === 'powerdesk' ? 'openfilepowerwin' : item.slug, updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)
await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
