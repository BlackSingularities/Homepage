/**
 * Dodaje OpenFPS (nakładka FPS i metryk systemu na Windows) do portfolio, obok innych
 * aplikacji na Windows.
 *
 * Plik do pobrania pochodzi z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Wpis z `repo` uruchamia też adres
 * `/api/releases/repos/BlackSingularities/OpenFPS/releases/latest`, z którego program
 * sprawdza aktualizacje. Zgłoszenia z aplikacji przychodzą z `app: 'openfps'`, a plakat
 * serwer pobiera sam z `docs/posters/posters.json` w repozytorium.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openfps-v50')

const shots = [
  { src: '/assets/portfolio/openfps-01-szczegolowy.webp', alt: 'Tryb szczegółowy: FPS, czas klatki, 1% i 0.1% low, wykres, CPU, GPU i pamięć' },
  { src: '/assets/portfolio/openfps-02-prosty.webp', alt: 'Tryb prosty: kompaktowy pasek z FPS i czasem klatki' },
  { src: '/assets/portfolio/openfps-03-ustawienia.webp', alt: 'Ustawienia wyglądu: sześć motywów, typografia, kolory i proporcje' },
]

const project = {
  id: 'prj-openfps',
  slug: 'openfps',
  name: 'OpenFPS',
  kind: 'app',
  label: 'Nakładka FPS i metryk systemu / Windows',
  year: '2026',
  tagline: 'Lekka nakładka pokazująca FPS, czas klatki i obciążenie sprzętu – na jednym lub kilku ekranach, bez wstrzykiwania kodu do gier.',
  summary: 'Nakładka na ekran z trybem prostym i szczegółowym, uruchamiana wybranym skrótem klawiszowym. Mierzy FPS, czas klatki, 1% i 0.1% low oraz rysuje wykresy, a obok pokazuje CPU, GPU, temperatury, pamięć, sieć i dysk. Każdy monitor może mieć własną nakładkę z wartościami aplikacji, która jest na nim.',
  body: 'FPS jest mierzony przez Event Tracing for Windows – tą samą metodą co PresentMon – więc nic nie jest wstrzykiwane do gier i program jest bezpieczny dla systemów anty-cheat. Działa z DirectX 9–12, OpenGL i Vulkanem. Dla każdego ekranu wybierana jest aplikacja, która na nim renderuje, dzięki czemu kilka monitorów pokazuje osobne wartości.\n\nTryb prosty to kompaktowy pasek z najważniejszymi liczbami, a szczegółowy – panel z wykresem czasu klatki, obciążeniem procesora i karty, zegarami, poborem mocy, VRAM i RAM. Kolejność i zestaw pozycji ustawia się osobno dla każdego trybu. Sześć motywów, dowolna czcionka, kolory z przezroczystością, cień lub kontur tekstu, progi kolorów, pozycja z siatki 3×3 albo przeciągnięcie myszą oraz własne skróty klawiszowe pozwalają dopasować wygląd do każdej gry. Nakładka nie zmienia rozmiaru w trakcie działania i nie pokazuje nazwy aplikacji.\n\nProgram jest bardzo lekki: rysuje się programowo i tylko wtedy, gdy zmienią się dane, zbiera wyłącznie włączone metryki, a ukryty niczego nie mierzy. Działa po polsku i angielsku, zgłoszenia błędów i sugestii wysyła przez redzikowski.com, a kolejne wersje pobiera sam. Napisany w Ruście z Direct2D i egui.',
  role: 'Projekt, pomiar klatek, interfejs, implementacja i wydania',
  stack: ['Rust', 'ETW', 'Direct2D', 'DirectWrite', 'egui'],
  features: [
    'pomiar FPS przez ETW, bezpieczny dla anty-cheatów',
    'tryb prosty i szczegółowy, 1% i 0.1% low, wykresy',
    'wiele monitorów z osobnymi wartościami',
    'motywy, kolory, czcionki, pozycja i skróty klawiszowe',
    'Windows 10 i 11, jeden przenośny plik',
  ],
  icon: '/assets/portfolio/openfps-icon.png',
  cover: '',
  shots,
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenFPS',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
}

function isOpenFPS(item) {
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

const previous = current.find(isOpenFPS)
const rest = current.filter(item => !isOpenFPS(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenFPS wchodzi za OpenAudioPower – aplikacje na Windows stoją obok siebie.
const anchor = ['openaudiopower', 'openpano', 'openmp', 'opendtp'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenFPS w portfolio na pozycji ${at + 1} z ${next.length}.`)
