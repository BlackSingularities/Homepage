/**
 * Dodaje GRAŃ (atlas szlaków górskich 3D) do portfolio, zaraz za Open3Dmaze.
 *
 * Program na Windows: instalator z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Link do repozytorium jest ukryty – program publikowany jest przez redzikowski.com. Wpis z `repo`
 * uruchamia też proxy aktualizacji `/api/github/repos/BlackSingularities/gran-3d/releases/latest`,
 * z którego program pobiera kolejne wersje (instalator sprawdzany sumą SHA-512 z `latest.yml`).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-gran-3d-v42')

const project = {
  id: 'prj-gran-3d',
  slug: 'gran-3d',
  name: 'GRAŃ',
  kind: 'app',
  label: 'Atlas szlaków górskich 3D / Windows',
  year: '2026',
  tagline: 'Trójwymiarowy atlas gór: rzeczywisty model terenu, znakowane szlaki z OpenStreetMap, trasy z wariantami, widoczność i cienie o dowolnej porze dnia.',
  summary: 'Natywny program na Windows napisany w Rust. Teren całej Europy z poziomami szczegółów, LiDAR i ortofotomapa dla Polski, Czech i Słowacji, szlaki PTTK, planowanie tras z czasami i profilem, analizy widoczności i wysokości – także bez internetu.',
  body: 'GRAŃ łączy rzeczywisty model terenu z siecią znakowanych szlaków. Teren wczytuje się kaflami wokół kamery, od widoku całych Karpat po pojedyncze żleby, a w Polsce i Czechach można pobrać model LiDAR 3 m i ortofotomapę z usług krajowych. Słońce świeci według daty i godziny, rzeźba rzuca cienie, a śnieg i barwy jesieni zmieniają się z porą roku.\n\nTrasy wyznacza się klikając punkty na mapie: program od razu proponuje warianty – najszybszy, najkrótszy, z najmniejszą sumą podejść i najłatwiejszy – z czasem według reguły PTTK albo DIN 33466, punktami GOT, profilem wysokości barwionym nachyleniem i przelotem kamery nad trasą. Ślady GPX można wczytać i zapisać, a link gran:// otwiera ten sam widok u kogoś innego.\n\nSoczewki pokazują na żywo teren na tej samej wysokości, wysokość względną i to, co widać z miejsca pod kursorem. Jest pomiar po terenie z linią wzroku, panorama z dowolnego punktu, wyszukiwarka szczytów, schronisk i szlaków oraz menedżer obszarów do pracy bez internetu z limitem miejsca na dysku. Program sam pobiera kolejne wersje z redzikowski.com.',
  role: 'Pomysł, projekt, renderer terenu (wgpu), trasowanie i analizy, przetwarzanie danych OSM i LiDAR, interfejs, instalator i wydania',
  stack: ['Rust', 'wgpu', 'egui', 'WGSL', 'OpenStreetMap', 'NSIS'],
  features: [
    'teren 3D całej Europy z poziomami szczegółów, LiDAR 3 m i ortofoto (PL, CZ, SK)',
    'szlaki PTTK z OSM, warianty tras, czasy PTTK i DIN, punkty GOT, profil wysokości',
    'Słońce według daty i godziny, cienie rzeźby, śnieg i pora roku',
    'widoczność, wysokość względna, ta sama wysokość, linia wzroku i panorama',
    'GPX, linki do widoku, praca bez internetu; Windows 10/11, aktualizacje z redzikowski.com',
  ],
  icon: '/assets/portfolio/gran-3d-icon.png',
  cover: '/assets/portfolio/gran-3d-cover.webp',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/gran-3d',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
  order: 9,
}

function isGran(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.repo === project.repo
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isGran)
const rest = current.filter(item => !isGran(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// GRAŃ wchodzi tuż za Open3Dmaze (albo na początek, gdy jej nie ma).
const after = rest.findIndex(item => item.slug === 'open3dmaze')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`GRAŃ w portfolio na pozycji ${at + 1} z ${next.length}.`)
