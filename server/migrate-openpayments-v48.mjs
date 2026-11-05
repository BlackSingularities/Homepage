/**
 * Dodaje OpenPayments do portfolio, obok pozostałych aplikacji na Androida.
 *
 * Pliki do pobrania pochodzą z najnowszego wydania na GitHubie (`releaseSource: 'github'`),
 * strona pokazuje tylko APK (`repoHidden: true`). Wpis z `repo` uruchamia też adres
 * `/api/releases/repos/BlackSingularities/OpenPayments/releases/latest`, z którego
 * aplikacja pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openpayments-v48')

const project = {
  id: 'prj-openpayments',
  slug: 'openpayments',
  name: 'OpenPayments',
  kind: 'app',
  label: 'Budżet domowy / Android',
  year: '2026',
  tagline: 'Budżet domowy ze skanowaniem paragonów – widzisz, na co naprawdę idą pieniądze.',
  summary: 'Wydatki wpisane ręcznie albo odczytane ze zdjęcia paragonu trafiają same do właściwej kategorii. Budżety ostrzegają, zanim przekroczysz limit, płatności cykliczne księgują się same, a statystyki pokazują trendy bez eksportowania do arkusza. Bez reklam, konta i wysyłania danych.',
  body: 'Skan paragonu działa na telefonie: rozpoznawanie tekstu odczytuje sklep, datę, sumę i całą listę kupionych rzeczy, nie tylko kwotę na dole. Aplikacja porównuje sumę pozycji z sumą paragonu i podpowiada, gdy coś się nie zgadza. Zdjęcie zostaje przy transakcji, więc zawsze można do niego wrócić.\n\nKategorie dobierają się same – z wbudowanego słownika sieci handlowych, stacji paliw i usług oraz z poprawek użytkownika: wystarczy raz zmienić kategorię dla sklepu, a aplikacja zapamiętuje to na przyszłość. Budżety można ustawić na cały miesiąc albo na wybrane kategorie, z progiem ostrzeżenia i podpowiedzią, ile można wydać dziennie do końca miesiąca.\n\nSubskrypcje i rachunki dodaje się raz – aplikacja księguje je w dniu płatności i przypomina o nich wcześniej. Statystyki pokazują ostatnie pół roku, tempo wydatków w porównaniu z poprzednim miesiącem, zmiany w kategoriach, najczęściej odwiedzane sklepy i najdroższe produkty z paragonów.\n\nWszystkie dane zostają w telefonie. Jest blokada odciskiem palca lub PIN-em, kopia zapasowa do pliku, eksport do CSV oraz motyw jasny i ciemny. Całość to Kotlin, Jetpack Compose i Room, a aplikacja sama pobiera i instaluje kolejne podpisane wersje.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Kotlin', 'Jetpack Compose', 'Material 3', 'Room', 'ML Kit'],
  features: [
    'skan paragonu z listą pozycji, rozpoznawanie offline',
    'automatyczna kategoryzacja ucząca się z poprawek',
    'budżety z ostrzeżeniami i płatności cykliczne',
    'statystyki, kopia zapasowa, eksport CSV, blokada aplikacji',
    'wymaga Androida 8 lub nowszego',
  ],
  cover: '/assets/portfolio/openpayments-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenPayments',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 3,
}

function isOpenPayments(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === 'OpenPayments'
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenPayments)
const rest = current.filter(item => !isOpenPayments(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenPayments wchodzi za OpenTimer (albo OpenCalc) – aplikacje na Androida stoją obok siebie.
const anchor = ['opentimer', 'opencalc', 'openpdf'].map(slug => rest.findIndex(item => item.slug === slug)).find(i => i !== -1)
const at = anchor !== undefined ? anchor + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenPayments w portfolio na pozycji ${at + 1} z ${next.length}.`)
