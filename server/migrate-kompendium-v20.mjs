/**
 * Dodaje Kompendium Podróży do portfolio, zaraz za MuszęJechać.
 *
 * To serwis, więc dowodem jest działający adres. Repozytorium jest prywatne,
 * dlatego link do niego zostaje ukryty.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-kompendium-v20')

const SHOTS = [
  ['kompendium-podrozy-01-kraj', 'Strona kraju: godło, flaga, mapa, informacje praktyczne i znane osoby', 'Country page: coat of arms, flag, map, practical facts and notable people'],
  ['kompendium-podrozy-02-afganistan', 'Afganistan: opis kraju, dni wolne od pracy i granice z sąsiadami', 'Afghanistan: country overview, public holidays and borders with neighbours'],
  ['kompendium-podrozy-03-przyroda', 'Karta rośliny z ilustracją i mapą odnotowanych wystąpień', 'Plant card with an illustration and a map of recorded occurrences'],
  ['kompendium-podrozy-04-obyczaje', 'Używki, obyczaje i savoir-vivre w czytelnych kartach', 'Substances, customs and etiquette in clear cards'],
  ['kompendium-podrozy-05-osoby', 'Biogram znanej osoby z portretem i krótkim życiorysem', 'Notable person profile with a portrait and a short biography'],
]

const project = {
  id: 'prj-kompendium-podrozy',
  slug: 'kompendium-podrozy',
  name: 'Kompendium Podróży',
  kind: 'web',
  label: 'Portal wiedzy o świecie',
  year: '2026',
  tagline: 'Encyklopedia podróżnika: każdy kraj z mapą, informacjami praktycznymi, prawem, obyczajami, przyrodą i znanymi postaciami.',
  summary: 'Zamiast dziesięciu kart przeglądarki – jedna strona kraju, na której stoi wszystko, co warto wiedzieć przed wyjazdem: od waluty i dni wolnych po to, czy wolno pić alkohol i jak się ubrać do świątyni.',
  body: 'Każdy kraj ma własną stronę z godłem, flagą i mapą, a obok blok informacji: stolica, języki, waluta z bieżącym kursem, powierzchnia, ludność, granice z długością odcinka przy każdym sąsiedzie, najwyższy szczyt i najdłuższa rzeka. Pod spodem opis kraju podzielony na rozdziały – geografia, klimat, historia, ustrój – ze spisem treści przypiętym do ekranu.\n\nCzęść praktyczna odpowiada na pytania, których nie ma w przewodnikach: co z alkoholem, tytoniem, e-papierosami i marihuaną, jaki jest limit promili za kierownicą, jakie gesty są nieuprzejme, jaki strój obowiązuje na co dzień i w miejscach kultu, ile zostawić napiwku i czy wypada się targować. Każdy temat ma krótką kartę z oznaczeniem statusu, a pełny tekst rozwija się na żądanie.\n\nDo tego dni wolne od pracy w bieżącym roku, dane ekonomiczne na wykresach, znane osoby z portretami i biogramami oraz przyroda – rośliny i zwierzęta z ilustracjami i mapą odnotowanych wystąpień. Dane liczbowe pochodzą ze źródeł podpisanych pod każdym blokiem: kursy z EBC, święta z Nager.Date, trzęsienia ziemi z USGS.\n\nFrontend to React z mapami Leaflet i d3-geo oraz wykresami Recharts, backend – FastAPI z SQLAlchemy, który pobiera i odświeża dane zewnętrzne według harmonogramu. Treści redaguje się w panelu administracyjnym, bez dotykania kodu.',
  role: 'Projekt, architektura, implementacja, treści i wdrożenie',
  stack: ['React', 'Vite', 'Leaflet', 'd3-geo', 'Recharts', 'FastAPI', 'SQLAlchemy', 'Docker'],
  features: [
    'strona każdego kraju z mapą i spisem treści',
    'prawo i obyczaje: alkohol, używki, strój, gesty, napiwki',
    'waluta z bieżącym kursem i dni wolne od pracy',
    'znane osoby z portretami i biogramami',
    'przyroda z mapą odnotowanych wystąpień',
    'panel do redagowania treści',
  ],
  icon: '',
  cover: '/assets/portfolio/kompendium-podrozy-cover.webp',
  shots: SHOTS.map(([name, alt]) => ({ src: `/assets/portfolio/${name}.webp`, alt })),
  siteUrl: 'https://kompendium-podrozy.pl',
  siteHidden: false,
  repo: 'BlackSingularities/kompendium-podroznicze',
  repoHidden: true,
  releaseSource: 'none',
  stores: {},
  downloads: [],
  en: {
    label: 'World knowledge portal',
    tagline: "A traveller's encyclopedia: every country with a map, practical facts, law, customs, nature and notable people.",
    summary: 'Instead of ten browser tabs – one country page with everything worth knowing before a trip: from currency and public holidays to whether alcohol is allowed and how to dress for a temple.',
    body: 'Every country has its own page with the coat of arms, flag and map, next to a block of facts: capital, languages, currency with the current exchange rate, area, population, borders with the length of each one, the highest peak and the longest river. Below comes the country description split into chapters – geography, climate, history, government – with a table of contents pinned to the screen.\n\nThe practical part answers questions guidebooks skip: alcohol, tobacco, e-cigarettes and cannabis, the drink-driving limit, which gestures are rude, the dress code for everyday life and places of worship, how much to tip and whether haggling is expected. Each topic has a short card with a status badge, and the full text expands on demand.\n\nOn top of that: public holidays for the current year, economic data on charts, notable people with portraits and biographies, and nature – plants and animals with illustrations and a map of recorded occurrences. Figures come from sources credited under each block: exchange rates from the ECB, holidays from Nager.Date, earthquakes from USGS.\n\nThe frontend is React with Leaflet and d3-geo maps and Recharts charts; the backend is FastAPI with SQLAlchemy, fetching and refreshing external data on a schedule. Content is edited in an admin panel, without touching the code.',
    role: 'Design, architecture, implementation, content and deployment',
    features: [
      'a page for every country with a map and table of contents',
      'law and customs: alcohol, substances, dress, gestures, tipping',
      'currency with the current rate and public holidays',
      'notable people with portraits and biographies',
      'nature with a map of recorded occurrences',
      'admin panel for editing content',
    ],
    shotAlts: SHOTS.map(([, , alt]) => alt),
  },
  published: true,
  featured: true,
}

function isKompendium(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.siteUrl?.includes('kompendium-podrozy.pl')
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isKompendium)
const rest = current.filter(item => !isKompendium(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// MuszęJechać zostaje pierwsze, Kompendium wchodzi tuż za nim.
const anchor = rest.findIndex(item => item.slug === 'muszejechac')
const at = anchor === -1 ? 0 : anchor + 1
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Kompendium Podróży w portfolio na pozycji ${at + 1} z ${next.length}.`)
