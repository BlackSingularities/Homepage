/**
 * Dodaje FS Addon Toolkit do portfolio, zaraz za OpenTests.
 *
 * Aplikacja na Windows: instalator, MSI i wersja przenośna z najnowszego wydania na GitHubie
 * (`releaseSource: 'github'`). Repozytorium jest publiczne, więc link do niego zostaje widoczny.
 * Wpis z `repo` uruchamia też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/FSaddonToolkit/releases/latest`, z którego aplikacja
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-fsaddontoolkit-v32')

const project = {
  id: 'prj-fsaddontoolkit',
  slug: 'fsaddontoolkit',
  name: 'FS Addon Toolkit',
  kind: 'app',
  label: 'Menedżer dodatków do MSFS 2024 / Windows',
  year: '2026',
  tagline: 'Dodatki do Microsoft Flight Simulator 2024 włączane jednym kliknięciem – z bibliotek na dowolnych dyskach, z miniaturami, mapą lotnisk, profilami i planem lotu.',
  summary: 'Folder Community i biblioteki dodatków na innych dyskach w jednym miejscu. Włączony dodatek dostaje w Community połączenie katalogu, wyłączony znika z symulatora bez kopiowania plików – MSFS wczytuje się szybciej. Samoloty, lotniska, sceneria, malowania i narzędzia osobno, mapa lotnisk odczytanych z plików scenerii, profile i pakiety oficjalne.',
  body: 'Dodatki mogą leżeć gdziekolwiek: w Community albo w bibliotekach na innych dyskach. Włączenie pakietu z biblioteki tworzy w Community połączenie katalogu NTFS – bez uprawnień administratora i bez kopiowania gigabajtów – a wyłączenie usuwa samo łącze. Pakiety leżące bezpośrednio w Community wyłączają się przeniesieniem do folderu obok, co na tym samym dysku trwa ułamek sekundy. Przy pierwszym uruchomieniu aplikacja sama znajduje biblioteki, do których prowadzą łącza utworzone wcześniej innymi narzędziami.\n\nKażdy pakiet ma miniatury, warianty samolotów z aircraft.cfg, zależności z manifestu i kategorię: samoloty, lotniska, sceneria, malowania, narzędzia albo biblioteki obiektów. Lotniska są odczytywane wprost z plików BGL scenerii i pokazywane na mapie z klastrami, a wbudowana baza 78 tysięcy lotnisk uzupełnia nazwy i współrzędne. Planowanie lotu zostawia włączone tylko scenerie w pobliżu startu, celu i trasy.\n\nProfile przełączają całe zestawy dodatków z podglądem zmian, tryb lekki wyłącza wszystko poza zablokowanymi pakietami, a widok pakietów oficjalnych przełącza zawartość Marketplace i DLC w Content.xml z kopiami zapasowymi. Kontrola kondycji wyłapuje zerwane łącza, źle rozpakowane paczki, duplikaty, wyłączone zależności i konflikty tego samego lotniska, a brakujący layout.json odtwarza jednym kliknięciem.\n\nInstalacja z ZIP, RAR i 7z także przeciąganiem na okno, przenoszenie pakietów między dyskami z postępem, historia z cofaniem każdej zmiany. Aplikacja sama pobiera kolejne wersje z redzikowski.com. Nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji.',
  role: 'Projekt, architektura, parser BGL, implementacja i wydania',
  stack: ['Rust', 'Tauri 2', 'JavaScript', 'Leaflet', 'NTFS junctions'],
  features: [
    'biblioteki dodatków na dowolnych dyskach, łącza bez uprawnień administratora',
    'samoloty, lotniska, sceneria, malowania i narzędzia osobno, z miniaturami',
    'mapa lotnisk z plików BGL i planowanie lotu po promieniu i trasie',
    'profile, tryb lekki, pakiety oficjalne i DLC, kontrola kondycji',
    'Windows 10 i 11; MSFS 2024 i 2020, Steam i Microsoft Store',
  ],
  icon: '/assets/portfolio/fsaddontoolkit-icon.png',
  cover: '/assets/portfolio/fsaddontoolkit-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/FSaddonToolkit',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 5,
}

function isToolkit(item) {
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

const previous = current.find(isToolkit)
const rest = current.filter(item => !isToolkit(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// FS Addon Toolkit wchodzi tuż za OpenTests – aplikacje stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'opentests')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`FS Addon Toolkit w portfolio na pozycji ${at + 1} z ${next.length}.`)
