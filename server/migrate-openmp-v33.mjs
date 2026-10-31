/**
 * Dodaje OpenMP do portfolio, zaraz za FS Addon Toolkit.
 *
 * Aplikacja na Windows: instalator i wersja przenośna z najnowszego wydania na GitHubie
 * (`releaseSource: 'github'`). Link do repozytorium jest ukryty – aplikacja publikowana jest
 * przez redzikowski.com. Wpis z `repo` uruchamia też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/OpenMP/releases/latest`, z którego program
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openmp-v33')

const project = {
  id: 'prj-openmp',
  slug: 'openmp',
  name: 'OpenMP',
  kind: 'app',
  label: 'Odtwarzacz muzyki i wideo / Windows',
  year: '2026',
  tagline: 'Odtwarzacz muzyki i wideo dla Windows – duża okładka z wizualizacją, akcent z okładki w całym interfejsie, własny silnik dźwięku, biblioteka także z dysków sieciowych i minimalistyczny tryb wideo.',
  summary: 'Muzyka w stylu klasycznych odtwarzaczy: wyświetlacz z okładką, parametrami technicznymi i analizatorem, taśma utworu na pasku przewijania, przejścia bez przerw, przenikanie i korektor 18-pasmowy. Filmy w małym, chowającym się panelu z dekodowaniem sprzętowym i napisami. Biblioteka muzyki i wideo również z serwera NAS.',
  body: 'Tryb muzyki to rozbudowany wyświetlacz: okładka, tytuł, wykonawca i album, format, częstotliwość i bitrate, duży licznik czasu oraz analizator – słupki ze szczytami, widmo, oscyloskop albo wskaźniki VU liczone wprost z próbek dźwięku. Pasek przewijania pokazuje falę całego utworu w czterech stylach, z podglądem czasu pod kursorem i pętlą A-B. Ten sam wyświetlacz z analizatorem i taśmą jest w widoku kompaktowym i w miniodtwarzaczu na wierzchu.\n\nWłasny silnik dźwięku gra utwory bez przerw albo z płynnym przenikaniem, ma korektor 18-pasmowy z presetami, ReplayGain z ogranicznikiem, zmianę szybkości i wysokości oraz wybór urządzenia wyjściowego. Teksty piosenek pochodzą z plików .lrc, tagów albo z LRCLIB i przewijają się razem z utworem.\n\nTryb wideo oparty na libmpv odtwarza praktycznie każdy format: dekodowanie sprzętowe, napisy ASS, SRT i PGS, ścieżki dźwiękowe, rozdziały, wznawianie od miejsca przerwania i zrzuty klatek – a panel sterowania znika, gdy nie jest potrzebny.\n\nBiblioteka ma osobne zbiory muzyki i wideo, obsługuje ścieżki UNC i dyski zmapowane, a niedostępny serwer NAS nie kasuje wpisów. Do tego listy w kartach, edytor tagów dla wielu plików, radio internetowe, statystyki, klawisze multimedialne i nakładka systemowa Windows. Program sam pobiera kolejne wersje z redzikowski.com; nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji.',
  role: 'Projekt, silnik dźwięku, interfejs, implementacja i wydania',
  stack: ['Rust', 'Slint', 'Symphonia', 'WASAPI', 'libmpv'],
  features: [
    'okładka z wizualizacją: słupki, widmo, oscyloskop, VU; akcent z okładki w całym interfejsie',
    'przejścia bez przerw, przenikanie, korektor 18-pasmowy, ReplayGain',
    'tryb wideo z chowającym się panelem, napisami i dekodowaniem sprzętowym',
    'biblioteka muzyki i wideo, także z dysków sieciowych',
    'widok duży, pomniejszony i miniodtwarzacz; Windows 10 i 11',
  ],
  icon: '/assets/portfolio/openmp-icon.png',
  cover: '/assets/portfolio/openmp-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenMP',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 6,
}

function isOpenMP(item) {
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

const previous = current.find(isOpenMP)
const rest = current.filter(item => !isOpenMP(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenMP wchodzi tuż za FS Addon Toolkit – aplikacje na Windows stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'fsaddontoolkit')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenMP w portfolio na pozycji ${at + 1} z ${next.length}.`)
