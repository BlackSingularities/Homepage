/**
 * Dodaje OpenRAW (cyfrowa ciemnia do wywoływania zdjęć RAW) do portfolio, zaraz za GRANIĄ.
 *
 * Program na Windows: instalator z najnowszego wydania na GitHubie (`releaseSource: 'github'`).
 * Link do repozytorium jest ukryty – program publikowany jest przez redzikowski.com. Wpis z `repo`
 * uruchamia też proxy aktualizacji `/api/github/repos/BlackSingularities/OpenRAW/releases/latest`,
 * z którego program pobiera kolejne wersje (instalator sprawdzany sumą SHA-512 z `latest.yml`).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || '/app/data'
const projectsFile = path.join(dataDir, 'projects.json')
const markerFile = path.join(dataDir, '.migration-openraw-v43')

const project = {
  id: 'prj-openraw',
  slug: 'openraw',
  name: 'OpenRAW',
  kind: 'app',
  label: 'Wywoływanie zdjęć RAW / Windows',
  year: '2026',
  tagline: 'Cyfrowa ciemnia zamiast ściany suwaków: pracujesz na samym zdjęciu, a narzędzia pochodzą z prawdziwej ciemni – strefy Adamsa, paski próbne i odbitki z gałęziami.',
  summary: 'Natywny program na Windows napisany w Rust. Całe wywołanie to jeden shader GPU, więc podgląd, warianty i eksport liczy ta sama funkcja. Pliki RAW z ponad tysiąca aparatów, także CR3, X-Trans i DNG, a oryginał zostaje nietknięty.',
  body: 'OpenRAW odwraca układ klasycznego wywoływacza. Zamiast przechodzić panel z góry na dół, chwytasz fragment zdjęcia i ciągniesz: pinezka sama wyznacza maskę z podobieństwa do wskazanego miejsca. Tony ustawia drabina jedenastu stref Ansela Adamsa z adaptacją lokalną, dzięki której rozjaśnione cienie nie tracą detalu.\n\nKażdy parametr można zobaczyć jako pasek próbny – siedem wartości na zdjęciu naraz, jak próba naświetlania w ciemni. Dobór wariantów pokazuje dziewięć żywych wersji; wybrana staje się punktem wyjścia, a dwie można skrzyżować. Historia jest drzewem wywołań z gałęziami zapisanym obok zdjęcia w pliku .oraw, więc nic nie ginie, a najazd na węzeł pokazuje jego stan.\n\nPod spodem: demozaikowanie RCD i X-Trans, odzyskiwanie świateł, odszumianie falkowe, praca w liniowym Rec.2020 i Oklab, fizyczny model emulsji z ziarnem i halacją zamiast tablic LUT, podgląd przez profil ICC monitora i eksport kaflami w 32 bitach do JPEG, TIFF, PNG i WebP z profilem i EXIF. Kontaktówka traktuje folder jak bibliotekę, bez importu. Program sam pobiera kolejne wersje z redzikowski.com.',
  role: 'Pomysł, projekt, silnik wywoływania (wgpu, WGSL), demozaikowanie i barwa, interfejs, instalator i wydania',
  stack: ['Rust', 'wgpu', 'egui', 'WGSL', 'rawler', 'NSIS'],
  features: [
    'pinezki na zdjęciu zamiast malowanych masek, drabina stref Adamsa zamiast krzywej',
    'paski próbne, dziewięć żywych wariantów i krzyżowanie wywołań',
    'drzewo wywołań z gałęziami w pliku .oraw obok zdjęcia, RAW pozostaje nietknięty',
    'emulsje z ziarnem i halacją, Oklab, Rec.2020, profil ICC monitora',
    'CR2, CR3, NEF, ARW, RAF, DNG i inne; Windows 10/11, aktualizacje z redzikowski.com',
  ],
  icon: '/assets/portfolio/openraw-icon.png',
  cover: '/assets/portfolio/openraw-cover.webp',
  shots: [],
  siteUrl: '',
  siteHidden: false,
  repo: 'BlackSingularities/OpenRAW',
  repoHidden: true,
  releaseSource: 'github',
  downloads: [],
  published: true,
  featured: false,
  order: 10,
}

function isOpenRaw(item) {
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

const previous = current.find(isOpenRaw)
const rest = current.filter(item => !isOpenRaw(item))

const entry = {
  ...project,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// OpenRAW wchodzi tuż za GRANIĄ (albo na początek, gdy jej nie ma).
const after = rest.findIndex(item => item.slug === 'gran-3d')
const at = after !== -1 ? after + 1 : 0
const next = [...rest.slice(0, at), entry, ...rest.slice(at)].map((item, index) => ({ ...item, order: index }))

const temporary = `${projectsFile}.${process.pid}.tmp`
await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
await fs.rename(temporary, projectsFile)

await fs.writeFile(markerFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`OpenRAW w portfolio na pozycji ${at + 1} z ${next.length}.`)
