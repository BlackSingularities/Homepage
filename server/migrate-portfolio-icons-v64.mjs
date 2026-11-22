/**
 * Ikony Arcadii i OpenPayments w portfolio – jedyne prace, które nie miały
 * jeszcze ikony na karcie. Ustawia je tylko wtedy, gdy pole jest puste
 * (nie nadpisuje tego, co wybrano w panelu).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-portfolio-icons-v64')

const ICONS = {
  arcadia: '/assets/portfolio/arcadia-icon.png',
  openpayments: '/assets/portfolio/openpayments-icon.png',
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const next = current.map(item => {
  const icon = ICONS[item?.slug]
  if (!icon || item.icon) return item
  return { ...item, icon, updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)
await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
