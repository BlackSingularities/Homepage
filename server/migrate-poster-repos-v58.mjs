/**
 * Plakaty dla wszystkich prac w portfolio. Arcadia i ProjectTravel nie miały przypiętego repozytorium,
 * więc serwer nie mógł pobrać ich `docs/posters/posters.json`. Przypinamy repozytoria z ukrytym linkiem
 * (`repoHidden: true`) – na stronie nic poza plakatem się nie zmienia.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-poster-repos-v58')

const REPOS = {
  arcadia: 'BlackSingularities/Arcadia',
  projecttravel: 'BlackSingularities/ProjectTravel-new',
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
let changed = 0
const next = current.map(item => {
  const repo = REPOS[item?.slug]
  if (!repo || item.repo) return item
  changed += 1
  return { ...item, repo, repoHidden: true, updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Przypięto repozytoria plakatów: ${changed}.`)
