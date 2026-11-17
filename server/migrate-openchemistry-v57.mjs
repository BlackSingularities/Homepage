/**
 * Dodaje OpenChemistry (wirtualne laboratorium chemiczne pod /chemia/) do portfolio, obok OpenTests.
 *
 * Aplikacja webowa – bez plików do pobrania (`releaseSource: 'none'`). Plakat serwer pobiera sam
 * z `docs/posters/posters.json` w repozytorium BlackSingularities/OpenChemistry.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openchemistry-v57')

const shots = [
  { src: '/assets/portfolio/openchemistry-01-osady.webp', alt: 'Halogenki srebra: biały AgCl, bladożółty AgBr i żółty AgI w probówkach, przewodnik krok po kroku' },
  { src: '/assets/portfolio/openchemistry-02-miareczkowanie.webp', alt: 'Miareczkowanie z biuretą i fenoloftaleiną oraz krzywa pH rysowana na żywo' },
  { src: '/assets/portfolio/openchemistry-03-elektroliza.webp', alt: 'Elektroliza wody w rurce U – wodór i tlen w stosunku 2:1, zmiana barwy wskaźnika przy elektrodach' },
  { src: '/assets/portfolio/openchemistry-04-gazy.webp', alt: 'CO₂ z marmuru i kwasu solnego przepuszczany rurką przez wodę wapienną' },
  { src: '/assets/portfolio/openchemistry-05-katalog.webp', alt: 'Katalog 199 doświadczeń w 14 działach z wyszukiwarką i poziomami trudności' },
]

const project = {
  id: 'prj-openchemistry',
  slug: 'openchemistry',
  name: 'OpenChemistry',
  kind: 'web',
  label: 'Wirtualne laboratorium chemiczne / aplikacja w przeglądarce',
  year: '2026',
  tagline: 'Laboratorium chemiczne w przeglądarce: 199 doświadczeń krok po kroku i swobodne eksperymenty, liczone przez prawdziwy silnik chemiczny.',
  summary: 'Darmowe wirtualne laboratorium bez logowania. Stawiasz na stole probówki, zlewki, kolby, biuretę czy elektrolizer, dolewasz odczynniki z półki, ogrzewasz, mieszasz i badasz produkty łuczywem, papierkami, testem płomieniowym albo pH-metrem – a wyniki wynikają z obliczeń, nie z nagranych animacji.',
  body: 'Silnik w Pythonie liczy pH z bilansu ładunku dla wszystkich układów kwasowo-zasadowych, kompleksy (amoniakalne, hydroksylowe, octanowe, siarczanowe, tiocyjanianowe, jod ze skrobią), strącanie i rozpuszczanie około 90 osadów z iloczynów rozpuszczalności ze współczynnikami aktywności, krystalizację z krzywych rozpuszczalności i kinetykę reakcji: metale z kwasami, wodą i zasadami, wypieranie metali według potencjałów, redoks manganianu i dichromianu zależnie od odczynu, fluorowce, zegar jodowy, autokatalizę, rozkłady termiczne i spalanie w tlenie, powietrzu czy chlorze. Gazy przechodzą między cieczą a przestrzenią nad nią zgodnie z prawem Henry’ego, płyną rurkami do innych naczyń, a ciepło reakcji, zobojętniania i rozcieńczania zmienia temperaturę aż do wrzenia i odparowania do sucha.\n\n199 doświadczeń w 14 działach – od wskaźników i miareczkowania, przez reakcje strąceniowe, elektrolizę i ogniwa z równaniem Nernsta, po próby Fehlinga i Tollensa, denaturację białek oraz pokazy jak pasta do zębów dla słonia czy fontanna amoniakalna. Każde ma przewodnik, równania, wyjaśnienie i automatyczny test sprawdzający, że symulacja pokazuje to, co opisuje; dodatkowo macierz kation × anion porównywana jest z tablicą rozpuszczalności. Barwy roztworów liczy prawo Lamberta-Beera, a naczynia, osady, pęcherzyki, para i płomienie rysowane są w SVG.',
  role: 'Projekt, silnik chemiczny, biblioteka doświadczeń, interfejs i wdrożenie',
  stack: ['Python', 'FastAPI', 'React', 'TypeScript', 'Vite', 'SVG', 'Docker'],
  features: [
    '199 doświadczeń z przewodnikiem krok po kroku',
    '188 odczynników i 20 rodzajów sprzętu',
    'pH, kompleksy i osady liczone z równowag',
    'gazy, ciepło, elektroliza i ogniwa',
    'tryb swobodnego eksperymentowania',
    'za darmo, bez logowania',
  ],
  icon: '/assets/portfolio/openchemistry-icon.png',
  cover: '/assets/portfolio/openchemistry-01-osady.webp',
  shots,
  siteUrl: '/chemia/',
  siteHidden: false,
  repo: 'BlackSingularities/OpenChemistry',
  repoHidden: true,
  releaseSource: 'none',
  downloads: [],
  published: true,
  featured: true,
  order: 0,
}

function isOpenChemistry(item) {
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

const previous = current.find(isOpenChemistry)
const rest = current.filter(item => !isOpenChemistry(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenChemistry stoi tuż za OpenTests – obie aplikacje edukacyjne obok siebie.
const anchor = ['opentests', 'openpayments'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenChemistry w portfolio na pozycji ${at + 1} z ${next.length}.`)
