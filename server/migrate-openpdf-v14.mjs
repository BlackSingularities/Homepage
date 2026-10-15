/**
 * Dodaje OpenPDF do portfolio, zaraz za Arcadią.
 *
 * To aplikacja, więc pliki do pobrania bierze wprost z najnowszego wydania na
 * GitHubie (`releaseSource: 'github'`) — lista nie wymaga ręcznej aktualizacji
 * przy każdym nowym wydaniu. Repozytorium jest publiczne, więc linki prowadzą
 * prosto do GitHuba i nie potrzebują tokenu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openpdf-v14')

const SHOTS = [
  ['openpdf-01-ksiazka', 'Tryb książki: dwie strony obok siebie z cieniem grzbietu'],
  ['openpdf-02-ustawienia', 'Panel ustawień: układ rozkładówki, papier i przycinanie marginesów'],
  ['openpdf-03-czytanie', 'Ciągłe przewijanie w pionie z numerem strony'],
]

const project = {
  id: 'prj-openpdf',
  slug: 'openpdf',
  name: 'OpenPDF',
  kind: 'app',
  label: 'Edytor PDF / Android',
  year: '2026',
  tagline: 'Pełnoprawny edytor PDF na Androida: tryb książki z rozkładówkami, adnotacje w standardzie PDF, formularze i praca na stronach.',
  summary: 'Czytnik, który traktuje PDF jak książkę, i edytor, którego zmiany otworzy potem Acrobat. Bez konta, bez abonamentu i bez wysyłania pliku na cudzy serwer.',
  body: 'Tryb książki składa dwie strony obok siebie — automatycznie w poziomie i na rozłożonym ekranie folda, bo aplikacja wykrywa zawias. Okładkę można ustawić osobno, tak jak w druku, a rozkładówkę powiększać i przesuwać jak jedną ilustrację; przy zbliżeniu widoczny fragment renderuje się od nowa, więc tekst zostaje ostry. Do tego przewijanie ciągłe albo przewracanie stron, kierunek od prawej do lewej dla mangi i języków RTL oraz papier zwykły, nocny i sepia.\n\nEdycja to pióro, zakreślacz, tekst, notatki, kształty i podpisy odręczne zapisywane do ponownego użycia. Wszystko zapisuje się jako standardowe adnotacje PDF z wyglądem, więc plik otwarty potem w Acrobacie albo w przeglądarce wygląda tak samo i nadal da się go edytować — to nie są wypalone w stronę piksele.\n\nNa poziomie dokumentu: obracanie, usuwanie, powielanie i zmiana kolejności stron, wstawianie innych PDF-ów i obrazów, scalanie plików, formularze razem ze spłaszczaniem, hasło AES-256, eksport stron do PNG i JPG, wyszukiwanie niewrażliwe na polskie znaki. Cofanie i ponawianie obejmuje także operacje na stronach.\n\nCałość stoi na Kotlin Multiplatform i Compose Multiplatform: Android korzysta z PdfBox i systemowego PdfRenderer, a ten sam kod interfejsu obsługuje iOS przez PDFKit. Każdy merge do głównej gałęzi buduje i publikuje nowe wydanie, a aplikacja sama proponuje aktualizację.',
  role: 'Projekt, architektura, implementacja i wydania',
  stack: ['Kotlin', 'Compose Multiplatform', 'Material 3', 'PdfBox', 'PDFKit'],
  features: [
    'tryb książki z wykrywaniem zawiasu folda',
    'adnotacje w standardzie PDF, czytelne w Acrobacie',
    'formularze, podpisy i spłaszczanie',
    'operacje na stronach z cofaniem i ponawianiem',
    'wymaga Androida 10 lub nowszego',
  ],
  cover: '/assets/portfolio/openpdf-cover.webp',
  shots: SHOTS.map(([name, alt]) => ({ src: `/assets/portfolio/${name}.webp`, alt })),
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenPDF',
  repoHidden: false,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 1,
}

/** Stare wpisy mogły mieć inny adres — dopasowujemy po jednym z trzech pól. */
function isOpenPdf(item) {
  return item?.id === project.id || item?.slug === project.slug || item?.slug === 'open-pdf' || item?.name === 'OpenPDF'
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)

const stored = await exists(projectsFile)
  ? JSON.parse(await fs.readFile(projectsFile, 'utf8'))
  : []
const current = Array.isArray(stored) ? stored : []

const previous = current.find(isOpenPdf)
const rest = current.filter(item => !isOpenPdf(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Arcadia zostaje pierwsza, OpenPDF wchodzi tuż za nią
const arcadia = rest.findIndex(item => item.slug === 'arcadia')
const at = arcadia === -1 ? 0 : arcadia + 1
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenPDF w portfolio na pozycji ${at + 1} z ${next.length}.`)
