/**
 * Dodaje OpenDTP do portfolio, zaraz za OpenMP.
 *
 * Aplikacja na Windows: instalator i wersja przenośna z najnowszego wydania na GitHubie
 * (`releaseSource: 'github'`). Link do repozytorium jest ukryty – aplikacja publikowana jest
 * przez redzikowski.com. Wpis z `repo` uruchamia też proxy aktualizacji
 * `/api/github/repos/BlackSingularities/OpenDTP/releases/latest`, z którego program
 * pobiera kolejne wersje.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-opendtp-v34')

const project = {
  id: 'prj-opendtp',
  slug: 'opendtp',
  name: 'OpenDTP',
  kind: 'app',
  label: 'Edytor tekstu i skład dokumentów / Windows',
  year: '2026',
  tagline: 'Edytor tekstu i program do składu dla Windows – tekst w dowolnych kształtach z węzłów, opływanie, kolumny, wykresy, generowanie dokumentów przez AI i eksport do Worda i PDF.',
  summary: 'Wstążka jak w dużych edytorach, motyw AMOLED, grafitowy albo jasny i własny silnik składu. Kształty tekstu rysowane węzłami i krzywymi: tekst wypełnia wnętrze, a treść strony opływa kształt. Dokument opisany słowami składa sztuczna inteligencja – z wybranym modelem i pełnym formatowaniem.',
  body: 'Najważniejsza jest swoboda układu. Kształt tekstu rysuje się piórem – klikając węzły i przeciągając krzywe – albo wybiera z gotowych wzorów; tekst wypełnia jego wnętrze wiersz po wierszu, a treść strony opływa go po konturze z ustawionym odstępem. Ramki łączą się w łańcuchy, kolumny mają linie pomiędzy, a inicjały, siatka bazowa i polskie sierotki dbają o typografię.\n\nObrazy opływa się konturem wykrytym z przezroczystości, wykresy mają edytowalne dane, a napisy mogą biec po łuku. Style, motywy dokumentu, listy, nagłówki i stopki z numerami stron, sprawdzanie pisowni po polsku i angielsku oraz paleta poleceń dopełniają edytor.\n\nGenerowanie przez AI działa z OpenRouterem i innymi dostawcami (OpenAI, Anthropic, Gemini, Mistral, Groq, DeepSeek, xAI, Ollama): wybiera się model z listy i temperaturę, a opis dokumentu zamienia się w gotowy, sformatowany dokument. Eksport do DOCX zachowuje style, obrazy i kształty w tych samych miejscach, PDF wygląda dokładnie jak na ekranie. Program sam pobiera kolejne wersje z redzikowski.com; nowe wydanie powstaje wyłącznie po wypchnięciu tagu wersji.',
  role: 'Projekt, silnik składu, interfejs, implementacja i wydania',
  stack: ['Rust', 'Slint', 'rustybuzz', 'tiny-skia', 'krilla'],
  features: [
    'kształty tekstu z węzłami i krzywymi, opływanie po konturze',
    'kolumny, łańcuchy ramek, inicjały, siatka bazowa, polskie sierotki',
    'generowanie dokumentów przez AI – OpenRouter i inni dostawcy',
    'eksport DOCX i PDF 1:1, import DOCX, pisownia PL i EN',
    'wstążka, paleta poleceń, motywy AMOLED, grafit i jasny; Windows 10 i 11',
  ],
  icon: '/assets/portfolio/opendtp-icon.png',
  cover: '/assets/portfolio/opendtp-cover.svg',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenDTP',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: true,
  order: 7,
}

function isOpenDTP(item) {
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

const previous = current.find(isOpenDTP)
const rest = current.filter(item => !isOpenDTP(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenDTP wchodzi tuż za OpenMP – aplikacje na Windows stoją obok siebie.
const after = rest.findIndex(item => item.slug === 'openmp')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenDTP w portfolio na pozycji ${at + 1} z ${next.length}.`)
