/**
 * Dodaje OpenAudioPower (studio audio na Windows) do portfolio, obok OpenPano.
 *
 * Pliki do pobrania pochodzą z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Wpis z `repo` uruchamia też adres
 * `/api/releases/repos/BlackSingularities/OpenAudioPower/releases/latest`, z którego
 * aplikacja sprawdza aktualizacje. Zgłoszenia z aplikacji przychodzą z `app: 'openaudiopower'`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openaudiopower-v49')

// Zrzuty ekranu dojdą w kolejnej migracji; do tego czasu karta pokazuje ikonę aplikacji.
const shots = []

const project = {
  id: 'prj-openaudiopower',
  slug: 'openaudiopower',
  name: 'OpenAudioPower',
  kind: 'app',
  label: 'Studio audio / Windows',
  year: '2026',
  tagline: 'Nagrywanie, montaż i rozbicie dowolnej piosenki na wokal i instrumenty.',
  summary: 'Wielościeżkowe studio na Windows: nagrywa z dowolnego wejścia, montuje klipy na osi czasu, nakłada efekty w czasie rzeczywistym i rozdziela plik MP3 lub FLAC na wokal, perkusję, bas, gitarę, pianino i resztę. Separacja działa lokalnie, na karcie graficznej kilkanaście razy szybciej, niż trwa utwór.',
  body: 'Separacja korzysta z sieci HT-Demucs uruchamianej przez ONNX Runtime. Transformata STFT i jej odwrotność liczą się w Ruście, a sama sieć na karcie graficznej przez DirectML, więc trzyminutowy utwór rozkłada się na sześć ścieżek w kilkanaście sekund. Bez zgodnej karty liczy procesor, a szybki tryb DSP nie wymaga nawet pobierania modelu. Każda wydzielona ścieżka trafia na oś czasu jako osobny klip, który można wyciszyć, przetworzyć albo wyeksportować.\n\nOś czasu obsługuje przycinanie, dzielenie, narastanie i wygaszanie, znaczniki, pętlę i siatkę taktów. Na ścieżkach i masterze działają efekty w czasie rzeczywistym: korektor parametryczny, kompresor, limiter, bramka, de-esser, pogłos, delay, chorus, flanger, phaser i saturacja. Operacje na nagraniu obejmują normalizację do LUFS, odszumianie z profilem, usuwanie trzasków, zmianę tempa bez zmiany wysokości i odwrotnie.\n\nAnaliza mierzy głośność według EBU R128, true peak, tempo i tonację, a spektrogram i analizator widma pokazują, co dzieje się w paśmie. Eksport zapisuje WAV albo FLAC: cały miks, zaznaczenie albo każdą ścieżkę osobno. Interfejs z półprzezroczystego szkła działa po polsku i angielsku. Silnik napisano w Ruście, interfejs w Tauri 2 i Svelte 5.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Rust', 'Tauri 2', 'Svelte 5', 'ONNX Runtime', 'DirectML'],
  features: [
    'separacja na 6 ścieżek (HT-Demucs) na karcie graficznej',
    'wielościeżkowa oś czasu i nagrywanie WASAPI',
    'efekty w czasie rzeczywistym, odszumianie, LUFS',
    'eksport WAV i FLAC, projekty .oap',
    'Windows 10 i 11, 64-bit',
  ],
  icon: '/assets/portfolio/openaudiopower-icon.png',
  cover: '',
  shots,
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenAudioPower',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
}

function isOpenAudioPower(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === 'OpenAudioPower'
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenAudioPower)
const rest = current.filter(item => !isOpenAudioPower(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenAudioPower wchodzi za OpenPano – aplikacje na Windows stoją obok siebie.
const anchor = ['openpano', 'openmp', 'opendtp'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenAudioPower w portfolio na pozycji ${at + 1} z ${next.length}.`)
