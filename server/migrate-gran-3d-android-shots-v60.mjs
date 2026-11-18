/**
 * GRAŃ na Androida: zrzuty ekranu telefonu w galerii pracy (po zrzutach z Windows) i ponowne pobranie
 * manifestu plakatów z repozytorium, żeby obok plakatu Windows od razu pojawił się plakat Androida.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const postersFile = path.join(dataDir, 'posters.json')
const markerFile = path.join(dataDir, '.migration-gran-3d-android-shots-v60')

const p = name => `/assets/portfolio/gran-3d-android-${name}.webp`
const shots = [
  { src: p('01-teren'), alt: 'Android: teren 3D i szlaki, narzędzia z podpisami w dolnym pasku', altEn: 'Android: 3D terrain and trails, labelled tools in the bottom bar' },
  { src: p('02-trasa'), alt: 'Android: planowanie trasy w arkuszu wysuwanym od dołu', altEn: 'Android: route planning in the bottom sheet' },
  { src: p('03-warunki'), alt: 'Android: pogoda i warunki dla wybranego miejsca', altEn: 'Android: weather and conditions for a chosen place' },
  { src: p('04-punkty'), alt: 'Android: punkty i komentarze innych turystów', altEn: 'Android: points and comments from other hikers' },
  { src: p('05-offline'), alt: 'Android: pobieranie map do użytku bez internetu', altEn: 'Android: downloading maps for offline use' },
  { src: p('07-powitanie'), alt: 'Android: ekran powitalny z przewodnikiem', altEn: 'Android: welcome screen with a short guide' },
]

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

if (await exists(projectsFile)) {
  const current = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  const known = new Set(shots.map(shot => shot.src))
  const next = current.map(item => item?.slug === 'gran-3d'
    ? { ...item, shots: [...(item.shots || []).filter(shot => !known.has(shot?.src)), ...shots], updatedAt: new Date().toISOString() }
    : item)
  const temporary = `${projectsFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, projectsFile)
}

// plakaty: wpis GRANI z pamięci podręcznej znika, więc następne wejście pobiera manifest od nowa
if (await exists(postersFile)) {
  const cache = JSON.parse(await fs.readFile(postersFile, 'utf8'))
  for (const key of Object.keys(cache)) if (key.toLowerCase().endsWith('#gran-3d')) delete cache[key]
  const temporary = `${postersFile}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, postersFile)
}

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log('GRAŃ: zrzuty Androida w galerii, plakaty do odświeżenia.')
