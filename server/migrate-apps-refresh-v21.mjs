/**
 * Odświeża opisy aplikacji, które rozjechały się z tym, co dziś robią:
 *
 * - OpenPDF zmienił nazwę na OpenDocument i otwiera już nie tylko PDF, ale też
 *   DjVu, EPUB, FB2, DOCX, ODT, RTF, Markdown i HTML. Adres `/portfolio/openpdf`
 *   i repozytorium zostają, żeby nie psuć linków ani aktualizacji w aplikacji.
 * - OpenTakeoff nie planuje już tras ani nie importuje z SimBrief – plan lotu
 *   czyta prosto z symulatora; w wydaniu jest też OpenTakeoff Link na Windows.
 *
 * Zmienia tylko wymienione pola, resztę wpisu (zrzuty, kolejność, publikację)
 * zostawia tak, jak jest w panelu.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-apps-refresh-v21')

const UPDATES = {
  openpdf: {
    name: 'OpenDocument',
    label: 'Czytnik dokumentów i edytor PDF / Android, iOS',
    tagline: 'Czytnik, który otwiera PDF, DjVu, EPUB, DOCX i kilka innych formatów jak książkę, i edytor PDF, którego zmiany otworzy potem Acrobat.',
    summary: 'Darmowy czytnik dokumentów i pełnoprawny edytor PDF na Androida i iOS: prawdziwy tryb książki, dziesięć formatów od DjVu po Markdown, adnotacje zgodne ze standardem PDF i pełna praca na stronach – lokalnie, bez konta i bez reklam.',
    body: 'Oprócz PDF-ów aplikacja otwiera DjVu (własnym dekoderem, razem z plikami wielostronicowymi), książki EPUB i FB2 z rozdziałami i spisem treści, dokumenty DOCX, ODT i RTF z tabelami i obrazami, a także Markdown, HTML, TXT, CSV i zdjęcia. Każdy z nich składa w strony PDF, więc działa na nim ten sam tryb książki, wyszukiwanie i adnotacje, a oryginał zostaje nietknięty.\n\nTryb książki składa dwie strony obok siebie – automatycznie w poziomie i na rozłożonym ekranie folda, bo aplikacja wykrywa zawias. Okładkę można ustawić osobno, tak jak w druku, a rozkładówkę powiększać i przesuwać jak jedną ilustrację; przy zbliżeniu widoczny fragment renderuje się od nowa, więc tekst zostaje ostry. Do tego przewijanie ciągłe albo przewracanie stron, kierunek od prawej do lewej dla mangi i języków RTL oraz papier zwykły, nocny i sepia.\n\nEdycja to pióro, zakreślacz, tekst, notatki, kształty, zakreślanie tekstu i podpisy odręczne zapisywane do ponownego użycia. Wszystko zapisuje się jako standardowe adnotacje PDF z wyglądem, więc plik otwarty potem w Acrobacie albo w przeglądarce wygląda tak samo i nadal da się go edytować – to nie są wypalone w stronę piksele.\n\nNa poziomie dokumentu: obracanie, usuwanie, powielanie i zmiana kolejności stron, wstawianie innych PDF-ów i obrazów, scalanie plików, formularze razem ze spłaszczaniem, hasło AES-256, eksport stron do PNG i JPG, wyszukiwanie niewrażliwe na polskie znaki. Cofanie i ponawianie obejmuje także operacje na stronach.\n\nCałość stoi na Kotlin Multiplatform i Compose Multiplatform: Android korzysta z PdfBox i systemowego PdfRenderer, a ten sam kod interfejsu obsługuje iOS przez PDFKit. Każde wydanie buduje się automatycznie, a aplikacja sama proponuje aktualizację.',
    features: [
      'PDF, DjVu, EPUB, FB2, DOCX, ODT, RTF, Markdown i HTML',
      'tryb książki z wykrywaniem zawiasu folda',
      'adnotacje w standardzie PDF, czytelne w Acrobacie',
      'formularze, podpisy i operacje na stronach z cofaniem',
      'Android 10 lub nowszy, iOS 16.4 lub nowszy',
    ],
    en: {
      label: 'Document reader & PDF editor / Android, iOS',
      tagline: 'A reader that opens PDF, DjVu, EPUB, DOCX and several other formats like a book, and a PDF editor whose changes Acrobat can open later.',
      summary: 'A free document reader and full PDF editor for Android and iOS: a true book mode, ten formats from DjVu to Markdown, annotations that follow the PDF standard and full page management – all on your device, with no account and no ads.',
      body: 'Besides PDFs, the app opens DjVu (with its own decoder, including multi-page files), EPUB and FB2 books with chapters and a table of contents, DOCX, ODT and RTF documents with tables and images, as well as Markdown, HTML, TXT, CSV and pictures. Each of them is laid out as PDF pages, so the same book mode, search and annotations work on it, while the original stays untouched.\n\nBook mode places two pages side by side – automatically in landscape and on an unfolded foldable screen, because the app detects the hinge. The cover can be shown on its own, just like in print, and a spread can be zoomed and panned like a single illustration; when you zoom in, the visible area is re-rendered, so text stays sharp. On top of that: continuous scrolling or page turning, right-to-left reading for manga and RTL languages, and plain, night and sepia paper.\n\nEditing covers pen, highlighter, text, notes, shapes, text markup and handwritten signatures saved for reuse. Everything is stored as standard PDF annotations with appearance streams, so a file opened later in Acrobat or a web browser looks exactly the same and can still be edited – these are not pixels burned into the page.\n\nAt the document level: rotating, deleting, duplicating and reordering pages, inserting other PDFs and images, merging files, forms including flattening, AES-256 password protection, exporting pages to PNG and JPG, and search that ignores diacritics. Undo and redo also cover page operations.\n\nThe whole thing is built on Kotlin Multiplatform and Compose Multiplatform: Android uses PdfBox and the system PdfRenderer, while the same UI code supports iOS through PDFKit. Every release is built automatically, and the app offers the update on its own.',
      features: [
        'PDF, DjVu, EPUB, FB2, DOCX, ODT, RTF, Markdown and HTML',
        'book mode with foldable hinge detection',
        'standard PDF annotations, readable in Acrobat',
        'forms, signatures and page operations with undo',
        'Android 10 or newer, iOS 16.4 or newer',
      ],
    },
  },
  opentakeoff: {
    label: 'Wirtualny pilot / Android, Windows',
    tagline: 'Aplikacja na Androida dla wirtualnych pilotów (MSFS, X-Plane, VATSIM, IVAO). Pogoda, dane lotnisk i kokpit na telefonie.',
    summary: 'Darmowa aplikacja na Androida dla wirtualnych pilotów MSFS i X-Plane: aktualna pogoda lotniskowa, dane lotnisk, mapa 3D ze śladem lotu i mobilny kokpit, który przez sieć lokalną steruje samolotem w Microsoft Flight Simulator 2024.',
    replace: [
      ['Plan można przygotować ręcznie, wyznaczyć na mapie lub pobrać z SimBrief, a po połączeniu z MSFS także uzupełnić o procedury SID, STAR i podejścia, punkty na mapie i więcej.',
        'Plan lotu aplikacja czyta prosto z symulatora: następny punkt, odległość, czasy i bieżący odcinek z GPS MSFS, a na mapie pokazuje lotniska, VOR-y, NDB i punkty z bazy MSFS wokół samolotu.'],
      ['OpenTakeoff korzysta z darmowych, otwartych źródeł danych, nie zawiera reklam i do podstawowych funkcji nie wymaga kont ani kluczy API; opcjonalny import z SimBrief wymaga wskazania konta w tej usłudze.',
        'OpenTakeoff korzysta z darmowych, otwartych źródeł danych, nie zawiera reklam i nie wymaga kont ani kluczy API.'],
    ],
    features: [
      'pogoda lotniskowa: METAR, TAF, SIGMET, PIREP i ATIS czytany na głos',
      'dane lotnisk: pasy, częstotliwości, ILS i radiolatarnie',
      'mapa 3D z trasą z symulatora i śladem lotu z wysokością',
      'mobilny kokpit dla MSFS 2024: PFD, ND, autopilot, radio i silniki',
      'dziennik lotów z oceną lądowania i odtwarzaniem na mapie',
      'OpenTakeoff Link na Windows do połączenia z symulatorem',
    ],
    en: {
      label: 'Virtual pilot / Android, Windows',
      tagline: 'An Android app for virtual pilots (MSFS, X-Plane, VATSIM, IVAO). Weather, airport data and a cockpit on your phone.',
      summary: 'A free Android app for MSFS and X-Plane virtual pilots: live airport weather, airport data, a 3D map with your flight track and a mobile cockpit that controls your aircraft in Microsoft Flight Simulator 2024 over your local network.',
      replace: [
        ['A flight plan can be created by hand, drawn on the map or imported from SimBrief, and once connected to MSFS it can be extended with SID, STAR and approach procedures, map waypoints and more.',
          'The flight plan comes straight from the simulator: the next waypoint, distance, times and the current leg from the MSFS GPS, while the map shows airports, VORs, NDBs and waypoints from the MSFS database around the aircraft.'],
        ['OpenTakeoff uses free, open data sources, contains no ads and needs no accounts or API keys for its core features; the optional SimBrief import requires your SimBrief username.',
          'OpenTakeoff uses free, open data sources, contains no ads and needs no accounts or API keys.'],
      ],
      features: [
        'airport weather: METAR, TAF, SIGMET, PIREP and ATIS read aloud',
        'airport data: runways, frequencies, ILS and navaids',
        '3D map with the route from the simulator and an altitude-coloured flight track',
        'mobile cockpit for MSFS 2024: PFD, ND, autopilot, radios and engines',
        'flight log with landing rating and replay on the map',
        'OpenTakeoff Link for Windows to connect to the simulator',
      ],
    },
  },
}

/** Nakłada pola na wpis; `replace` podmienia zdania w opisie, gdy jeszcze tam są. */
function apply(target, update) {
  const { replace = [], en, ...fields } = update
  const next = { ...target, ...fields }
  for (const [from, to] of replace) next.body = String(next.body || '').replace(from, to)
  if (en) next.en = apply(target.en || {}, en)
  return next
}

async function exists(file) {
  return fs.access(file).then(() => true).catch(() => false)
}

if (await exists(markerFile)) process.exit(0)
if (!(await exists(projectsFile))) process.exit(0)

const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'))
const current = Array.isArray(stored) ? stored : []
const touched = []
const next = current.map(item => {
  const update = UPDATES[item?.slug]
  if (!update) return item
  touched.push(item.slug)
  return { ...apply(item, update), updatedAt: new Date().toISOString() }
})

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`Odświeżone opisy: ${touched.join(', ') || 'brak'}.`)
