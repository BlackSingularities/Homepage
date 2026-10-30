/**
 * Dodaje OpenTimer do portfolio, zaraz za OpenCalc.
 *
 * To aplikacja na Androida, więc pliki do pobrania bierze wprost z najnowszego wydania
 * na GitHubie (`releaseSource: 'github'`), a strona pokazuje tylko plik APK
 * (`repoHidden: true`). Dzięki wpisowi z `repo` działa też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/OpenTimer/releases/latest`, z którego aplikacja
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-opentimer-v28')

const project = {
  id: 'prj-opentimer',
  slug: 'opentimer',
  name: 'OpenTimer',
  kind: 'app',
  label: 'Zegar i budzik / Android',
  year: '2026',
  tagline: 'Zegar, budzik, stoper, minutnik, pomodoro i interwały w jednej aplikacji – dopracowane w każdym szczególe.',
  summary: 'Wszystko, co odmierza czas, w jednym miejscu: budziki z zadaniem przed wyłączeniem, stoper z okrążeniami, wiele minutników naraz, treningi interwałowe, metronom i odliczanie do ważnych dni. Bez reklam, śledzenia i konta – wszystko działa w telefonie.',
  body: 'Budziki opierają się na dokładnych alarmach systemu i pamięci chronionej urządzeniem, więc dzwonią po restarcie telefonu, jeszcze przed jego odblokowaniem, i nie znikają, gdy system zamknie aplikację. Każdy budzik ma własny dzwonek albo plik audio, narastanie głośności, wibrację, drzemkę z limitem, pominięcie najbliższego dzwonienia i zapowiedź przed czasem. Żeby naprawdę wstać, wyłączenie można zablokować zadaniem: działaniami do policzenia albo kodem do przepisania. Klawisze głośności i obrócenie telefonu też mają swoją rolę.\n\nStoper liczy okrążenia: pokazuje odcinek i czas łączny, wyróżnia najszybsze i najwolniejsze, mierzy w setnych sekundy, a wyniki kopiuje do schowka jako tabelę. Minutniki działają w dowolnej liczbie naraz, mają nazwy i zapisane szybkie czasy, czas wpisuje się klawiaturą jak w zegarku („130” to 1 min 30 s), a po upływie czasu można dodać minutę jednym dotknięciem albo pozwolić aplikacji obudzić ekran jak budzik.\n\nW zakładce „Więcej” są narzędzia, po które zwykle instaluje się osobne aplikacje: pomodoro z historią sesji i automatycznymi przejściami, trening interwałowy (Tabata, HIIT i własne plany z rundami i seriami) z zapowiedziami głosowymi i piknięciami na ostatnich sekundach, metronom z wystukiwaniem tempa i akcentem na „raz”, odliczanie do wydarzeń z rocznicami oraz kalkulator czasu i dat. Zegar ma tryb analogowy z płynną sekundą, zegary świata z różnicą czasu i trybem nocnym, który przyciemnia ekran i powoli przesuwa treść, chroniąc OLED.\n\nCałość to Kotlin i Compose z czarno-białym interfejsem w stylu OpenPDF, po polsku i angielsku, z formatem 12/24 h. Nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji, a aplikacja sama pobiera i instaluje kolejne wersje.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Kotlin', 'Jetpack Compose', 'Material 3', 'AlarmManager', 'Canvas'],
  features: [
    'budziki z dokładnymi alarmami, drzemką i zadaniem przed wyłączeniem',
    'stoper z okrążeniami i wiele minutników naraz',
    'pomodoro, interwały z zapowiedziami, metronom, odliczanie do wydarzeń',
    'widżet, skróty i obsługa poleceń systemowych',
    'wymaga Androida 10 lub nowszego',
  ],
  cover: '/assets/portfolio/opentimer-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenTimer',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 3,
}

function isOpenTimer(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === 'OpenTimer'
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenTimer)
const rest = current.filter(item => !isOpenTimer(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenTimer wchodzi tuż za OpenCalc – aplikacje na Androida stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'opencalc')
const openpdf = rest.findIndex(item => item.slug === 'openpdf')
const at = after !== -1 ? after + 1 : (openpdf !== -1 ? openpdf + 1 : 0)
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenTimer w portfolio na pozycji ${at + 1} z ${next.length}.`)
