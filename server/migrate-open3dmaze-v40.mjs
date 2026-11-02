/**
 * Dodaje Open3Dmaze do portfolio, zaraz za OpenCalc.
 *
 * Gra na Androida: plik APK z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Link do repozytorium jest ukryty – gra publikowana jest przez redzikowski.com. Wpis z `repo`
 * uruchamia też proxy aktualizacji `/api/github/repos/BlackSingularities/Open3Dmaze/releases/latest`,
 * z którego aplikacja pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-open3dmaze-v40')

const project = {
  id: 'prj-open3dmaze',
  slug: 'open3dmaze',
  name: 'Open3Dmaze',
  kind: 'app',
  label: 'Gra – labirynt 3D / Android',
  year: '2026',
  tagline: 'Labirynt sterowany pochyleniem telefonu, w którym płaska plansza ożywa: ściany wyrastają w stronę gracza i przechylają się razem z ekranem.',
  summary: 'Kulka toczy się tam, gdzie pochylisz telefon, a każda ściana jest bryłą rzutowaną na żywo względem punktu zbiegu, który podąża za pochyleniem. Kampania, sześć innych trybów, pułapki i czarny interfejs AMOLED.',
  body: 'Labirynt jest płaski, ale nie wygląda płasko. Każda ściana to graniastosłup, którego wierzch odsuwa się od punktu zbiegu, a ten punkt wędruje razem z pochyleniem telefonu. Ściany wyrastają więc w stronę gracza i płynnie przechylają się na boki. Klejnoty unoszą się nad podłogą, dziury mają głębię, a nad metą stoi słup światła.\n\nKampania ma pięć światów i 60 poziomów, po trzy gwiazdki za ukończenie, wszystkie klejnoty i czas poniżej „par”. Do tego Labirynt dnia z serią dni, Bez końca, Wyścig z czasem, Mrok, Zen i Własny labirynt z rozmiarem, pułapkami i ziarnem. Na planszy czekają dziury, lód, portale, przyspieszacze i punkty kontrolne.\n\nUstawić można wysokość ścian, siłę ich ruchu, przybliżenie, czułość i kalibrację, sterowanie palcem, siedem kolorów akcentu i osiem kulek. Są też statystyki i 16 osiągnięć. Aplikacja sama pobiera kolejne wersje z redzikowski.com.',
  role: 'Pomysł, projekt gry, silnik fizyki i renderowania, generator labiryntów, implementacja i wydania',
  stack: ['Kotlin', 'Jetpack Compose', 'Canvas', 'Czujnik grawitacji'],
  features: [
    'ściany 3D przechylające się razem z telefonem',
    'kampania: 5 światów, 60 poziomów, po 3 gwiazdki',
    'Labirynt dnia, Bez końca, Wyścig z czasem, Mrok, Zen i Własny labirynt',
    'dziury, lód, portale, przyspieszacze, punkty kontrolne i klejnoty',
    'kolory akcentu, kulki, statystyki, osiągnięcia; Android 10+, aktualizacje z redzikowski.com',
  ],
  icon: '/assets/portfolio/open3dmaze-icon.png',
  cover: '/assets/portfolio/open3dmaze-cover.webp',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/Open3Dmaze',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
  order: 8,
}

function isOpen3Dmaze(item) {
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

const previous = current.find(isOpen3Dmaze)
const rest = current.filter(item => !isOpen3Dmaze(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Open3Dmaze wchodzi tuż za OpenCalc – obok innych aplikacji na Androida.
const after = rest.findIndex(item => item.slug === 'opencalc')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Open3Dmaze w portfolio na pozycji ${at + 1} z ${next.length}.`)
