/**
 * Dodaje Polskie Studio Map (atlas warstw mapowych Polski 3D) do portfolio, zaraz za GRANIĄ.
 *
 * Program na Windows: instalator z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Link do repozytorium jest ukryty – program publikowany jest przez redzikowski.com. Wpis z `repo`
 * uruchamia też proxy aktualizacji `/api/github/repos/BlackSingularities/polskie-studio-map/releases/latest`,
 * z którego program pobiera kolejne wersje (instalator sprawdzany sumą SHA-512 z `latest.yml`).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-polskie-studio-map-v45')

const project = {
  id: 'prj-polskie-studio-map',
  slug: 'polskie-studio-map',
  name: 'Polskie Studio Map',
  kind: 'app',
  label: 'Atlas warstw mapowych Polski 3D / Windows',
  year: '2026',
  tagline: 'Trójwymiarowy atlas Polski: rzeczywisty model terenu, ortofotomapa GUGiK i dane OpenStreetMap, z których powstaje multimapa z dziesiątkami warstw.',
  summary: 'Natywny program na Windows napisany w Rust. Teren całej Polski z poziomami szczegółów, ortofotomapa GUGiK, szlaki i punkty z OpenStreetMap oraz analizy widoczności, wysokości i cieni.',
  body: 'Polskie Studio Map pokazuje całą Polskę w trzech wymiarach: teren wczytuje się kaflami wokół kamery, a z bliska pojawia się ortofotomapa GUGiK. Słońce świeci według daty i godziny, rzeźba rzuca cienie, a dane zapisują się same podczas oglądania, z limitem miejsca na dysku.\n\nSoczewki pokazują na żywo teren na tej samej wysokości, wysokość względną i to, co widać z miejsca pod kursorem. Jest pomiar po terenie z linią wzroku, panorama z dowolnego punktu i wyszukiwarka miejsc w Polsce.\n\nTo pierwsza wersja: kolejne przyniosą włączane warstwy z oficjalnych źródeł. Program sam pobiera nowe wersje z redzikowski.com.',
  role: 'Pomysł, projekt, renderer terenu (wgpu), analizy, przetwarzanie danych, interfejs, instalator i wydania',
  stack: ['Rust', 'wgpu', 'egui', 'WGSL', 'OpenStreetMap', 'NSIS'],
  features: [
    'teren 3D całej Polski z poziomami szczegółów i ortofoto GUGiK',
    'szlaki i punkty z OpenStreetMap, wyszukiwarka miejsc w Polsce',
    'Słońce według daty i godziny, cienie rzeźby, śnieg i pora roku',
    'widoczność, wysokość względna, ta sama wysokość, linia wzroku i panorama',
    'dane zapisywane podczas oglądania; Windows 10/11, aktualizacje z redzikowski.com',
  ],
  icon: '/assets/portfolio/polskie-studio-map-icon.png',
  cover: '/assets/portfolio/polskie-studio-map-cover.webp',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/polskie-studio-map',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
  order: 10,
}

function isSame(item) {
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

const previous = current.find(isSame)
const rest = current.filter(item => !isSame(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Wchodzi tuż za GRANIĄ (albo na początek, gdy jej nie ma).
const after = rest.findIndex(item => item.slug === 'gran-3d')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Polskie Studio Map w portfolio na pozycji ${at + 1} z ${next.length}.`)
