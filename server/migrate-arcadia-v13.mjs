/**
 * Wstawia Arcadię na początek portfolio.
 *
 * Portfolio startowało puste, a ta pozycja ma stać pierwsza – i na stronie
 * głównej, i w katalogu. Jeśli wpis już istnieje, migracja tylko przesuwa go
 * na początek i odświeża zrzuty, więc da się ją puścić ponownie bez szkody.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-arcadia-v13')

const SHOTS = [
  ['arcadia-01-katalog', 'Katalog Arcadii: 75 pozycji z filtrami rodzaju i kategorii'],
  ['arcadia-02-filtry', 'Filtrowanie katalogu po kategoriach i sortowanie pozycji'],
  ['arcadia-03-tetris', 'Tetris: plansza w trakcie gry, kolejka klocków i wynik'],
  ['arcadia-04-lunaris', 'LUNARIS: start Saturna V z komputerem pokładowym misji'],
  ['arcadia-05-chrono-rally', 'Chrono Rally: kalendarz sezonu, wybór auta i cele odcinka'],
  ['arcadia-06-metro-manager', 'Metro Manager: mapa miasta i planowanie pierwszej linii'],
  ['arcadia-07-wykresy', 'Wykresy funkcji: kilka funkcji naraz z miejscami zerowymi'],
  ['arcadia-08-chemia', 'Toolbox chemiczny: układ okresowy z danymi pierwiastka'],
  ['arcadia-09-color-lab', 'Color Lab: konwersja koloru między HEX, RGB, HSL i OKLCH'],
  ['arcadia-10-pianino', 'Pianino: klawiatura z nauką melodii i metronomem'],
]

const project = {
  id: 'prj-arcadia',
  slug: 'arcadia',
  name: 'Arcadia',
  kind: 'web',
  label: 'Gry i narzędzia / aplikacja webowa',
  year: '2026',
  tagline: 'Czterdzieści gier i trzydzieści pięć narzędzi, które liczą się w przeglądarce – bez instalowania, reklam i kont.',
  summary: 'Jeden katalog zamiast rozsypanych zakładek: klasyki w świeżym wydaniu, zupełnie nowe pomysły i warsztat narzędzi, które naprawdę przydają się w pracy i w nauce.',
  body: 'Każda pozycja to osobna, dopracowana rzecz, a nie wariant tego samego szablonu. Tetris ma hold i kombosy, LUNARIS odtwarza pełny lot Apollo z siedmioma etapami i fizyką modułu, Chrono Rally prowadzi kierowcę przez sezon mistrzostw z oponami, paliwem i duchem najlepszego okrążenia, a Metro Manager jest spokojną strategią o projektowaniu linii w rosnącym mieście.\n\nNarzędzia idą tą samą drogą: układ okresowy z pełnymi danymi pierwiastków, wykresy funkcji z miejscami zerowymi i pochodną, Color Lab przeliczający kolory między HEX, RGB, HSL i OKLCH razem z kontrastem WCAG, pianino z nauką melodii. Wszystko liczy się lokalnie – pliki nie opuszczają komputera i nie ma żadnego konta do założenia.\n\nCałość spina wspólny katalog z filtrami, wyszukiwarką i paletą poleceń pod Ctrl+K, wspólne rankingi po stronie serwera oraz jeden system wizualny, którego ta strona jest częścią: to samo tło ze znaków i ta sama typografia.',
  role: 'Pomysł, projekt, grafika, kod, wdrożenie i rozwój',
  stack: ['Next.js', 'TypeScript', 'React', 'Canvas', 'Web Audio'],
  features: [
    '40 gier i 35 narzędzi w jednym katalogu',
    'wszystko liczy się lokalnie, bez wysyłania plików',
    'wspólne rankingi i paleta poleceń Ctrl+K',
    'pełna obsługa dotykowa i tryb pełnoekranowy',
  ],
  cover: '/assets/portfolio/arcadia-01-katalog.webp',
  shots: SHOTS.map(([name, alt]) => ({ src: `/assets/portfolio/${name}.webp`, alt })),
  siteUrl: '/Arcadia/',
  siteHidden: false,
  repo: '',
  repoHidden: true,
  releaseSource: 'none',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(item => item.id === project.id || item.slug === project.slug)
const rest = current.filter(item => item !== previous)

// zachowujemy teksty, jeśli ktoś zdążył je już poprawić w panelu
const entry = {
  ...project,
  ...(previous || {}),
  cover: project.cover,
  shots: project.shots,
  featured: true,
  published: true,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const next = [entry, ...rest].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Arcadia na pierwszym miejscu portfolio (${next.length} pozycji).`)
