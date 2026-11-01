/**
 * Dodaje SimRail Trail do portfolio, zaraz za OpenDTP.
 *
 * Aplikacja na Windows: jeden plik exe z najnowszego wydania na GitHubie
 * (`releaseSource: 'github'`, repozytorium prywatne – pliki idą przez proxy z tokenem).
 * Wpis z `repo` uruchamia też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/simrail-trail/releases/latest`, z którego program
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-simrail-trail-v37')

const project = {
  id: 'prj-simrail-trail',
  slug: 'simrail-trail',
  name: 'SimRail Trail',
  kind: 'app',
  label: 'Menedżer scenariuszy SimRail / Windows',
  year: '2026',
  tagline: 'Menedżer scenariuszy do SimRail – własne przejazdy z tego, co masz w grze, także prawdziwymi pociągami z dzisiejszego rozkładu, wrzucane do gry jednym kliknięciem.',
  summary: 'Aplikacja czyta zainstalowaną grę i jej DLC: scenerie, tabor, stacje z kilometrażem i semafory. Z tego układa trasę, rozkład i skład, generuje pliki scenariusza wzorowane na oficjalnych misjach i sama wdraża je do gry.',
  body: 'Punktem wyjścia jest katalog gry: scenerie, scenariusze, tabor z adnotacjami DLC i ładunkami, stacje z kilometrażem i semafory z oficjalnych skryptów. Posiadane DLC aplikacja sprawdza sondą uruchamianą w samej grze, więc proponuje tylko to, czym naprawdę da się pojechać.\n\nKreator trasy korzysta z grafu połączeń zbudowanego z oficjalnych rozkładów: schemat linii, edytor rozkładu, edytor składu z biblioteką pojazdów, długością, masą i ostrzeżeniami o epoce, warianty składu do wyboru w grze, pogoda, pora roku i pociągi AI na semaforach. „Losowy kurs” układa 60–90 minut jazdy z posiadanych DLC jednym kliknięciem.\n\nPrawdziwy pociąg pochodzi z dzisiejszego rozkładu (GTFS): stacje dopasowane do map gry, perony i tory z rozkładu, odcinki przez kilka scenerii naraz, a skład typowy dla kategorii albo odczytany z vagonWEB. Generator tworzy mission.lua, składy, dźwięki, rozkład, tłumaczenia PL/EN i manifest z wymaganymi DLC, a walidacja sprawdza czasy, semafory, pojazdy i składnię Lua. Program sam pobiera kolejne wersje z redzikowski.com.',
  role: 'Projekt, analiza plików gry, generator scenariuszy, implementacja i wydania',
  stack: ['C#', '.NET 8', 'WPF', 'Lua', 'GTFS'],
  features: [
    'katalog gry: scenerie, tabor, stacje, semafory i posiadane DLC',
    'kreator trasy, rozkładu i składu z wariantami do wyboru w grze',
    'prawdziwe pociągi z dzisiejszego rozkładu i składy z vagonWEB',
    'generator mission.lua z walidacją i wdrażaniem do gry',
    'jeden plik exe, aktualizacje z redzikowski.com; Windows 10 i 11',
  ],
  icon: '/assets/portfolio/simrail-trail-icon.png',
  cover: '/assets/portfolio/simrail-trail-01-dane.webp',
  shots: [
    { src: '/assets/portfolio/simrail-trail-01-dane.webp', alt: 'Katalog gry: scenerie z liczbą scenariuszy i oznaczeniem DLC' },
    { src: '/assets/portfolio/simrail-trail-02-sklad.webp', alt: 'Edytor składu z biblioteką pojazdów, długością i masą pociągu' },
    { src: '/assets/portfolio/simrail-trail-03-prawdziwy-pociag.webp', alt: 'Wyszukiwanie prawdziwego pociągu w dzisiejszym rozkładzie' },
    { src: '/assets/portfolio/simrail-trail-04-trasa.webp', alt: 'Kreator trasy z rozkładem przejazdu' },
  ],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/simrail-trail',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
  order: 8,
}

function isSimRailTrail(item) {
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

const previous = current.find(isSimRailTrail)
const rest = current.filter(item => !isSimRailTrail(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// SimRail Trail wchodzi tuż za OpenDTP – aplikacje na Windows stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'opendtp')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`SimRail Trail w portfolio na pozycji ${at + 1} z ${next.length}.`)
