/**
 * Repozytorium OpenFilePowerWin nazywa się teraz PowerDesk, tak jak program –
 * wpis w portfolio wskazuje nową nazwę. Stara nadal działa w kanale aktualizacji.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-powerdesk-repo-v23')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const next = current.map(item => (String(item?.repo || '').toLowerCase() === 'blacksingularities/openfilepowerwin'
  ? { ...item, repo: 'BlackSingularities/PowerDesk', updatedAt: new Date().toISOString() }
  : item))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)
await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
