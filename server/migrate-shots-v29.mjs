/**
 * Prawdziwe zrzuty ekranu dla OpenCalc, OpenTimer i OpenLyrics zamiast rysowanych
 * okładek SVG, a przy okazji rok znika ze wszystkich wpisów portfolio.
 *
 * Zrzuty powstały z wydań APK uruchomionych na Androidzie 16, po polsku, w rozdzielczości
 * telefonu (1080×2400), więc pokazują dokładnie to, co widzi użytkownik.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-shots-v29')

const shots = {
  opencalc: {
    cover: '/assets/portfolio/opencalc-01-kalkulator.webp',
    shots: [
      { src: '/assets/portfolio/opencalc-01-kalkulator.webp', alt: 'Klawiatura kalkulatora z funkcjami naukowymi i pamięcią M' },
      { src: '/assets/portfolio/opencalc-02-wykresy.webp', alt: 'Wykresy dwóch funkcji naraz z legendą i pochodną' },
      { src: '/assets/portfolio/opencalc-03-przeliczniki.webp', alt: 'Przelicznik długości pokazujący wszystkie jednostki naraz' },
      { src: '/assets/portfolio/opencalc-04-narzedzia.webp', alt: 'Lista narzędzi: równania, statystyka, macierze, kredyt, daty' },
    ],
  },
  opentimer: {
    cover: '/assets/portfolio/opentimer-01-zegar.webp',
    shots: [
      { src: '/assets/portfolio/opentimer-01-zegar.webp', alt: 'Zegar z datą i zegarami świata z różnicą czasu' },
      { src: '/assets/portfolio/opentimer-02-stoper.webp', alt: 'Stoper z okrążeniami i treningiem interwałowym' },
      { src: '/assets/portfolio/opentimer-03-minutnik.webp', alt: 'Minutnik z klawiaturą i zapisanymi szybkimi czasami' },
      { src: '/assets/portfolio/opentimer-04-kalkulator-czasu.webp', alt: 'Kalkulator czasu: dodawanie i odejmowanie godzin z wynikiem' },
    ],
  },
  openlyrics: {
    cover: '/assets/portfolio/openlyrics-01-wyglad.webp',
    shots: [
      { src: '/assets/portfolio/openlyrics-01-wyglad.webp', alt: 'Ustawienia nakładki z podglądem tekstu i gotowymi stylami' },
      { src: '/assets/portfolio/openlyrics-02-czcionka.webp', alt: 'Ustawienia czcionki: krój, rozmiary, grubość i odstępy' },
      { src: '/assets/portfolio/openlyrics-03-teraz.webp', alt: 'Ekran „Teraz” z podglądem nakładki i przesunięciem czasu' },
    ],
  },
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []

let touched = 0
const next = current.map(item => {
  const { year, ...rest } = item
  const update = shots[item?.slug]
  if (!update) return rest
  touched += 1
  return { ...rest, ...update, updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Zrzuty ekranu w ${touched} wpisach, rok usunięty z ${next.length}.`)
