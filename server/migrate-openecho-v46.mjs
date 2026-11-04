/**
 * Dodaje OpenEcho (echolokacja w smartfonie) do portfolio, zaraz za OpenTimerem.
 *
 * To aplikacja na Androida, więc pliki do pobrania bierze wprost z najnowszego wydania
 * na GitHubie (`releaseSource: 'github'`), a strona pokazuje tylko plik APK
 * (`repoHidden: true`). Dzięki wpisowi z `repo` działa też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/OpenEcho/releases/latest`, z którego aplikacja
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openecho-v46')

const project = {
  id: 'prj-openecho',
  slug: 'openecho',
  name: 'OpenEcho',
  kind: 'app',
  label: 'Echolokacja i sonar / Android',
  year: '2026',
  tagline: 'Echolokacja w smartfonie: głośnik wysyła ultradźwięki, mikrofon łapie odbicia, a aplikacja rysuje mapę pokoju – także w zupełnej ciemności. Jak sonar nietoperza.',
  summary: 'Sonar z głośnika telefonu albo głośnika Bluetooth: echa i echogram na żywo, mapa pomieszczenia z obrotu telefonu, pomiar odległości z wibracjami i głosem oraz czujnik ruchu na efekcie Dopplera. Bez reklam, śledzenia i konta – dźwięk jest analizowany na bieżąco w telefonie.',
  body: 'Głośnik wysyła krótki świergot ultradźwiękowy (domyślnie 18–22 kHz), a mikrofon nagrywa bez przerwy. Filtr dopasowany zamienia każde echo w ostry szczyt, a odległość liczona jest od fali, która przyszła wprost z głośnika – dzięki temu działa tak samo z głośnikiem telefonu, jak i z głośnikiem Bluetooth, który opóźnia dźwięk o kilkaset milisekund. Profil jest oczyszczany z „dzwonienia” obudowy, uśredniany i wzmacniany z odległością, a echa wykrywane z dokładnością do pojedynczych centymetrów.\n\nNa zakładce Mapa wystarczy obrócić się powoli z telefonem: czujnik obrotu mówi, w którą stronę celuje wiązka, a echa układają się w plan pomieszczenia z obrysem ścian i mebli, szacowanymi wymiarami i powierzchnią. Pomiar pokazuje odległość do najbliższej przeszkody z oceną stabilności i asystentem bez patrzenia na ekran – wibracje gęstnieją przy zbliżaniu jak czujnik parkowania, a syntezator mowy podaje odległość. Zakładka Ruch gra stały ton i wykrywa przesunięcie Dopplera odbić: pokazuje, czy coś się zbliża, czy oddala, z jaką prędkością, i może podnieść alarm.\n\nKażdy głośnik ma własną kalibrację: pomiar pasma, które naprawdę przechodzi przez głośnik i mikrofon (z zaleceniem pasma), opóźnienia wyjścia, tła przy telefonie i pomiar wzorcowy przy znanej odległości. Skany i pomiary zapisują się w telefonie z eksportem do PNG, CSV i własnego formatu z importem, a diagnostyka pokazuje widmo mikrofonu na żywo. Jest też tryb demonstracyjny z wirtualnym pokojem.\n\nCałość to Kotlin i Compose z czarno-białym interfejsem w stylu OpenPDF, po polsku i angielsku. Nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji, a aplikacja sama pobiera i instaluje kolejne wersje z redzikowski.com.',
  role: 'Pomysł, przetwarzanie sygnałów, projekt, implementacja i wydania',
  stack: ['Kotlin', 'Jetpack Compose', 'AudioTrack / AudioRecord', 'FFT', 'Filtr dopasowany', 'Czujniki ruchu'],
  features: [
    'sonar ultradźwiękowy z głośnika telefonu albo głośnika Bluetooth',
    'mapa pokoju z obrotu telefonu, obrys przeszkód, wymiary i powierzchnia',
    'pomiar odległości z wibracjami, głosem i piknięciami',
    'czujnik ruchu na efekcie Dopplera z alarmem i dziennikiem',
    'kalibracja pasma i odległości, eksport PNG/CSV; Android 10 lub nowszy',
  ],
  icon: '/assets/portfolio/openecho-icon.png',
  cover: '/assets/portfolio/openecho-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenEcho',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 4,
}

function isSame(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.repo === project.repo
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isSame)
const rest = current.filter(item => !isSame(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenEcho wchodzi tuż za OpenTimerem – aplikacje na Androida stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'opentimer')
const opencalc = rest.findIndex(item => item.slug === 'opencalc')
const at = after !== -1 ? after + 1 : (opencalc !== -1 ? opencalc + 1 : 0)
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenEcho w portfolio na pozycji ${at + 1} z ${next.length}.`)
