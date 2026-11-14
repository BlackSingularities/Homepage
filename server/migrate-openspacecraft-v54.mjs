/**
 * Dodaje OpenSpacecraft (atlas misji kosmicznych 3D na Windows) do portfolio, obok GRANI.
 *
 * Plik do pobrania pochodzi z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Wpis z `repo` uruchamia też adres
 * `/api/releases/repos/BlackSingularities/OpenSpacecraft/releases/latest`, z którego program
 * sprawdza aktualizacje. Zgłoszenia z aplikacji przychodzą z `app: 'openspacecraft'`, a plakat
 * serwer pobiera sam z `docs/posters/posters.json` w repozytorium.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openspacecraft-v54')

const shots = [
  { src: '/assets/portfolio/openspacecraft-01-satelity.webp', alt: 'Ziemia z dziesiątkami tysięcy obiektów na orbicie, katalog misji i oś czasu' },
  { src: '/assets/portfolio/openspacecraft-02-voyager-2.webp', alt: 'Wielka podróż Voyagera 2 po rzeczywistej trajektorii JPL Horizons' },
  { src: '/assets/portfolio/openspacecraft-03-starty.webp', alt: 'Starty orbitalne wybranego roku i kosmodromy na globie' },
  { src: '/assets/portfolio/openspacecraft-04-jowisz.webp', alt: 'Przelot Voyagera 1 obok Jowisza i jego księżyców' },
]

const project = {
  id: 'prj-openspacecraft',
  slug: 'openspacecraft',
  name: 'OpenSpacecraft',
  kind: 'app',
  label: 'Atlas misji kosmicznych 3D / Windows',
  year: '2026',
  tagline: 'Układ Słoneczny w dowolnej chwili od Sputnika: misje odtwarzane po prawdziwych trajektoriach, satelity na orbicie i każdy start orbitalny.',
  summary: 'Trójwymiarowy atlas ery kosmicznej. Planety, Księżyc, księżyce, planetoidy i komety w dowolnej chwili od 1957 do 2100 roku, 85 misji od Sputnika do Artemis II z przebiegiem i osiągnięciami, wszystkie skatalogowane obiekty na orbicie okołoziemskiej oraz starty z każdego roku.',
  body: '49 sond leci po rzeczywistych trajektoriach z JPL Horizons – Voyagery, Pioneery, Galileo, Cassini, New Horizons, Juno, Rosetta, Parker, Teleskop Webba, Artemis I i II. Pozostałe misje, jak Wostok, Apollo czy Łuna, są odtworzone modelem fizycznym: wznoszenie z kosmodromu, orbita parkingowa, łuki Keplera wyznaczone z zagadnienia Lamberta między prawdziwymi położeniami ciał, przeloty, orbity wokół celu, lądowania i powroty. Dla każdej misji widać czas lotu, odległość, prędkość, wysokość nad najbliższym ciałem i opóźnienie sygnału, a wydarzenia na osi czasu przenoszą do konkretnej chwili.\n\nPlanety liczone są teorią VSOP87, Księżyc – ELP-2000/82, a parametry, obrót i uproszczone tekstury ciał pochodzą z symulatora Orbiter. Na orbicie okołoziemskiej widać około 69 tysięcy obiektów z katalogu SATCAT: satelity aktywne liczone modelem SGP4, pozostałe – także historyczne – po orbitach odtworzonych z katalogu, więc populację można obejrzeć z dowolnego dnia. Zakładka startów pokazuje wszystkie starty orbitalne wybranego roku i kosmodromy na globie.\n\nZegar symulacji przyspiesza do kilku lat na sekundę albo cofa czas. Interfejs ze szkła nad sceną jak w GRANI, po polsku i angielsku; zgłoszenia błędów i kolejne wersje przychodzą przez redzikowski.com. Napisany w Ruście z wgpu i egui.',
  role: 'Projekt, mechanika lotu, baza misji, renderowanie, interfejs i wydania',
  stack: ['Rust', 'wgpu', 'WGSL', 'egui', 'SGP4', 'JPL Horizons'],
  features: [
    'Układ Słoneczny w dowolnej chwili 1957–2100',
    '85 misji, 49 po trajektoriach JPL Horizons',
    'satelity na orbicie z dowolnego dnia (SATCAT, SGP4)',
    'starty orbitalne każdego roku i kosmodromy',
    'Windows 10 i 11, instalator z aktualizacjami',
  ],
  icon: '/assets/portfolio/openspacecraft-icon.png',
  cover: '',
  shots,
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenSpacecraft',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
}

function isOpenSpacecraft(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === project.name
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenSpacecraft)
const rest = current.filter(item => !isOpenSpacecraft(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenSpacecraft wchodzi tuż za GRAŃ – oba atlasy 3D stoją obok siebie.
const anchor = ['gran-3d', 'openfps', 'openaudiopower'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenSpacecraft w portfolio na pozycji ${at + 1} z ${next.length}.`)
