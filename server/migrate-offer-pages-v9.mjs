/**
 * Jednorazowo dokłada drugą podstronę oferty — "Strony, aplikacje i autorskie
 * CMS-y" z galerią przykładowych realizacji — obok istniejącej podstrony o
 * infrastrukturze domowej, i porządkuje kolejność obu w siatce "Szczegóły
 * w konkretnych obszarach". Nie rusza podstron utworzonych ręcznie w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const dataDir = process.env.DATA_DIR || '/app/data'
const pagesFile = path.join(dataDir, 'pages.json')
const markerFile = path.join(dataDir, '.migration-offer-pages-v9')
const pagesBackup = path.join(dataDir, 'pages.before-offer-pages-v9.json')

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

async function writeJson(file, data) {
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporary, file)
}

if (await exists(markerFile)) process.exit(0)

const pages = (await exists(pagesFile)) ? JSON.parse(await fs.readFile(pagesFile, 'utf8')) : []
const softwareSlug = 'strony-aplikacje-cms'
const infraSlug = 'infrastruktura-domowa'

let next = pages

if (!pages.some(page => page.slug === softwareSlug)) {
  const now = new Date().toISOString()
  const block = (type, fields) => ({ id: crypto.randomUUID(), type, ...fields })

  const page = {
    id: crypto.randomUUID(),
    slug: softwareSlug,
    title: 'Strony, aplikacje i autorskie CMS-y',
    kicker: 'Główny kierunek',
    excerpt: 'Serwisy, aplikacje webowe i autorskie CMS-y zbudowane od zera — z panelem, danymi i integracjami dopasowanymi do konkretnego sposobu pracy.',
    lead: 'To jest trzon tego, czym się zajmuję: strony, aplikacje i systemy, które projektuję i buduję od pierwszego szkicu po wdrożenie. Poniżej kilka zrealizowanych przykładów oraz to, co wchodzi w zakres takiej współpracy.',
    cover: '/assets/portfolio/travel-1.png',
    seoDescription: 'Strony internetowe, aplikacje webowe i autorskie systemy CMS na zamówienie — przykłady zrealizowanych projektów i pełny zakres współpracy.',
    accent: 'gold',
    published: true,
    featured: true,
    order: 0,
    blocks: [
      block('text', {
        heading: 'Nie szablon, tylko Twój produkt',
        body: 'Każdy projekt dostaje własną architekturę informacji, projekt interfejsu i zaplecze — dopasowane do tego, jak faktycznie pracujesz, a nie do tego, co oferuje gotowy motyw czy platforma.\nPoniżej kilka zrealizowanych produktów: od serwisów sprzedażowych, przez rozbudowane CMS-y, po portale danych i prywatne systemy.',
        layout: 'default',
      }),
      block('gallery', {
        heading: 'Przykładowe realizacje',
        images: [
          { src: '/assets/portfolio/travel-1.png', alt: 'Project Travel — serwis i system operacyjny biura podróży' },
          { src: '/assets/portfolio/strefa-1.png', alt: 'Strefa Milczenia — autorski CMS wydawniczy' },
          { src: '/assets/portfolio/kompendium-1.png', alt: 'Kompendium Podróży — portal wiedzy o świecie' },
          { src: '/assets/portfolio/navigator-1.png', alt: 'Nawigator — analiza tras GPX' },
          { src: '/assets/portfolio/podrozownik-1.png', alt: 'Podróżownik — prywatny system podróżniczy' },
          { src: '/assets/portfolio/playmaster-1.png', alt: 'PlayMaster — nauka gry z wejściem MIDI' },
          { src: '/assets/portfolio/arcadia-1.png', alt: 'Arcadia — galeria gier przeglądarkowych' },
          { src: '/assets/portfolio/blinkbeam-1.png', alt: 'Blinkbeam — transfer plików światłem' },
        ],
      }),
      block('features', {
        heading: 'Co wchodzi w zakres',
        items: [
          { title: 'Architektura i projekt', text: 'Struktura informacji, przepływy, grafika i interfejs dopasowane do celu i marki — od pierwszego szkicu.' },
          { title: 'Panel i dane', text: 'Autorski CMS albo panel klienta z dokładnie takim zakresem ról, treści i danych, jakiego potrzebuje projekt.' },
          { title: 'Integracje', text: 'Płatności, poczta, analityka, zewnętrzne API i inne systemy używane już w firmie.' },
          { title: 'Wdrożenie i opieka', text: 'Uruchomienie, konfiguracja, monitoring oraz dalszy rozwój po starcie produktu.' },
        ],
      }),
      block('quote', {
        body: 'Zakres wynika z celu, a nie z gotowego pakietu.',
        author: 'Zasada, którą się kieruję',
      }),
      block('cta', {
        heading: 'Masz pomysł na stronę, aplikację albo CMS?',
        body: 'Opisz cel i sposób pracy — zaproponuję konkretną architekturę i zakres.',
        label: 'Napisz do mnie',
        href: '/#kontakt',
      }),
    ],
    createdAt: now,
    updatedAt: now,
  }

  next = [...pages, page]
}

next = next.map(page => {
  if (page.slug === softwareSlug) return { ...page, order: 0 }
  if (page.slug === infraSlug) return { ...page, order: 1 }
  return page
})

if (!await exists(pagesBackup) && await exists(pagesFile)) await fs.copyFile(pagesFile, pagesBackup)
await writeJson(pagesFile, next)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
