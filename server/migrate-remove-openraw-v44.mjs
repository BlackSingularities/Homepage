/**
 * Usuwa OpenRAW z portfolio: wpis w `projects.json` i zapamiętane wydania w `releases.json`.
 * Bez wpisu z `repo` znika też proxy aktualizacji `/api/github/repos/BlackSingularities/OpenRAW/...`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const releasesFile = path.join(dataDir, 'releases.json')
const markerFile = path.join(dataDir, '.migration-remove-openraw-v44')
const repo = 'BlackSingularities/OpenRAW'

function isOpenRaw(item) {
  return item?.id === 'prj-openraw' || item?.slug === 'openraw' || item?.repo === repo
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

async function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, file)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(projectsFile)) {
  const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  const current = Array.isArray(stored) ? stored : []
  const next = current.filter(item => !isOpenRaw(item)).map((item, index) => ({ ...item, order: index }))
  if (next.length !== current.length) await writeJson(projectsFile, next)
  console.log(`OpenRAW usunięty z portfolio (${current.length - next.length}).`)
}

if (await exists(releasesFile)) {
  const cache = JSON.parse(await fs.readFile(releasesFile, 'utf8'))
  if (cache && typeof cache === 'object' && repo in cache) {
    delete cache[repo]
    await writeJson(releasesFile, cache)
  }
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
