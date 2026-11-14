/**
 * Ukrywa link do repozytorium GitHuba we wszystkich pracach portfolio (w tym OpenFPS).
 *
 * `repoHidden` usuwa adres repozytorium z publicznego API, strony pracy i wersji dla
 * wyszukiwarek. Samo pole `repo` zostaje – dalej służy do pobierania wydań i jako kanał
 * aktualizacji `/api/releases/repos/...`. Pojedynczą pracę można z powrotem odsłonić w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-repo-hidden-v51')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

let changed = 0
const next = current.map(item => {
  if (item?.repoHidden === true) return item
  changed += 1
  return { ...item, repoHidden: true, updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Link do GitHuba ukryty w ${changed} z ${next.length} prac.`)
