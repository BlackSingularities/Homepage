/**
 * Dodaje OpenCalc do portfolio, zaraz za OpenPDF.
 *
 * To aplikacja na Androida, więc pliki do pobrania bierze wprost z najnowszego
 * wydania na GitHubie (`releaseSource: 'github'`) – lista nie wymaga ręcznej
 * aktualizacji przy każdym nowym tagu. Link do repozytorium jest ukryty
 * (`repoHidden: true`): strona pokazuje tylko plik APK.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-opencalc-v27')

const project = {
  id: 'prj-opencalc',
  slug: 'opencalc',
  name: 'OpenCalc',
  kind: 'app',
  label: 'Kalkulator naukowy / Android',
  year: '2026',
  tagline: 'Kalkulator naukowy z wykresami funkcji, przelicznikami jednostek i kilkunastoma narzędziami matematycznymi i codziennymi.',
  summary: 'Jedna aplikacja zamiast kalkulatora, arkusza i wyszukiwarki: liczy wyrażenia, rysuje wykresy, przelicza jednostki, rozwiązuje równania i podpowiada ratę kredytu. Bez reklam, śledzenia i konta – wszystko liczy się w telefonie.',
  body: 'Kalkulator działa jak linia tekstu, nie jak taśma: kursor stawia się w dowolnym miejscu wyrażenia, a wynik liczy się na żywo podczas pisania. Rozumie notację, którą ludzie naprawdę zapisują – mnożenie domyślne (2π, 3(x+1)), potęgi i pierwiastki, silnię, kombinatorykę, moduł, procenty jak w kalkulatorach biurowych (200+10%), stopnie-minuty-sekundy i zapis naukowy. Brakujące nawiasy zamykające dopisuje sam. Ten sam wynik pokazuje w wielu zapisach: jako ułamek, liczbę mieszaną, w notacji naukowej i inżynierskiej oraz szesnastkowo, dwójkowo i ósemkowo. Do tego historia z przypinaniem, pamięć M, zmienne A–F, Ans i wyszukiwarka funkcji.\n\nWykresy przyjmują do ośmiu funkcji naraz. Widok przesuwa się i powiększa palcami, dotknięcie odczytuje wartość w punkcie, a aplikacja sama znajduje miejsca zerowe, ekstrema i przecięcia wykresów oraz rysuje pochodną. Analiza funkcji jest też osobnym narzędziem: rozwiązania f(x)=0, pochodna w punkcie i całka oznaczona.\n\nNarzędzia obejmują równania i układy równań, statystykę z regresją, działania na macierzach, systemy liczbowe z operacjami bitowymi, ułamki, teorię liczb i liczby rzymskie, a z codziennych – procenty, VAT, ratę kredytu z harmonogramem, lokatę z podatkiem Belki, różnice dat, koszt podróży, napiwek, BMI i kwotę słownie. Przeliczniki jednostek pokrywają siedemnaście kategorii i pokazują wszystkie jednostki naraz.\n\nCałość to Kotlin i Compose z czarno-białym interfejsem w stylu OpenPDF. Nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji, a aplikacja sama pobiera i instaluje kolejne wersje.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Kotlin', 'Jetpack Compose', 'Material 3', 'Canvas'],
  features: [
    'własny parser wyrażeń z mnożeniem domyślnym i procentami biurowymi',
    'wykresy do 8 funkcji: zera, ekstrema, przecięcia, pochodna',
    '17 kategorii przeliczników jednostek',
    '16 narzędzi matematycznych i codziennych',
    'wymaga Androida 10 lub nowszego',
  ],
  cover: '/assets/portfolio/opencalc-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenCalc',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 2,
}

function isOpenCalc(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.name === 'OpenCalc'
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenCalc)
const rest = current.filter(item => !isOpenCalc(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenCalc wchodzi tuż za OpenPDF – obie aplikacje obok siebie.
const openpdf = rest.findIndex(item => item.slug === 'openpdf')
const at = openpdf === -1 ? 0 : openpdf + 1
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenCalc w portfolio na pozycji ${at + 1} z ${next.length}.`)
