/**
 * Okładka i zrzuty ekranu PowerDesk – tylko gdy wpis jeszcze ich nie ma
 * (nie nadpisuje tego, co ustawiono w panelu).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-powerdesk-shots-v24')

const SHOTS = [
  ['powerdesk-01-komputer', 'Widok Komputer: procesor, pamięć, dyski, foldery i narzędzia systemu'],
  ['powerdesk-02-ustawienia', 'Ustawienia przeglądania i sekcji panelu bocznego'],
  ['powerdesk-03-galeria', 'Folder ze zdjęciami w widoku galerii'],
]

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const next = current.map(item => {
  if (item?.slug !== 'powerdesk') return item
  return {
    ...item,
    cover: item.cover || '/assets/portfolio/powerdesk-cover.webp',
    shots: item.shots?.length ? item.shots : SHOTS.map(([name, alt]) => ({ src: `/assets/portfolio/${name}.webp`, alt })),
    updatedAt: new Date().toISOString(),
  }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)
await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
