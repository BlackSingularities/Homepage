/**
 * OpenTimer, OpenTests i OpenCalc pokazywały obok siebie stare i nowe wersje tych samych ekranów
 * (po v65). Usuwa stare zrzuty razem z ich angielskimi opisami (ten sam indeks w `en.shotAlts`),
 * a okładkę przestawia na pierwszy aktualny zrzut.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-old-shots-v66')

const p = name => `/assets/portfolio/${name}.webp`
const OLD = {
  opentimer: [p('opentimer-01-zegar'), p('opentimer-02-stoper'), p('opentimer-03-minutnik'), p('opentimer-04-kalkulator-czasu')],
  opentests: [p('opentests-01-start'), p('opentests-02-kreator'), p('opentests-03-test'), p('opentests-04-tablice')],
  opencalc: [p('opencalc-01-kalkulator'), p('opencalc-02-wykresy'), p('opencalc-03-przeliczniki'), p('opencalc-04-narzedzia')],
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
let removed = 0
const next = current.map(item => {
  const old = OLD[item?.slug]
  if (!old) return item
  const shots = Array.isArray(item.shots) ? item.shots : []
  const alts = Array.isArray(item.en?.shotAlts) ? item.en.shotAlts : []
  const keep = shots.map((shot, index) => ({ shot, alt: alts[index] ?? '' })).filter(({ shot }) => !old.includes(shot.src))
  if (keep.length === shots.length || !keep.length) return item
  removed += shots.length - keep.length
  return {
    ...item,
    cover: old.includes(item.cover) ? keep[0].shot.src : item.cover,
    shots: keep.map(entry => entry.shot),
    ...(item.en ? { en: { ...item.en, shotAlts: keep.map(entry => entry.alt) } } : {}),
    updatedAt: new Date().toISOString(),
  }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Usunięte stare zrzuty: ${removed}.`)
